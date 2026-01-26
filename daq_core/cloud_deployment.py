"""
云端部署支持模块
支持 Docker 容器化、Kubernetes 部署和云平台集成
"""

import os
import json
import logging
import subprocess
import shutil
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class DeploymentTarget(Enum):
    """部署目标"""
    LOCAL = "local"           # 本地运行
    DOCKER = "docker"         # Docker 容器
    KUBERNETES = "kubernetes" # Kubernetes 集群
    AWS = "aws"              # AWS (ECS/Lambda)
    AZURE = "azure"          # Azure Container
    GCP = "gcp"              # Google Cloud Run


@dataclass
class DeploymentConfig:
    """部署配置"""
    target: DeploymentTarget
    image_name: str = "daq-app"
    image_tag: str = "latest"
    port: int = 5000
    replicas: int = 1
    cpu_limit: str = "1"
    memory_limit: str = "512Mi"
    env_vars: Dict[str, str] = None


class DockerDeployment:
    """
    Docker 部署管理
    
    功能：
    - 生成 Dockerfile
    - 构建 Docker 镜像
    - 运行容器
    - 推送到仓库
    """
    
    def __init__(self, project_path: str):
        self.project_path = project_path
    
    def generate_dockerfile(self, config: DeploymentConfig = None) -> str:
        """
        生成 Dockerfile
        """
        dockerfile = '''# DAQ 应用 Docker 镜像
# 由 DAQ IDE 自动生成

FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \\
    gcc \\
    libffi-dev \\
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE {port}

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV DAQ_MODE=production

# 启动命令
CMD ["python", "-m", "daq_core.api_server"]
'''.format(port=config.port if config else 5000)

        return dockerfile
    
    def generate_requirements(self) -> str:
        """生成 requirements.txt"""
        requirements = '''# DAQ 核心依赖
flask>=2.0.0
flask-cors>=3.0.0
paho-mqtt>=1.6.0
pyserial>=3.5

# 协议支持
pymodbus>=3.0.0
pyvisa>=1.13.0
pyvisa-py>=0.6.0

# 数据处理
numpy>=1.21.0
scipy>=1.7.0

# 可选依赖
# pyusb>=1.2.0      # USB 支持
# hidapi>=0.12.0    # HID 支持
# PyBluez>=0.23     # 蓝牙支持 (Linux)
# bleak>=0.18.0     # BLE 支持

# AI 功能 (可选)
# openai>=0.27.0
# anthropic>=0.5.0

# 报告生成 (可选)
# reportlab>=3.6.0
'''
        return requirements
    
    def generate_docker_compose(self, config: DeploymentConfig = None) -> str:
        """生成 docker-compose.yml"""
        compose = '''version: '3.8'

services:
  daq-app:
    build: .
    image: {image_name}:{image_tag}
    ports:
      - "{port}:{port}"
    environment:
      - DAQ_MODE=production
      - MQTT_HOST=mqtt
    depends_on:
      - mqtt
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '{cpu_limit}'
          memory: {memory_limit}

  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - mqtt-data:/mosquitto/data
      - mqtt-log:/mosquitto/log
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  mqtt-data:
  mqtt-log:
  redis-data:

networks:
  default:
    name: daq-network
'''.format(
            image_name=config.image_name if config else "daq-app",
            image_tag=config.image_tag if config else "latest",
            port=config.port if config else 5000,
            cpu_limit=config.cpu_limit if config else "1",
            memory_limit=config.memory_limit if config else "512Mi",
        )
        return compose
    
    def build_image(self, config: DeploymentConfig = None) -> bool:
        """构建 Docker 镜像"""
        try:
            image_name = config.image_name if config else "daq-app"
            image_tag = config.image_tag if config else "latest"
            
            cmd = [
                "docker", "build",
                "-t", f"{image_name}:{image_tag}",
                self.project_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Docker 镜像构建成功: {image_name}:{image_tag}")
                return True
            else:
                logger.error(f"Docker 镜像构建失败: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Docker 构建错误: {e}")
            return False
    
    def run_container(self, config: DeploymentConfig = None) -> bool:
        """运行 Docker 容器"""
        try:
            image_name = config.image_name if config else "daq-app"
            image_tag = config.image_tag if config else "latest"
            port = config.port if config else 5000
            
            cmd = [
                "docker", "run", "-d",
                "-p", f"{port}:{port}",
                "--name", f"{image_name}-instance",
                f"{image_name}:{image_tag}"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Docker 容器启动成功: {result.stdout.strip()[:12]}")
                return True
            else:
                logger.error(f"Docker 容器启动失败: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Docker 运行错误: {e}")
            return False


class KubernetesDeployment:
    """
    Kubernetes 部署管理
    """
    
    def __init__(self, project_path: str):
        self.project_path = project_path
    
    def generate_deployment_yaml(self, config: DeploymentConfig = None) -> str:
        """生成 Kubernetes Deployment YAML"""
        deployment = '''apiVersion: apps/v1
kind: Deployment
metadata:
  name: daq-app
  labels:
    app: daq-app
spec:
  replicas: {replicas}
  selector:
    matchLabels:
      app: daq-app
  template:
    metadata:
      labels:
        app: daq-app
    spec:
      containers:
      - name: daq-app
        image: {image_name}:{image_tag}
        ports:
        - containerPort: {port}
        resources:
          limits:
            cpu: "{cpu_limit}"
            memory: "{memory_limit}"
          requests:
            cpu: "100m"
            memory: "128Mi"
        env:
        - name: DAQ_MODE
          value: "production"
        - name: MQTT_HOST
          value: "mqtt-service"
        livenessProbe:
          httpGet:
            path: /api/health
            port: {port}
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: {port}
          initialDelaySeconds: 5
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: daq-service
spec:
  selector:
    app: daq-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: {port}
  type: LoadBalancer
'''.format(
            replicas=config.replicas if config else 1,
            image_name=config.image_name if config else "daq-app",
            image_tag=config.image_tag if config else "latest",
            port=config.port if config else 5000,
            cpu_limit=config.cpu_limit if config else "1",
            memory_limit=config.memory_limit if config else "512Mi",
        )
        return deployment
    
    def deploy(self, yaml_path: str) -> bool:
        """部署到 Kubernetes"""
        try:
            cmd = ["kubectl", "apply", "-f", yaml_path]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Kubernetes 部署成功")
                return True
            else:
                logger.error(f"Kubernetes 部署失败: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Kubernetes 部署错误: {e}")
            return False


class DeploymentManager:
    """
    部署管理器
    
    统一管理各种部署方式
    """
    
    def __init__(self, project_path: str):
        self.project_path = project_path
        self._docker = DockerDeployment(project_path)
        self._k8s = KubernetesDeployment(project_path)
    
    def prepare_deployment(self, config: DeploymentConfig) -> Dict[str, str]:
        """
        准备部署文件
        
        Returns:
            生成的文件 {filename: path}
        """
        files = {}
        output_dir = os.path.join(self.project_path, "deploy")
        os.makedirs(output_dir, exist_ok=True)
        
        if config.target == DeploymentTarget.DOCKER:
            # Dockerfile
            dockerfile = self._docker.generate_dockerfile(config)
            path = os.path.join(output_dir, "Dockerfile")
            with open(path, 'w') as f:
                f.write(dockerfile)
            files["Dockerfile"] = path
            
            # docker-compose.yml
            compose = self._docker.generate_docker_compose(config)
            path = os.path.join(output_dir, "docker-compose.yml")
            with open(path, 'w') as f:
                f.write(compose)
            files["docker-compose.yml"] = path
            
            # requirements.txt
            reqs = self._docker.generate_requirements()
            path = os.path.join(output_dir, "requirements.txt")
            with open(path, 'w') as f:
                f.write(reqs)
            files["requirements.txt"] = path
            
        elif config.target == DeploymentTarget.KUBERNETES:
            # Kubernetes YAML
            k8s_yaml = self._k8s.generate_deployment_yaml(config)
            path = os.path.join(output_dir, "kubernetes.yaml")
            with open(path, 'w') as f:
                f.write(k8s_yaml)
            files["kubernetes.yaml"] = path
        
        logger.info(f"部署文件已生成: {output_dir}")
        return files
    
    def deploy(self, config: DeploymentConfig) -> bool:
        """执行部署"""
        if config.target == DeploymentTarget.DOCKER:
            self.prepare_deployment(config)
            return self._docker.build_image(config) and self._docker.run_container(config)
        
        elif config.target == DeploymentTarget.KUBERNETES:
            files = self.prepare_deployment(config)
            return self._k8s.deploy(files.get("kubernetes.yaml", ""))
        
        elif config.target == DeploymentTarget.LOCAL:
            # 本地运行
            logger.info("启动本地运行模式")
            return True
        
        else:
            logger.warning(f"不支持的部署目标: {config.target}")
            return False
    
    def get_deployment_status(self, config: DeploymentConfig) -> Dict:
        """获取部署状态"""
        status = {
            "target": config.target.value,
            "running": False,
            "containers": [],
        }
        
        if config.target == DeploymentTarget.DOCKER:
            try:
                result = subprocess.run(
                    ["docker", "ps", "--format", "json"],
                    capture_output=True, text=True
                )
                if result.returncode == 0 and result.stdout:
                    for line in result.stdout.strip().split('\n'):
                        if line:
                            container = json.loads(line)
                            if config.image_name in container.get("Image", ""):
                                status["containers"].append(container)
                                status["running"] = True
            except:
                pass
        
        return status


# 全局实例
_deployment_manager: Optional[DeploymentManager] = None


def get_deployment_manager(project_path: str = None) -> DeploymentManager:
    """获取部署管理器"""
    global _deployment_manager
    if _deployment_manager is None:
        _deployment_manager = DeploymentManager(project_path or os.getcwd())
    return _deployment_manager

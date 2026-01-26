"""
自动化工具链模块
提供 CI/CD 可视化配置、构建监控和远程调试支持
"""

import os
import json
import logging
import subprocess
import threading
import time
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)


class BuildStatus(Enum):
    """构建状态"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PipelineStage(Enum):
    """流水线阶段"""
    CHECKOUT = "checkout"
    INSTALL = "install"
    BUILD = "build"
    TEST = "test"
    PACKAGE = "package"
    DEPLOY = "deploy"


@dataclass
class BuildStep:
    """构建步骤"""
    id: str
    name: str
    command: str
    stage: PipelineStage
    status: BuildStatus = BuildStatus.PENDING
    output: str = ""
    duration: float = 0
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "command": self.command,
            "stage": self.stage.value,
            "status": self.status.value,
            "output": self.output[-2000:],  # 限制输出长度
            "duration": self.duration,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }


@dataclass
class Pipeline:
    """CI/CD 流水线"""
    id: str
    name: str
    description: str = ""
    steps: List[BuildStep] = field(default_factory=list)
    status: BuildStatus = BuildStatus.PENDING
    trigger: str = "manual"  # manual, push, schedule
    branch: str = "main"
    environment: Dict[str, str] = field(default_factory=dict)
    artifacts: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "steps": [s.to_dict() for s in self.steps],
            "status": self.status.value,
            "trigger": self.trigger,
            "branch": self.branch,
            "environment": self.environment,
            "artifacts": self.artifacts,
        }


class PipelineRunner:
    """
    流水线执行器
    
    功能：
    - 执行 CI/CD 流水线
    - 实时输出监控
    - 步骤超时处理
    """
    
    def __init__(self, working_dir: str = None):
        self.working_dir = working_dir or os.getcwd()
        self._current_pipeline: Optional[Pipeline] = None
        self._current_process: Optional[subprocess.Popen] = None
        self._is_running = False
        self._cancel_event = threading.Event()
        self._output_callbacks: List[Callable[[str, str], None]] = []
    
    def on_output(self, callback: Callable[[str, str], None]):
        """注册输出回调"""
        self._output_callbacks.append(callback)
    
    def _emit_output(self, step_id: str, output: str):
        """发送输出"""
        for callback in self._output_callbacks:
            try:
                callback(step_id, output)
            except:
                pass
    
    def run_pipeline(self, pipeline: Pipeline) -> bool:
        """执行流水线"""
        if self._is_running:
            logger.warning("流水线正在执行中")
            return False
        
        self._is_running = True
        self._cancel_event.clear()
        self._current_pipeline = pipeline
        pipeline.status = BuildStatus.RUNNING
        
        success = True
        
        try:
            for step in pipeline.steps:
                if self._cancel_event.is_set():
                    step.status = BuildStatus.CANCELLED
                    success = False
                    break
                
                step_success = self._run_step(step, pipeline.environment)
                
                if not step_success:
                    success = False
                    # 可选择是否继续
                    break
            
            pipeline.status = BuildStatus.SUCCESS if success else BuildStatus.FAILED
            
        except Exception as e:
            logger.error(f"流水线执行错误: {e}")
            pipeline.status = BuildStatus.FAILED
            success = False
        
        finally:
            self._is_running = False
            self._current_pipeline = None
        
        return success
    
    def _run_step(self, step: BuildStep, env: Dict[str, str]) -> bool:
        """执行单个步骤"""
        step.status = BuildStatus.RUNNING
        step.started_at = datetime.now()
        step.output = ""
        
        logger.info(f"执行步骤: {step.name}")
        self._emit_output(step.id, f">>> {step.command}\n")
        
        try:
            # 合并环境变量
            run_env = os.environ.copy()
            run_env.update(env)
            
            # 执行命令
            self._current_process = subprocess.Popen(
                step.command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=self.working_dir,
                env=run_env,
            )
            
            # 实时读取输出
            while True:
                if self._cancel_event.is_set():
                    self._current_process.terminate()
                    step.status = BuildStatus.CANCELLED
                    return False
                
                line = self._current_process.stdout.readline()
                if not line and self._current_process.poll() is not None:
                    break
                
                if line:
                    step.output += line
                    self._emit_output(step.id, line)
            
            # 获取返回码
            return_code = self._current_process.wait()
            
            step.finished_at = datetime.now()
            step.duration = (step.finished_at - step.started_at).total_seconds()
            
            if return_code == 0:
                step.status = BuildStatus.SUCCESS
                return True
            else:
                step.status = BuildStatus.FAILED
                step.output += f"\n[退出码: {return_code}]"
                return False
            
        except Exception as e:
            step.status = BuildStatus.FAILED
            step.output += f"\n[错误: {str(e)}]"
            step.finished_at = datetime.now()
            return False
        
        finally:
            self._current_process = None
    
    def cancel(self):
        """取消执行"""
        self._cancel_event.set()
        if self._current_process:
            self._current_process.terminate()
    
    @property
    def is_running(self) -> bool:
        return self._is_running
    
    @property
    def current_pipeline(self) -> Optional[Pipeline]:
        return self._current_pipeline


class PipelineBuilder:
    """
    流水线构建器
    
    用于创建常用的 CI/CD 流水线模板
    """
    
    @staticmethod
    def create_python_pipeline(project_name: str) -> Pipeline:
        """创建 Python 项目流水线"""
        return Pipeline(
            id=f"pipeline_{int(time.time())}",
            name=f"{project_name} - Python CI",
            description="Python 项目构建和测试",
            steps=[
                BuildStep(
                    id="step_checkout",
                    name="Checkout",
                    command="git pull origin main",
                    stage=PipelineStage.CHECKOUT,
                ),
                BuildStep(
                    id="step_install",
                    name="Install Dependencies",
                    command="pip install -r requirements.txt",
                    stage=PipelineStage.INSTALL,
                ),
                BuildStep(
                    id="step_lint",
                    name="Lint",
                    command="python -m pylint --exit-zero .",
                    stage=PipelineStage.BUILD,
                ),
                BuildStep(
                    id="step_test",
                    name="Run Tests",
                    command="python -m pytest tests/ -v",
                    stage=PipelineStage.TEST,
                ),
                BuildStep(
                    id="step_package",
                    name="Package",
                    command="python setup.py sdist bdist_wheel",
                    stage=PipelineStage.PACKAGE,
                ),
            ],
        )
    
    @staticmethod
    def create_nodejs_pipeline(project_name: str) -> Pipeline:
        """创建 Node.js 项目流水线"""
        return Pipeline(
            id=f"pipeline_{int(time.time())}",
            name=f"{project_name} - Node.js CI",
            description="Node.js 项目构建和测试",
            steps=[
                BuildStep(
                    id="step_checkout",
                    name="Checkout",
                    command="git pull origin main",
                    stage=PipelineStage.CHECKOUT,
                ),
                BuildStep(
                    id="step_install",
                    name="Install Dependencies",
                    command="npm install",
                    stage=PipelineStage.INSTALL,
                ),
                BuildStep(
                    id="step_lint",
                    name="Lint",
                    command="npm run lint || true",
                    stage=PipelineStage.BUILD,
                ),
                BuildStep(
                    id="step_build",
                    name="Build",
                    command="npm run build",
                    stage=PipelineStage.BUILD,
                ),
                BuildStep(
                    id="step_test",
                    name="Run Tests",
                    command="npm test",
                    stage=PipelineStage.TEST,
                ),
            ],
        )
    
    @staticmethod
    def create_embedded_pipeline(project_name: str, target: str = "arm-cortex-m4") -> Pipeline:
        """创建嵌入式项目流水线"""
        return Pipeline(
            id=f"pipeline_{int(time.time())}",
            name=f"{project_name} - Embedded CI",
            description=f"嵌入式项目构建 (Target: {target})",
            environment={
                "TARGET": target,
                "CMAKE_TOOLCHAIN_FILE": "toolchain.cmake",
            },
            steps=[
                BuildStep(
                    id="step_checkout",
                    name="Checkout",
                    command="git pull origin main",
                    stage=PipelineStage.CHECKOUT,
                ),
                BuildStep(
                    id="step_configure",
                    name="Configure CMake",
                    command="mkdir -p build && cd build && cmake .. -DCMAKE_BUILD_TYPE=Release",
                    stage=PipelineStage.BUILD,
                ),
                BuildStep(
                    id="step_build",
                    name="Build Firmware",
                    command="cd build && cmake --build . -j4",
                    stage=PipelineStage.BUILD,
                ),
                BuildStep(
                    id="step_size",
                    name="Check Size",
                    command="arm-none-eabi-size build/*.elf",
                    stage=PipelineStage.BUILD,
                ),
                BuildStep(
                    id="step_package",
                    name="Generate Binary",
                    command="arm-none-eabi-objcopy -O binary build/*.elf firmware.bin",
                    stage=PipelineStage.PACKAGE,
                ),
            ],
        )
    
    @staticmethod
    def create_daq_pipeline(project_name: str) -> Pipeline:
        """创建 DAQ 项目流水线"""
        return Pipeline(
            id=f"pipeline_{int(time.time())}",
            name=f"{project_name} - DAQ CI/CD",
            description="DAQ 项目完整构建流水线",
            steps=[
                BuildStep(
                    id="step_checkout",
                    name="Checkout",
                    command="git pull origin main",
                    stage=PipelineStage.CHECKOUT,
                ),
                BuildStep(
                    id="step_backend_deps",
                    name="Install Backend Dependencies",
                    command="pip install -r requirements.txt",
                    stage=PipelineStage.INSTALL,
                ),
                BuildStep(
                    id="step_frontend_deps",
                    name="Install Frontend Dependencies",
                    command="cd visual-editor && npm install",
                    stage=PipelineStage.INSTALL,
                ),
                BuildStep(
                    id="step_backend_test",
                    name="Backend Tests",
                    command="python -m pytest tests/ -v --tb=short",
                    stage=PipelineStage.TEST,
                ),
                BuildStep(
                    id="step_frontend_build",
                    name="Frontend Build",
                    command="cd visual-editor && npm run build",
                    stage=PipelineStage.BUILD,
                ),
                BuildStep(
                    id="step_docker_build",
                    name="Docker Build",
                    command="docker build -t daq-app:latest .",
                    stage=PipelineStage.PACKAGE,
                ),
                BuildStep(
                    id="step_deploy",
                    name="Deploy",
                    command="docker-compose up -d",
                    stage=PipelineStage.DEPLOY,
                ),
            ],
        )


class CIConfigGenerator:
    """
    CI 配置文件生成器
    
    支持生成多种 CI/CD 平台的配置文件
    """
    
    @staticmethod
    def generate_github_actions(pipeline: Pipeline) -> str:
        """生成 GitHub Actions 配置"""
        stages = {}
        for step in pipeline.steps:
            stage = step.stage.value
            if stage not in stages:
                stages[stage] = []
            stages[stage].append(step)
        
        yaml_content = f"""name: {pipeline.name}

on:
  push:
    branches: [ {pipeline.branch} ]
  pull_request:
    branches: [ {pipeline.branch} ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
"""
        
        for step in pipeline.steps:
            yaml_content += f"""
    - name: {step.name}
      run: {step.command}
"""
        
        return yaml_content
    
    @staticmethod
    def generate_gitlab_ci(pipeline: Pipeline) -> str:
        """生成 GitLab CI 配置"""
        yaml_content = f"""# {pipeline.name}
# {pipeline.description}

stages:
  - checkout
  - install
  - build
  - test
  - package
  - deploy

variables:
"""
        
        for key, value in pipeline.environment.items():
            yaml_content += f"  {key}: \"{value}\"\n"
        
        for step in pipeline.steps:
            yaml_content += f"""
{step.id}:
  stage: {step.stage.value}
  script:
    - {step.command}
"""
        
        return yaml_content
    
    @staticmethod
    def generate_jenkins_pipeline(pipeline: Pipeline) -> str:
        """生成 Jenkins Pipeline"""
        groovy_content = f"""// {pipeline.name}
// {pipeline.description}

pipeline {{
    agent any
    
    environment {{
"""
        
        for key, value in pipeline.environment.items():
            groovy_content += f"        {key} = '{value}'\n"
        
        groovy_content += """    }
    
    stages {
"""
        
        current_stage = None
        for step in pipeline.steps:
            if step.stage != current_stage:
                if current_stage is not None:
                    groovy_content += "        }\n"
                current_stage = step.stage
                groovy_content += f"""        stage('{step.stage.value.capitalize()}') {{
            steps {{
"""
            
            groovy_content += f"""                sh '{step.command}'
"""
        
        if current_stage is not None:
            groovy_content += "            }\n        }\n"
        
        groovy_content += """    }
    
    post {
        always {
            cleanWs()
        }
        success {
            echo 'Build successful!'
        }
        failure {
            echo 'Build failed!'
        }
    }
}
"""
        
        return groovy_content


class BuildMonitor:
    """
    构建监控器
    
    监控构建过程并提供状态查询
    """
    
    def __init__(self):
        self._builds: Dict[str, Pipeline] = {}
        self._history: List[Dict] = []
        self._max_history = 50
    
    def add_build(self, pipeline: Pipeline):
        """添加构建记录"""
        self._builds[pipeline.id] = pipeline
    
    def get_build(self, build_id: str) -> Optional[Pipeline]:
        """获取构建"""
        return self._builds.get(build_id)
    
    def get_all_builds(self) -> List[Dict]:
        """获取所有构建"""
        return [p.to_dict() for p in self._builds.values()]
    
    def save_to_history(self, pipeline: Pipeline):
        """保存到历史记录"""
        self._history.insert(0, {
            "id": pipeline.id,
            "name": pipeline.name,
            "status": pipeline.status.value,
            "timestamp": datetime.now().isoformat(),
        })
        
        # 限制历史记录数量
        if len(self._history) > self._max_history:
            self._history = self._history[:self._max_history]
    
    def get_history(self) -> List[Dict]:
        """获取历史记录"""
        return self._history
    
    def get_statistics(self) -> Dict:
        """获取统计信息"""
        total = len(self._history)
        success = sum(1 for h in self._history if h["status"] == "success")
        failed = sum(1 for h in self._history if h["status"] == "failed")
        
        return {
            "total_builds": total,
            "success_count": success,
            "failed_count": failed,
            "success_rate": (success / total * 100) if total > 0 else 0,
        }


# 全局实例
_pipeline_runner: Optional[PipelineRunner] = None
_build_monitor: Optional[BuildMonitor] = None


def get_pipeline_runner(working_dir: str = None) -> PipelineRunner:
    """获取流水线执行器"""
    global _pipeline_runner
    if _pipeline_runner is None:
        _pipeline_runner = PipelineRunner(working_dir)
    return _pipeline_runner


def get_build_monitor() -> BuildMonitor:
    """获取构建监控器"""
    global _build_monitor
    if _build_monitor is None:
        _build_monitor = BuildMonitor()
    return _build_monitor

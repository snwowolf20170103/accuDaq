"""
MQTT Broker 组件 - 启动本地 MQTT 服务
"""

import os
import sys
import time
import logging
import subprocess
import threading
from typing import Optional

from .base import ComponentBase, ComponentType, ComponentRegistry, PortType

logger = logging.getLogger(__name__)

@ComponentRegistry.register
class MQTTBrokerComponent(ComponentBase):
    """MQTT Broker 组件 - 启动本地 MQTT 服务 (基于 Node.js Aedes)"""

    component_type = ComponentType.COMMUNICATION
    component_name = "MQTTBroker"
    component_description = "启动本地 MQTT Broker 服务"
    component_icon = "📶"

    def __init__(self, instance_id: Optional[str] = None):
        self._process: Optional[subprocess.Popen] = None
        self._monitor_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_running = False
        super().__init__(instance_id)

    def _setup_ports(self):
        self.add_output_port("status", PortType.STRING, "服务状态")
        self.add_output_port("client_count", PortType.NUMBER, "连接客户端数")

    def _on_configure(self):
        self.config.setdefault("port", 1883)
        self.config.setdefault("ws_port", 8083)
        self.config.setdefault("auto_start", True)

    def _find_script_path(self):
        # 假设当前工作目录是项目根目录，或者相对于此文件的路径
        # file: daq_core/components/mqtt_broker.py
        # script: scripts/start_broker.js
        
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        script_path = os.path.join(base_dir, "scripts", "start_broker.js")
        
        if os.path.exists(script_path):
            return script_path
            
        # 备用：检查当前目录下的 scripts
        if os.path.exists("scripts/start_broker.js"):
            return os.path.abspath("scripts/start_broker.js")
            
        return None

    def start(self):
        if self.config["auto_start"]:
            self._start_broker()
        super().start()

    def _start_broker(self):
        if self._process and self._process.poll() is None:
            logger.warning("MQTT Broker 已经在运行中")
            return

        script_path = self._find_script_path()
        if not script_path:
            error_msg = "未找到 scripts/start_broker.js"
            logger.error(error_msg)
            self.set_output("status", error_msg)
            return

        try:
            # 检查 node 是否可用
            try:
                subprocess.run(["node", "--version"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except (subprocess.CalledProcessError, FileNotFoundError):
                error_msg = "未找到 Node.js 环境，无法启动 Broker"
                logger.error(error_msg)
                self.set_output("status", error_msg)
                return

            cmd = ["node", script_path]
            logger.info(f"启动 MQTT Broker: {' '.join(cmd)}")
            
            # 启动子进程
            self._process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                cwd=os.path.dirname(script_path) # 在 scripts 目录下运行
            )
            
            self._is_running = True
            self.set_output("status", "Running")
            
            # 启动监控线程
            self._stop_event.clear()
            self._monitor_thread = threading.Thread(target=self._monitor_output, daemon=True)
            self._monitor_thread.start()
            
        except Exception as e:
            logger.error(f"启动 MQTT Broker 失败: {e}")
            self.set_output("status", f"Error: {e}")

    def _monitor_output(self):
        """监控子进程输出"""
        if not self._process or not self._process.stdout:
            return

        while not self._stop_event.is_set():
            if self._process.poll() is not None:
                logger.warning("MQTT Broker 进程已退出")
                self._is_running = False
                self.set_output("status", "Stopped")
                break
                
            line = self._process.stdout.readline()
            if line:
                line = line.strip()
                if line:
                    logger.info(f"[Broker] {line}")
                    # 简单的状态解析
                    if "running on port" in line:
                        self.set_output("status", "Active")
            else:
                time.sleep(0.1)

    def stop(self):
        self._stop_event.set()
        
        if self._process:
            logger.info("正在停止 MQTT Broker...")
            self._process.terminate()
            try:
                self._process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self._process.kill()
            self._process = None
            self._is_running = False
            
        super().stop()

    def process(self):
        # 实时更新状态
        if self._is_running:
            return {"status": "Running"}
        return {"status": "Stopped"}

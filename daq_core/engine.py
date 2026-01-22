"""
DAQ 引擎 - 组件运行时核心
负责加载、管理和调度组件执行
"""

import logging
import time
import threading
from typing import Any, Dict, List, Optional, Tuple

from .components.base import ComponentBase, ComponentRegistry

logger = logging.getLogger(__name__)


class Connection:
    """组件间连接定义"""

    def __init__(
        self,
        source_component_id: str,
        source_port: str,
        target_component_id: str,
        target_port: str
    ):
        self.source_component_id = source_component_id
        self.source_port = source_port
        self.target_component_id = target_component_id
        self.target_port = target_port

    def to_dict(self) -> Dict[str, str]:
        return {
            "source_component_id": self.source_component_id,
            "source_port": self.source_port,
            "target_component_id": self.target_component_id,
            "target_port": self.target_port,
        }


class DAQEngine:
    """
    DAQ 引擎
    负责组件的生命周期管理和数据流调度
    """

    def __init__(self):
        self._components: Dict[str, ComponentBase] = {}
        self._connections: List[Connection] = []
        self._is_running = False
        self._main_loop_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._tick_interval = 0.1  # 100ms

        # 配置日志
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        )

    def add_component(
        self,
        component_name: str,
        instance_id: Optional[str] = None,
        config: Optional[Dict] = None
    ) -> Optional[ComponentBase]:
        """添加组件实例"""
        component = ComponentRegistry.create(component_name, instance_id, config)
        if component:
            self._components[component.instance_id] = component
            logger.info(f"添加组件: {component_name} (ID: {component.instance_id})")
            return component
        else:
            logger.error(f"无法创建组件: {component_name}")
            return None

    def remove_component(self, instance_id: str):
        """移除组件"""
        if instance_id in self._components:
            component = self._components.pop(instance_id)
            component.destroy()
            # 移除相关连接
            self._connections = [
                c for c in self._connections
                if c.source_component_id != instance_id and c.target_component_id != instance_id
            ]
            logger.info(f"移除组件: {instance_id}")

    def get_component(self, instance_id: str) -> Optional[ComponentBase]:
        """获取组件实例"""
        return self._components.get(instance_id)

    def connect(
        self,
        source_id: str,
        source_port: str,
        target_id: str,
        target_port: str
    ) -> bool:
        """连接两个组件的端口"""
        source = self._components.get(source_id)
        target = self._components.get(target_id)

        if not source:
            logger.error(f"源组件不存在: {source_id}")
            return False
        if not target:
            logger.error(f"目标组件不存在: {target_id}")
            return False
        if source_port not in source.output_ports:
            logger.error(f"源组件 {source_id} 没有输出端口: {source_port}")
            return False
        if target_port not in target.input_ports:
            logger.error(f"目标组件 {target_id} 没有输入端口: {target_port}")
            return False

        conn = Connection(source_id, source_port, target_id, target_port)
        self._connections.append(conn)
        logger.info(f"建立连接: {source_id}.{source_port} -> {target_id}.{target_port}")
        return True

    def disconnect(self, source_id: str, source_port: str, target_id: str, target_port: str):
        """断开连接"""
        self._connections = [
            c for c in self._connections
            if not (
                c.source_component_id == source_id and
                c.source_port == source_port and
                c.target_component_id == target_id and
                c.target_port == target_port
            )
        ]

    def _transfer_data(self):
        """传输连接间的数据"""
        for conn in self._connections:
            source = self._components.get(conn.source_component_id)
            target = self._components.get(conn.target_component_id)

            if source and target:
                if conn.source_port in source.output_ports:
                    value = source.output_ports[conn.source_port].get_value()
                    if value is not None and conn.target_port in target.input_ports:
                        target.input_ports[conn.target_port].set_value(value)

    def _main_loop(self):
        """主循环 - 定时触发组件处理"""
        while not self._stop_event.is_set():
            try:
                # 1. 传输数据
                self._transfer_data()

                # 2. 处理各组件（跳过有自己循环的组件）
                for component in self._components.values():
                    if component._is_running:
                        # 只对需要主动触发的组件调用 process
                        # MQTT/MockDevice 有自己的线程，不需要在这里处理
                        if component.component_name in ["MathOperation", "Compare", "CSVStorage", "CustomScript"]:
                            component.process()

            except Exception as e:
                logger.error(f"主循环异常: {e}")

            self._stop_event.wait(self._tick_interval)

    def start(self):
        """启动引擎"""
        if self._is_running:
            logger.warning("引擎已在运行")
            return

        logger.info("启动 DAQ 引擎...")

        # 启动所有组件
        for component in self._components.values():
            try:
                component.start()
            except Exception as e:
                logger.error(f"组件 {component.instance_id} 启动失败: {e}")

        # 启动主循环
        self._stop_event.clear()
        self._main_loop_thread = threading.Thread(target=self._main_loop, daemon=True)
        self._main_loop_thread.start()

        self._is_running = True
        logger.info("DAQ 引擎已启动")

    def stop(self):
        """停止引擎"""
        if not self._is_running:
            return

        logger.info("停止 DAQ 引擎...")

        # 停止主循环
        self._stop_event.set()
        if self._main_loop_thread:
            self._main_loop_thread.join(timeout=2)

        # 停止所有组件
        for component in self._components.values():
            try:
                component.stop()
            except Exception as e:
                logger.error(f"组件 {component.instance_id} 停止失败: {e}")

        self._is_running = False
        logger.info("DAQ 引擎已停止")

    def destroy(self):
        """销毁引擎，释放所有资源"""
        self.stop()
        for component in list(self._components.values()):
            component.destroy()
        self._components.clear()
        self._connections.clear()
        logger.info("DAQ 引擎已销毁")

    def get_status(self) -> Dict[str, Any]:
        """获取引擎状态"""
        return {
            "is_running": self._is_running,
            "component_count": len(self._components),
            "connection_count": len(self._connections),
            "components": [
                {
                    "id": c.instance_id,
                    "name": c.component_name,
                    "type": c.component_type.value,
                    "running": c._is_running
                }
                for c in self._components.values()
            ],
            "connections": [c.to_dict() for c in self._connections]
        }

    def list_available_components(self) -> List[Dict[str, Any]]:
        """列出所有可用组件"""
        return ComponentRegistry.list_all()

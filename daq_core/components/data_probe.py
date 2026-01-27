"""
数据探针组件
功能：监控数据流并通过 WebSocket 推送给前端，用于实时可视化
"""

import logging
import time

from .base import ComponentBase, PortType, ComponentRegistry, ComponentType
from daq_core.system.log_server import log_queue

logger = logging.getLogger(__name__)


@ComponentRegistry.register('DataProbe')
class DataProbeComponent(ComponentBase):
    """
    数据探针组件

    配置参数:
        probe_id: str - 探针唯一标识（用于前端匹配）
        label: str - 显示标签

    输入端口:
        input: ANY - 任意类型的输入值

    输出端口:
        output: ANY - 透传输入值（不影响原有数据流）
    """

    component_name = "DataProbe"
    component_type = ComponentType.PROCESS

    def _setup_ports(self):
        """设置端口"""
        self.add_input_port("input", PortType.ANY)
        self.add_output_port("output", PortType.ANY)

    def configure(self, config=None):
        """配置组件"""
        if config is None:
            config = {}
        super().configure(config)
        self.probe_id = self.config.get("probe_id", self.instance_id)
        self.label = self.config.get("label", "Probe")
        self._last_value = None

    def start(self):
        """启动组件"""
        self._is_running = True
        logger.info(f"DataProbe {self.label} ({self.instance_id}) started")

    def stop(self):
        """停止组件"""
        self._is_running = False
        logger.info(f"DataProbe {self.label} ({self.instance_id}) stopped")

    def process(self):
        """处理逻辑"""
        value = self.get_input("input")

        if value is not None:
            # 透传输出（不影响数据流）
            self.set_output("output", value)
            
            # 检测值变化，避免重复推送（简单的去重）
            # 注意：对于对象类型这可能比较慢，需斟酌
            if value != self._last_value:
                self._last_value = value
                self._broadcast_value(value)

    def _broadcast_value(self, value):
        """通过 WebSocket 广播数据给前端"""
        try:
            message = {
                "type": "probe_data",
                "probe_id": self.probe_id,
                "label": self.label,
                "value": value,
                "component_id": self.instance_id,
                "timestamp": time.time()
            }
            log_queue.put(message)
        except Exception as e:
            logger.debug(f"Probe broadcast failed: {e}")

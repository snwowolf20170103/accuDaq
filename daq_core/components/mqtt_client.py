"""
MQTT 客户端组件 - 订阅 MQTT Topic 获取数据
"""

import json
import logging
from typing import Any, Callable, Dict, Optional
import paho.mqtt.client as mqtt

from .base import ComponentBase, ComponentType, ComponentRegistry, PortType

logger = logging.getLogger(__name__)


@ComponentRegistry.register
class MQTTSubscriberComponent(ComponentBase):
    """MQTT 订阅组件 - 订阅指定 topic 接收数据"""

    component_type = ComponentType.COMMUNICATION
    component_name = "MQTTSubscriber"
    component_description = "订阅 MQTT Topic，接收实时数据"
    component_icon = "📡"

    def __init__(self, instance_id: Optional[str] = None):
        self._client: Optional[mqtt.Client] = None
        self._message_callback: Optional[Callable] = None
        self._last_message: Any = None
        super().__init__(instance_id)

    def _setup_ports(self):
        self.add_output_port("data", PortType.ANY, "接收到的 MQTT 消息数据")
        self.add_output_port("topic", PortType.STRING, "消息来源 topic")
        self.add_output_port("timestamp", PortType.NUMBER, "消息时间戳")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("broker_host", "localhost")
        self.config.setdefault("broker_port", 1883)
        self.config.setdefault("topic", "sensors/#")
        self.config.setdefault("qos", 0)
        self.config.setdefault("client_id", f"daq_sub_{self.instance_id}")

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        """连接成功回调"""
        if rc == 0:
            logger.info(f"MQTT 连接成功: {self.config['broker_host']}")
            topic = self.config["topic"]
            qos = self.config["qos"]
            client.subscribe(topic, qos)
            logger.info(f"已订阅 topic: {topic}")
        else:
            logger.error(f"MQTT 连接失败, 返回码: {rc}")

    def _on_message(self, client, userdata, msg):
        """消息接收回调"""
        import time
        try:
            # 尝试解析 JSON，否则使用原始字符串
            payload = msg.payload.decode("utf-8")
            try:
                data = json.loads(payload)
            except json.JSONDecodeError:
                data = payload

            self._last_message = data
            self.set_output("data", data)
            self.set_output("topic", msg.topic)
            self.set_output("timestamp", time.time())

            logger.debug(f"收到消息 [{msg.topic}]: {data}")

            # 触发外部回调
            if self._message_callback:
                self._message_callback(msg.topic, data)

        except Exception as e:
            logger.error(f"处理 MQTT 消息失败: {e}")

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties=None):
        """断开连接回调"""
        if reason_code != 0:
            logger.warning(f"MQTT 意外断开, 返回码: {reason_code}")

    def set_message_callback(self, callback: Callable[[str, Any], None]):
        """设置消息回调函数"""
        self._message_callback = callback

    def start(self):
        """启动 MQTT 客户端"""
        self._client = mqtt.Client(
            client_id=self.config["client_id"],
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2
        )
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect

        try:
            self._client.connect(
                self.config["broker_host"],
                self.config["broker_port"],
                keepalive=60
            )
            self._client.loop_start()
            super().start()
        except Exception as e:
            logger.error(f"MQTT 连接失败: {e}")
            raise

    def stop(self):
        """停止 MQTT 客户端"""
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            self._client = None
        super().stop()

    def process(self):
        """获取最新消息（非阻塞）"""
        return self._last_message

    def get_last_message(self) -> Any:
        """获取最后一条消息"""
        return self._last_message

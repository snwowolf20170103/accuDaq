"""
MQTT 发布组件 - 向 MQTT Topic 发布数据
"""

import json
import logging
from typing import Any, Optional
import paho.mqtt.client as mqtt

from .base import ComponentBase, ComponentType, ComponentRegistry, PortType

logger = logging.getLogger(__name__)


@ComponentRegistry.register
class MQTTPublisherComponent(ComponentBase):
    """MQTT 发布组件 - 向指定 topic 发布数据"""

    component_type = ComponentType.COMMUNICATION
    component_name = "MQTTPublisher"
    component_description = "向 MQTT Topic 发布数据"
    component_icon = "📤"

    def __init__(self, instance_id: Optional[str] = None):
        self._client: Optional[mqtt.Client] = None
        self._is_connected = False
        super().__init__(instance_id)

    def _setup_ports(self):
        self.add_input_port("data", PortType.ANY, "要发布的数据")
        self.add_output_port("success", PortType.BOOLEAN, "发布是否成功")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("broker_host", "localhost")
        self.config.setdefault("broker_port", 1883)
        self.config.setdefault("topic", "output/data")
        self.config.setdefault("qos", 0)
        self.config.setdefault("retain", False)
        self.config.setdefault("client_id", f"daq_pub_{self.instance_id}")

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        """连接成功回调"""
        if rc == 0:
            self._is_connected = True
            logger.info(f"MQTT Publisher 连接成功: {self.config['broker_host']}")
        else:
            self._is_connected = False
            logger.error(f"MQTT Publisher 连接失败, 返回码: {rc}")

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties=None):
        """断开连接回调"""
        self._is_connected = False
        if reason_code != 0:
            logger.warning(f"MQTT Publisher 意外断开, 返回码: {reason_code}")

    def start(self):
        """启动 MQTT 客户端"""
        self._client = mqtt.Client(
            client_id=self.config["client_id"],
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2
        )
        self._client.on_connect = self._on_connect
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
            logger.error(f"MQTT Publisher 连接失败: {e}")
            raise

    def stop(self):
        """停止 MQTT 客户端"""
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            self._client = None
        self._is_connected = False
        super().stop()

    def process(self):
        """处理并发布输入数据"""
        data = self.get_input("data")
        if data is not None:
            success = self.publish(data)
            self.set_output("success", success)
            return success
        return False

    def publish(self, data: Any, topic: Optional[str] = None) -> bool:
        """发布数据到 MQTT"""
        if not self._client or not self._is_connected:
            logger.warning("MQTT 未连接，无法发布")
            return False

        target_topic = topic or self.config["topic"]

        try:
            # 将数据转换为 JSON 字符串
            if isinstance(data, (dict, list)):
                payload = json.dumps(data)
            else:
                payload = str(data)

            result = self._client.publish(
                target_topic,
                payload,
                qos=self.config["qos"],
                retain=self.config["retain"]
            )

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"发布成功 [{target_topic}]: {payload}")
                return True
            else:
                logger.warning(f"发布失败, 返回码: {result.rc}")
                return False

        except Exception as e:
            logger.error(f"发布数据失败: {e}")
            return False

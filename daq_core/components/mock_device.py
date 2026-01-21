"""
MockDevice 组件 - 模拟设备数据源
可生成正弦波、方波、随机数等模拟数据，并发布到 MQTT
"""

import json
import math
import random
import time
import logging
import threading
from typing import Any, Dict, Optional
from enum import Enum
import paho.mqtt.client as mqtt

from .base import ComponentBase, ComponentType, ComponentRegistry, PortType

logger = logging.getLogger(__name__)


class WaveType(Enum):
    """波形类型"""
    SINE = "sine"           # 正弦波
    SQUARE = "square"       # 方波
    TRIANGLE = "triangle"   # 三角波
    RANDOM = "random"       # 随机数
    CONSTANT = "constant"   # 常量


@ComponentRegistry.register
class MockDeviceComponent(ComponentBase):
    """模拟设备组件 - 生成模拟数据并发布到 MQTT"""

    component_type = ComponentType.DEVICE
    component_name = "MockDevice"
    component_description = "模拟传感器设备，生成测试数据并发布到 MQTT"
    component_icon = "🎲"

    def __init__(self, instance_id: Optional[str] = None):
        self._client: Optional[mqtt.Client] = None
        self._is_connected = False
        self._timer_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._tick_count = 0
        super().__init__(instance_id)

    def _setup_ports(self):
        self.add_output_port("value", PortType.NUMBER, "当前生成的数值")
        self.add_output_port("data", PortType.OBJECT, "完整数据对象")

    def _on_configure(self):
        """配置默认值"""
        # MQTT 配置
        self.config.setdefault("broker_host", "localhost")
        self.config.setdefault("broker_port", 1883)
        self.config.setdefault("topic", "sensors/mock")
        self.config.setdefault("client_id", f"mock_dev_{self.instance_id}")

        # 数据生成配置
        self.config.setdefault("wave_type", WaveType.SINE.value)
        self.config.setdefault("amplitude", 100.0)      # 振幅
        self.config.setdefault("offset", 0.0)           # 偏移量
        self.config.setdefault("frequency", 0.1)        # 频率（Hz）
        self.config.setdefault("interval_ms", 1000)     # 发送间隔（毫秒）
        self.config.setdefault("device_name", "MockSensor")
        self.config.setdefault("unit", "°C")

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self._is_connected = True
            logger.info(f"MockDevice 连接成功: {self.config['broker_host']}")
        else:
            self._is_connected = False
            logger.error(f"MockDevice 连接失败, 返回码: {rc}")

    def _generate_value(self) -> float:
        """根据配置生成数据值"""
        wave_type = self.config["wave_type"]
        amplitude = self.config["amplitude"]
        offset = self.config["offset"]
        frequency = self.config["frequency"]

        t = self._tick_count * (self.config["interval_ms"] / 1000.0)

        if wave_type == WaveType.SINE.value:
            value = amplitude * math.sin(2 * math.pi * frequency * t) + offset
        elif wave_type == WaveType.SQUARE.value:
            sin_val = math.sin(2 * math.pi * frequency * t)
            value = amplitude * (1 if sin_val >= 0 else -1) + offset
        elif wave_type == WaveType.TRIANGLE.value:
            phase = (frequency * t) % 1.0
            if phase < 0.5:
                value = amplitude * (4 * phase - 1) + offset
            else:
                value = amplitude * (3 - 4 * phase) + offset
        elif wave_type == WaveType.RANDOM.value:
            value = random.uniform(-amplitude, amplitude) + offset
        elif wave_type == WaveType.CONSTANT.value:
            value = amplitude + offset
        else:
            value = offset

        return round(value, 3)

    def _publish_data(self):
        """发布一条数据"""
        value = self._generate_value()
        timestamp = time.time()

        data = {
            "device": self.config["device_name"],
            "value": value,
            "unit": self.config["unit"],
            "timestamp": timestamp,
            "tick": self._tick_count
        }

        self.set_output("value", value)
        self.set_output("data", data)

        if self._client and self._is_connected:
            payload = json.dumps(data)
            self._client.publish(self.config["topic"], payload, qos=0)
            logger.debug(f"MockDevice 发布: {payload}")

        self._tick_count += 1
        return data

    def _timer_loop(self):
        """定时发送数据的线程"""
        interval = self.config["interval_ms"] / 1000.0
        while not self._stop_event.is_set():
            self._publish_data()
            self._stop_event.wait(interval)

    def start(self):
        """启动模拟设备"""
        # 连接 MQTT
        self._client = mqtt.Client(
            client_id=self.config["client_id"],
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2
        )
        self._client.on_connect = self._on_connect

        try:
            self._client.connect(
                self.config["broker_host"],
                self.config["broker_port"],
                keepalive=60
            )
            self._client.loop_start()
        except Exception as e:
            logger.error(f"MockDevice 连接 MQTT 失败: {e}")
            raise

        # 启动定时发送线程
        self._stop_event.clear()
        self._tick_count = 0
        self._timer_thread = threading.Thread(target=self._timer_loop, daemon=True)
        self._timer_thread.start()

        super().start()
        logger.info(f"MockDevice 开始发送数据到 {self.config['topic']}")

    def stop(self):
        """停止模拟设备"""
        self._stop_event.set()
        if self._timer_thread:
            self._timer_thread.join(timeout=2)
            self._timer_thread = None

        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            self._client = None

        self._is_connected = False
        super().stop()

    def process(self):
        """手动触发一次数据生成"""
        return self._publish_data()

    def generate_once(self) -> Dict[str, Any]:
        """生成一条数据（不发布）"""
        value = self._generate_value()
        self._tick_count += 1
        return {
            "device": self.config["device_name"],
            "value": value,
            "unit": self.config["unit"],
            "timestamp": time.time()
        }

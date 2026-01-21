"""
自动生成的 DAQ 运行脚本
项目: 温度监控演示
版本: 1.0.0
生成时间: 2026-01-15T13:43:21.886743

警告: 此文件由 DAQ 编译器自动生成，请勿手动修改
"""

import sys
import time
import logging

# DAQ Core 导入
from daq_core.engine import DAQEngine
from daq_core.components import (
        ComponentRegistry,
    CSVStorageComponent,
    MQTTSubscriberComponent,
    MathOperationComponent,
    MockDeviceComponent,
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def create_engine():
    """创建并配置 DAQ 引擎"""
    engine = DAQEngine()

    # 创建组件
    mock_temp = engine.add_component("MockDevice", "mock_temp", {
        "broker_host": 'localhost',
        "broker_port": 1883,
        "topic": 'sensors/temperature',
        "wave_type": 'sine',
        "amplitude": 10,
        "offset": 25,
        "frequency": 0.05,
        "interval_ms": 1000,
        "device_name": 'TempSensor01',
        "unit": '°C'
    })

    mqtt_sub = engine.add_component("MQTTSubscriber", "mqtt_sub", {
        "broker_host": 'localhost',
        "broker_port": 1883,
        "topic": 'sensors/temperature'
    })

    celsius_to_fahrenheit = engine.add_component("MathOperation", "celsius_to_fahrenheit", {
        "operation": 'scale',
        "scale": 1.8,
        "offset": 32,
        "threshold": 100
    })

    csv_logger = engine.add_component("CSVStorage", "csv_logger", {
        "file_path": './data/temperature_log.csv',
        "include_timestamp": True,
        "flush_interval": 5
    })

    # 建立连接
    engine.connect("mqtt_sub", "data", "celsius_to_fahrenheit", "input1")
    engine.connect("celsius_to_fahrenheit", "result", "csv_logger", "value")

    return engine


def setup_callbacks(engine):
    """设置组件回调"""

    # mqtt_sub 的消息处理回调
    def on_mqtt_sub_message(topic, data):
        logger.debug(f"收到消息 [{topic}]: {data}")
        # 传递数据到 celsius_to_fahrenheit
        celsius_to_fahrenheit = engine.get_component("celsius_to_fahrenheit")
        if celsius_to_fahrenheit and isinstance(data, dict) and "value" in data:
            celsius_to_fahrenheit.input_ports["input1"].set_value(data["value"])
            celsius_to_fahrenheit.process()

    mqtt_sub = engine.get_component("mqtt_sub")
    mqtt_sub.set_message_callback(on_mqtt_sub_message)


def main():
    """主函数 - 运行 温度监控演示"""
    print("=" * 60)
    print("DAQ 项目: 温度监控演示")
    print("=" * 60)

    engine = create_engine()

    setup_callbacks(engine)

    print("启动引擎...")
    print("按 Ctrl+C 停止")
    print("-" * 40)

    try:
        engine.start()

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n接收到停止信号...")

    finally:
        engine.stop()
        engine.destroy()
        print("引擎已停止")


if __name__ == "__main__":
    main()
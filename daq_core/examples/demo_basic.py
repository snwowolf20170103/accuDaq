"""
DAQ Core 示例
演示完整的数据流：MockDevice → MathOperation → CSVStorage

运行前请确保：
1. 安装 MQTT Broker (如 mosquitto): choco install mosquitto
2. 启动 mosquitto 服务
3. 安装依赖: pip install paho-mqtt
"""

import time
import logging
import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, project_root)

from daq_core.engine import DAQEngine
from daq_core.components import (
    ComponentRegistry,
    MockDeviceComponent,
    MQTTSubscriberComponent,
    MathOperationComponent,
    CSVStorageComponent
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def demo_basic_flow():
    """
    基础数据流演示
    MockDevice 生成正弦波数据 → MQTT Broker → MQTTSubscriber 接收 → 数学运算 → CSV 存储
    """
    print("\n" + "=" * 60)
    print("DAQ Core 基础数据流演示")
    print("=" * 60)

    # 创建引擎
    engine = DAQEngine()

    # 查看可用组件
    print("\n可用组件列表:")
    for comp in engine.list_available_components():
        print(f"  {comp['icon']} {comp['name']}: {comp['description']}")

    # 添加组件
    print("\n创建组件...")

    # 1. MockDevice - 模拟传感器
    mock_device = engine.add_component("MockDevice", "mock1", {
        "broker_host": "localhost",
        "broker_port": 1883,
        "topic": "sensors/temperature",
        "wave_type": "sine",
        "amplitude": 25.0,
        "offset": 20.0,
        "frequency": 0.1,
        "interval_ms": 1000,
        "device_name": "TempSensor01",
        "unit": "°C"
    })

    # 2. MQTT Subscriber - 接收数据
    mqtt_sub = engine.add_component("MQTTSubscriber", "sub1", {
        "broker_host": "localhost",
        "broker_port": 1883,
        "topic": "sensors/temperature"
    })

    # 3. 数学运算 - 华氏度转换
    math_op = engine.add_component("MathOperation", "math1", {
        "operation": "scale",
        "scale": 1.8,
        "offset": 32,
        "threshold": 100
    })

    # 4. CSV 存储
    csv_storage = engine.add_component("CSVStorage", "csv1", {
        "file_path": "./data/temperature_log.csv",
        "include_timestamp": True,
        "flush_interval": 5
    })

    # 建立连接
    print("\n建立数据流连接...")

    # MQTT Subscriber 的回调 - 接收到数据时触发处理
    def on_mqtt_message(topic: str, data: dict):
        if isinstance(data, dict) and "value" in data:
            # 获取原始温度值
            celsius = data["value"]

            # 通过数学组件转换
            math_op.input_ports["input1"].set_value(celsius)
            math_op.process()
            fahrenheit = math_op.output_ports["result"].get_value()

            # 存储数据
            record = {
                "device": data.get("device", "unknown"),
                "celsius": celsius,
                "fahrenheit": fahrenheit,
                "unit_c": "°C",
                "unit_f": "°F"
            }
            csv_storage.input_ports["data"].set_value(record)
            csv_storage.process()

            print(f"  📊 {data.get('device')}: {celsius:.1f}°C = {fahrenheit:.1f}°F")

    mqtt_sub.set_message_callback(on_mqtt_message)

    # 启动引擎
    print("\n启动 DAQ 引擎...")
    print("(按 Ctrl+C 停止)")
    print("-" * 40)

    try:
        engine.start()

        # 运行一段时间
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n接收到停止信号...")

    finally:
        # 停止引擎
        engine.stop()
        engine.destroy()

        print("-" * 40)
        print(f"数据已保存到: ./data/temperature_log.csv")
        print("演示结束")


def demo_without_mqtt():
    """
    无 MQTT 的简单演示 - 直接测试组件
    """
    print("\n" + "=" * 60)
    print("DAQ Core 组件直接测试（无需 MQTT Broker）")
    print("=" * 60)

    # 创建组件实例
    mock = MockDeviceComponent("test_mock")
    mock.configure({
        "wave_type": "sine",
        "amplitude": 50,
        "offset": 100,
        "interval_ms": 500
    })

    math_op = MathOperationComponent("test_math")
    math_op.configure({
        "operation": "scale",
        "scale": 2.0,
        "offset": 10,
        "threshold": 250
    })

    csv = CSVStorageComponent("test_csv")
    csv.configure({
        "file_path": "./data/test_output.csv",
        "include_timestamp": True
    })

    print("\n开始测试（生成 10 条数据）...")
    csv.start()

    for i in range(10):
        # 生成数据
        data = mock.generate_once()
        value = data["value"]

        # 数学处理
        math_op.input_ports["input1"].set_value(value)
        math_op.process()
        result = math_op.output_ports["result"].get_value()
        exceeded = math_op.output_ports["exceeded"].get_value()

        # 存储
        record = {
            "original": value,
            "processed": result,
            "exceeded": exceeded
        }
        csv.input_ports["data"].set_value(record)
        csv.process()

        print(f"  [{i+1}] 原始: {value:.2f} → 处理后: {result:.2f} (超阈值: {exceeded})")
        time.sleep(0.3)

    csv.stop()
    print(f"\n数据已保存到: ./data/test_output.csv")
    print(f"共写入 {csv.get_row_count()} 行")


if __name__ == "__main__":
    print("选择演示模式:")
    print("  1. 基础数据流（需要 MQTT Broker）")
    print("  2. 组件直接测试（无需 MQTT）")

    choice = input("\n请输入选项 (1/2，默认 2): ").strip() or "2"

    if choice == "1":
        demo_basic_flow()
    else:
        demo_without_mqtt()

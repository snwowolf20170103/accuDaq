"""
OPC UA -> MQTT 桥接测试

此脚本演示如何：
1. 连接到 OPC UA 服务器
2. 读取节点数据
3. 将数据转发到 MQTT

使用方法：
    先启动 OPC UA 模拟器: python opcua_simulator.py
    再运行此脚本: python test_opcua_mqtt_bridge.py
"""

import sys
import time
import json
import logging
import argparse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 添加项目根目录到路径
sys.path.insert(0, r'f:\workspaces2025\accuDaq')

from daq_core.components import (
    OPCUAClientComponent,
    OPCUANodeReaderComponent,
    OPCUASubscriptionComponent
)


def test_opcua_direct_read():
    """测试直接读取 OPC UA 节点"""
    print("\n" + "="*60)
    print("  测试 1: OPC UA 直接读取")
    print("="*60)
    
    # 创建客户端组件
    client = OPCUAClientComponent("opcua_client_1")
    client.configure({
        'endpoint': 'opc.tcp://localhost:4840',
        'auto_reconnect': False
    })
    
    # 创建读取组件
    reader = OPCUANodeReaderComponent("opcua_reader_1")
    reader.configure({
        'node_id': 'ns=2;i=2',  # Temperature (Updated ID)
        'poll_interval_ms': 1000,
        'mqtt_enabled': False
    })
    
    # 启动组件
    client.start()
    reader.start()
    
    # 模拟连接客户端
    reader.input_ports["client"].set_value(client)
    
    # 读取几次数据
    print("\n读取 OPC UA 节点数据 (每秒一次, 共5次):")
    for i in range(5):
        reader.process()
        value = reader.output_ports["value"].get_value()
        quality = reader.output_ports["quality"].get_value()
        timestamp = reader.output_ports["timestamp"].get_value()
        print(f"  [{i+1}] Value: {value}, Quality: {quality}, Time: {timestamp}")
        time.sleep(1)
    
    # 停止组件
    reader.stop()
    client.stop()
    
    print("\n✅ 测试 1 完成")


def test_opcua_mqtt_forwarding():
    """测试 OPC UA 数据转发到 MQTT"""
    print("\n" + "="*60)
    print("  测试 2: OPC UA -> MQTT 转发")
    print("="*60)
    
    # 创建客户端组件
    client = OPCUAClientComponent("opcua_client_2")
    client.configure({
        'endpoint': 'opc.tcp://localhost:4840',
        'auto_reconnect': False
    })
    
    # 创建带 MQTT 转发的读取组件
    reader = OPCUANodeReaderComponent("opcua_reader_2")
    reader.configure({
        'node_id': 'ns=2;i=2',  # Temperature (Updated ID)
        'poll_interval_ms': 1000,
        'mqtt_enabled': True,
        'mqtt_broker': 'localhost',
        'mqtt_port': 1883,
        'mqtt_topic': 'opcua/temperature'
    })
    
    # 启动组件
    client.start()
    reader.start()
    
    # 模拟连接客户端
    reader.input_ports["client"].set_value(client)
    
    print("\n正在转发 OPC UA 数据到 MQTT (主题: opcua/temperature)...")
    print("您可以打开 mqtt_standard_demo.html 订阅 'opcua/#' 查看数据")
    print("\n每秒发送一次, 共10次:")
    
    for i in range(10):
        reader.process()
        value = reader.output_ports["value"].get_value()
        raw_data = reader.output_ports["raw_data"].get_value()
        print(f"  [{i+1}] 已发送: {json.dumps(raw_data)}")
        time.sleep(1)
    
    # 停止组件
    reader.stop()
    client.stop()
    
    print("\n✅ 测试 2 完成")


def test_opcua_subscription():
    """测试 OPC UA 订阅模式"""
    print("\n" + "="*60)
    print("  测试 3: OPC UA 订阅模式")
    print("="*60)
    
    # 创建客户端组件
    client = OPCUAClientComponent("opcua_client_3")
    client.configure({
        'endpoint': 'opc.tcp://localhost:4840',
        'auto_reconnect': False
    })
    
    # 创建订阅组件（多节点）
    subscription = OPCUASubscriptionComponent("opcua_sub_1")
    subscription.configure({
        'node_ids': ['ns=2;i=2', 'ns=2;i=3', 'ns=2;i=4'],  # Temp, Pressure, Flow (Updated IDs)
        'publish_interval_ms': 500,
        'mqtt_enabled': True,
        'mqtt_broker': 'localhost',
        'mqtt_port': 1883,
        'mqtt_topic': 'opcua/multi'
    })
    
    # 启动组件
    client.start()
    subscription.start()
    
    # 模拟连接客户端
    subscription.input_ports["client"].set_value(client)
    
    print("\n订阅多个节点并转发到 MQTT (主题: opcua/multi)...")
    print("节点列表: Temperature, Pressure, FlowRate")
    print("\n监控变化 (共20次处理周期):")
    
    for i in range(20):
        subscription.process()
        values = subscription.output_ports["values"].get_value()
        changed = subscription.output_ports["changed"].get_value()
        change_count = subscription.output_ports["change_count"].get_value()
        
        if changed:
            print(f"  [{i+1}] 数据变化! 总次数: {change_count}, 当前值: {values}")
        
        time.sleep(0.5)
    
    # 停止组件
    subscription.stop()
    client.stop()
    
    print("\n✅ 测试 3 完成")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OPC UA -> MQTT 桥接测试")
    parser.add_argument(
        "--test",
        choices=["read", "mqtt", "subscribe", "all"],
        default="all",
        help="选择测试: read=直接读取, mqtt=MQTT转发, subscribe=订阅模式, all=全部"
    )
    
    args = parser.parse_args()
    
    print("\n" + "#"*60)
    print("  AccuDaq OPC UA -> MQTT 桥接测试")
    print("#"*60)
    
    try:
        if args.test in ["read", "all"]:
            test_opcua_direct_read()
        
        if args.test in ["mqtt", "all"]:
            test_opcua_mqtt_forwarding()
        
        if args.test in ["subscribe", "all"]:
            test_opcua_subscription()
            
    except KeyboardInterrupt:
        print("\n用户中断测试")
    except Exception as e:
        logger.error(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "#"*60)
    print("  所有测试完成!")
    print("#"*60 + "\n")

"""
OPC UA 数据采集器 - 一键启动脚本
类似于 Modbus 模拟器，方便前端通过 WebSocket 接收数据

功能：
    1. 在后台启动 OPC UA 模拟服务器（opc.tcp://localhost:4840）
    2. 连接到该服务器并读取模拟数据
    3. 将数据发布到 MQTT 主题 `opcData`

使用方法：
    python opc_data_collector.py

前端对接：
    在 mqtt.js 中订阅主题 'opcData' 或 'opcua/#'

依赖安装：
    pip install opcua paho-mqtt
"""

import sys
import time
import math
import random
import json
import logging
import argparse
import threading
from datetime import datetime

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============ OPC UA 模拟服务器 ============
class OPCUASimulator:
    """内嵌的 OPC UA 模拟服务器"""
    
    def __init__(self, port: int = 4840):
        self.port = port
        self.endpoint = f"opc.tcp://0.0.0.0:{port}"
        self.server = None
        self.variables = {}
        self.counter = 0
        self.running = False
        self._thread = None
        
    def setup(self):
        """配置服务器"""
        try:
            from opcua import Server, ua
        except ImportError:
            logger.error("请先安装 opcua 库: pip install opcua")
            sys.exit(1)
            
        self.server = Server()
        self.server.set_endpoint(self.endpoint)
        self.server.set_server_name("AccuDaq OPC UA Simulator")
        
        # 允许无加密连接
        self.server.set_security_policy([ua.SecurityPolicyType.NoSecurity])
        
        # 注册命名空间
        uri = "http://accudaq.example.com"
        idx = self.server.register_namespace(uri)
        
        # 创建设备文件夹
        objects = self.server.get_objects_node()
        device_folder = objects.add_folder(idx, "SimulatedDevice")
        
        # 添加模拟变量
        self.variables["Temperature"] = device_folder.add_variable(idx, "Temperature", 25.0)
        self.variables["Temperature"].set_writable()
        
        self.variables["Pressure"] = device_folder.add_variable(idx, "Pressure", 101.325)
        self.variables["Pressure"].set_writable()
        
        self.variables["FlowRate"] = device_folder.add_variable(idx, "FlowRate", 50.0)
        self.variables["FlowRate"].set_writable()
        
        self.variables["Voltage"] = device_folder.add_variable(idx, "Voltage", 220.0)
        self.variables["Voltage"].set_writable()
        
        self.variables["Current"] = device_folder.add_variable(idx, "Current", 5.0)
        self.variables["Current"].set_writable()
        
        self.variables["Counter"] = device_folder.add_variable(idx, "Counter", 0)
        self.variables["Counter"].set_writable()
        
        logger.info(f"OPC UA 服务器配置完成，共 {len(self.variables)} 个变量")
        
    def update_values(self):
        """更新模拟值"""
        self.counter += 1
        t = self.counter * 0.1
        
        # 温度：20-30°C 正弦波 + 噪声
        temp = 25 + 5 * math.sin(t) + random.uniform(-0.5, 0.5)
        self.variables["Temperature"].set_value(round(temp, 2))
        
        # 压力：99-103 kPa
        pressure = 101.325 + 2 * math.sin(t * 0.2) + random.uniform(-0.1, 0.1)
        self.variables["Pressure"].set_value(round(pressure, 3))
        
        # 流量：40-60 L/min
        flow = 50 + random.uniform(-10, 10)
        self.variables["FlowRate"].set_value(round(flow, 1))
        
        # 电压：218-222V
        voltage = 220 + random.uniform(-2, 2)
        self.variables["Voltage"].set_value(round(voltage, 1))
        
        # 电流：3-7A
        current = 5 + 2 * math.sin(t * 0.5)
        self.variables["Current"].set_value(round(current, 2))
        
        # 计数器
        self.variables["Counter"].set_value(self.counter)
        
        return {
            "temperature": round(temp, 2),
            "pressure": round(pressure, 3),
            "flow_rate": round(flow, 1),
            "voltage": round(voltage, 1),
            "current": round(current, 2),
            "counter": self.counter,
        }
        
    def _run_server(self):
        """运行服务器（在线程中）"""
        self.setup()
        self.server.start()
        logger.info(f"OPC UA 模拟服务器已启动: {self.endpoint}")
        
        while self.running:
            time.sleep(1)
            
        self.server.stop()
        logger.info("OPC UA 模拟服务器已停止")
        
    def start(self):
        """启动服务器（后台线程）"""
        self.running = True
        self._thread = threading.Thread(target=self._run_server, daemon=True)
        self._thread.start()
        time.sleep(2)  # 等待服务器启动
        
    def stop(self):
        """停止服务器"""
        self.running = False
        if self._thread:
            self._thread.join(timeout=2)


# ============ MQTT 数据发布器 ============
class MQTTPublisher:
    """MQTT 数据发布器"""
    
    def __init__(self, broker: str = "localhost", port: int = 1883, topic: str = "opcData"):
        self.broker = broker
        self.port = port
        self.topic = topic
        self.client = None
        
    def connect(self):
        """连接到 MQTT Broker"""
        try:
            import paho.mqtt.client as mqtt
        except ImportError:
            logger.error("请先安装 paho-mqtt 库: pip install paho-mqtt")
            sys.exit(1)
            
        self.client = mqtt.Client()
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
        logger.info(f"已连接到 MQTT Broker: {self.broker}:{self.port}")
        
    def publish(self, data: dict):
        """发布数据到 MQTT"""
        if self.client:
            payload = json.dumps(data)
            self.client.publish(self.topic, payload)
            
    def disconnect(self):
        """断开连接"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()


# ============ 主程序 ============
def main():
    parser = argparse.ArgumentParser(description="OPC UA 数据采集器")
    parser.add_argument("--opcua-port", type=int, default=4840, help="OPC UA 服务器端口")
    parser.add_argument("--broker", type=str, default="localhost", help="MQTT Broker 地址")
    parser.add_argument("--mqtt-port", type=int, default=1883, help="MQTT 端口")
    parser.add_argument("--topic", type=str, default="opcUa/data", help="MQTT 主题")
    parser.add_argument("--interval", type=float, default=1.0, help="采集间隔（秒）")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("  AccuDaq OPC UA 数据采集器")
    print("=" * 60)
    print(f"  OPC UA 地址: opc.tcp://localhost:{args.opcua_port}")
    print(f"  MQTT Broker: {args.broker}:{args.mqtt_port}")
    print(f"  MQTT 主题: {args.topic}")
    print(f"  采集间隔: {args.interval} 秒")
    print("=" * 60)
    print("  按 Ctrl+C 停止")
    print("=" * 60 + "\n")
    
    # 启动 OPC UA 模拟服务器
    simulator = OPCUASimulator(port=args.opcua_port)
    simulator.start()
    
    # 连接 MQTT
    publisher = MQTTPublisher(broker=args.broker, port=args.mqtt_port, topic=args.topic)
    publisher.connect()
    
    try:
        message_count = 0
        while True:
            # 更新模拟值并获取数据
            values = simulator.update_values()
            
            # 构造 MQTT 消息
            data = {
                "device": "OPC_UA_Simulator",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "values": values,
                "message_id": message_count,
            }
            
            # 发布到 MQTT
            publisher.publish(data)
            message_count += 1
            
            # 打印日志
            logger.info(f"[{message_count}] 已发布到 '{args.topic}': T={values['temperature']}°C, P={values['pressure']}kPa, F={values['flow_rate']}L/min")
            
            time.sleep(args.interval)
            
    except KeyboardInterrupt:
        logger.info("收到停止信号")
    finally:
        publisher.disconnect()
        simulator.stop()
        print("\n数据采集已停止。")


if __name__ == "__main__":
    main()


import json
import time
import math
import random
import logging
import argparse
from typing import Optional

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("错误: 未安装 'paho-mqtt' 库。请运行 'pip install paho-mqtt' 安装。")
    exit(1)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataSimulator:
    def __init__(self, broker: str, port: int, topic: str):
        self.broker = broker
        self.port = port
        self.topic = topic
        self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        self.running = False

    def connect(self):
        try:
            logger.info(f"正在连接到 MQTT Broker: {self.broker}:{self.port}")
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            logger.info("连接成功")
            return True
        except Exception as e:
            logger.error(f"连接失败: {e}")
            return False

    def start_publishing(self, interval: float = 1.0):
        self.running = True
        logger.info(f"开始向主题 '{self.topic}' 发布模拟数据 (间隔: {interval}秒)")
        
        counter = 0
        try:
            while self.running:
                # 生成模拟数据：正弦波 + 随机噪声
                timestamp = time.time()
                value = 50 + 40 * math.sin(counter * 0.1) + random.uniform(-2, 2)
                
                payload = {
                    "timestamp": timestamp,
                    "value": round(value, 2),
                    "device": "simulated_sensor_01",
                    "status": "ok"
                }

                # 发布消息
                json_payload = json.dumps(payload)
                self.client.publish(self.topic, json_payload)
                logger.info(f"发布: {json_payload}")

                counter += 1
                time.sleep(interval)
                
        except KeyboardInterrupt:
            logger.info("用户停止发布")
        finally:
            self.stop()

    def stop(self):
        self.running = False
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("已断开连接")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MQTT 数据模拟生成器")
    parser.add_argument("--broker", default="192.168.1.9", help="MQTT Broker IP 地址 (默认: 192.168.1.9)")
    parser.add_argument("--port", type=int, default=1883, help="MQTT Broker 端口 (默认: 1883)")
    parser.add_argument("--topic", default="sensor/sine_wave", help="发布数据的主题 (默认: sensor/sine_wave)")
    parser.add_argument("--interval", type=float, default=1.0, help="数据发布间隔秒数 (默认: 1.0)")

    args = parser.parse_args()

    simulator = DataSimulator(args.broker, args.port, args.topic)
    
    if simulator.connect():
        simulator.start_publishing(args.interval)

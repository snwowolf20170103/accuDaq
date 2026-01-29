"""
Modbus to MQTT 桥接器
从 Modbus 设备读取数据，推送到 MQTT Broker
"""

import argparse
import json
import time
import logging
import signal
import sys

try:
    from pymodbus.client import ModbusTcpClient
    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

running = True

def signal_handler(sig, frame):
    global running
    logger.info("\n正在停止...")
    running = False

def main():
    global running
    
    parser = argparse.ArgumentParser(description='Modbus to MQTT 桥接器')
    parser.add_argument('--modbus-host', default='127.0.0.1', help='Modbus 服务器地址')
    parser.add_argument('--modbus-port', type=int, default=5020, help='Modbus 服务器端口')
    parser.add_argument('--mqtt-broker', default='127.0.0.1', help='MQTT Broker 地址')
    parser.add_argument('--mqtt-port', type=int, default=1883, help='MQTT Broker 端口')
    parser.add_argument('--mqtt-topic', default='modbus/data', help='MQTT 主题')
    parser.add_argument('--interval', type=float, default=1.0, help='轮询间隔(秒)')
    parser.add_argument('--register-address', type=int, default=0, help='起始寄存器地址')
    parser.add_argument('--register-count', type=int, default=6, help='读取寄存器数量')
    args = parser.parse_args()
    
    if not MODBUS_AVAILABLE:
        logger.error("pymodbus 未安装，请运行: pip install pymodbus>=3.0.0")
        sys.exit(1)
    
    if not MQTT_AVAILABLE:
        logger.error("paho-mqtt 未安装，请运行: pip install paho-mqtt")
        sys.exit(1)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("=" * 60)
    logger.info("Modbus to MQTT 桥接器")
    logger.info("=" * 60)
    logger.info(f"Modbus 设备: {args.modbus_host}:{args.modbus_port}")
    logger.info(f"MQTT Broker: {args.mqtt_broker}:{args.mqtt_port}")
    logger.info(f"MQTT Topic:  {args.mqtt_topic}")
    logger.info(f"轮询间隔:    {args.interval} 秒")
    logger.info("=" * 60)
    
    # 连接 Modbus
    modbus_client = ModbusTcpClient(host=args.modbus_host, port=args.modbus_port)
    if not modbus_client.connect():
        logger.error(f"无法连接到 Modbus 设备: {args.modbus_host}:{args.modbus_port}")
        sys.exit(1)
    logger.info("✅ Modbus 连接成功")
    
    # 连接 MQTT
    mqtt_client = mqtt.Client(
        client_id="modbus_bridge",
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2
    )
    try:
        mqtt_client.connect(args.mqtt_broker, args.mqtt_port, keepalive=60)
        mqtt_client.loop_start()
        logger.info("✅ MQTT 连接成功")
    except Exception as e:
        logger.error(f"无法连接到 MQTT Broker: {e}")
        sys.exit(1)
    
    logger.info("")
    logger.info("开始数据采集和推送...")
    logger.info(f"验证命令: mosquitto_sub -h {args.mqtt_broker} -p {args.mqtt_port} -t \"{args.mqtt_topic}\" -v")
    logger.info("")
    
    labels = ["温度(°C)", "湿度(%)", "压力(kPa)", "电压(V)", "电流(A)", "计数器"]
    tick = 0
    
    while running:
        try:
            # 读取 Modbus 寄存器
            result = modbus_client.read_holding_registers(
                address=args.register_address,
                count=args.register_count
            )
            
            if result and not result.isError():
                values = result.registers
                
                # 构建数据对象
                data = {
                    "timestamp": time.time(),
                    "host": args.modbus_host,
                    "values": values,
                    "labels": {str(i): labels[i] if i < len(labels) else f"reg_{i}" for i in range(len(values))}
                }
                
                # 推送到 MQTT
                payload = json.dumps(data)
                mqtt_client.publish(args.mqtt_topic, payload, qos=0)
                
                # 打印日志
                if tick % 5 == 0:
                    readable = ", ".join([f"{labels[i]}={values[i]}" for i in range(min(len(values), len(labels)))])
                    logger.info(f"推送数据: {readable}")
                
                tick += 1
            else:
                logger.warning(f"Modbus 读取失败: {result}")
            
            time.sleep(args.interval)
            
        except Exception as e:
            logger.error(f"错误: {e}")
            time.sleep(1)
    
    # 清理
    modbus_client.close()
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    logger.info("已停止")


if __name__ == "__main__":
    main()

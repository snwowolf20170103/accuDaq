"""
Modbus TCP 客户端组件 (增强版)
功能：
  - 读取 Modbus TCP 设备的保持寄存器
  - 轮询模式：按设定间隔自动读取
  - MQTT 推送：将数据转发到 MQTT Broker
"""

import json
import time
import logging
import threading
from typing import Optional, Any, Dict, List

from .base import ComponentBase, PortType, ComponentRegistry, ComponentType

logger = logging.getLogger(__name__)

try:
    from pymodbus.client import ModbusTcpClient
    from pymodbus.exceptions import ModbusException
    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False
    ModbusTcpClient = None
    ModbusException = Exception

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False
    mqtt = None


@ComponentRegistry.register('ModbusTCPClient')
class ModbusTCPClientComponent(ComponentBase):
    """
    Modbus TCP 客户端组件 (增强版)

    配置参数:
        host: str - Modbus 服务器地址（默认: '127.0.0.1'）
        port: int - Modbus 服务器端口（默认: 502）
        slave_id: int - 从站 ID（默认: 1）
        register_address: int - 起始寄存器地址（默认: 0）
        register_count: int - 读取寄存器数量（默认: 6）
        register_type: str - 寄存器类型 ('holding', 'input')
        data_type: str - 数据类型 ('uint16', 'int16', 'float32')
        poll_interval_ms: int - 轮询间隔（毫秒，默认: 1000）
        auto_reconnect: bool - 是否自动重连（默认: True）
        
        # MQTT 推送配置
        mqtt_enabled: bool - 是否启用 MQTT 推送（默认: False）
        mqtt_broker: str - MQTT Broker 地址（默认: 'localhost'）
        mqtt_port: int - MQTT Broker 端口（默认: 1883）
        mqtt_topic: str - MQTT 主题（默认: 'modbus/data'）

    输出端口:
        value: NUMBER - 第一个寄存器的值
        values: ARRAY - 所有寄存器的值数组
        data: OBJECT - 完整数据对象 (包含时间戳)
        connected: BOOLEAN - 连接状态
        error: STRING - 错误信息
    """

    component_name = "ModbusTCPClient"
    component_type = ComponentType.DEVICE
    component_description = "Modbus TCP 客户端，支持轮询和 MQTT 推送"
    component_icon = "🏭"

    def __init__(self, instance_id: Optional[str] = None):
        self._client: Optional[Any] = None
        self._mqtt_client: Optional[Any] = None
        self._poll_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_connected = False
        self._reconnect_count = 0
        super().__init__(instance_id)

    def _setup_ports(self):
        """设置端口"""
        # 输入端口 (用于写入)
        self.add_input_port("write_value", PortType.NUMBER, "要写入的值")
        self.add_input_port("write_trigger", PortType.BOOLEAN, "写入触发")
        
        # 输出端口
        self.add_output_port("value", PortType.NUMBER, "第一个寄存器值")
        self.add_output_port("values", PortType.ARRAY, "所有寄存器值")
        self.add_output_port("data", PortType.OBJECT, "完整数据对象")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        """配置默认值"""
        # Modbus 连接配置
        self.config.setdefault("host", "127.0.0.1")
        self.config.setdefault("port", 502)
        self.config.setdefault("slave_id", 1)
        self.config.setdefault("register_address", 0)
        self.config.setdefault("register_count", 6)
        self.config.setdefault("register_type", "holding")
        self.config.setdefault("data_type", "uint16")
        self.config.setdefault("poll_interval_ms", 1000)
        self.config.setdefault("auto_reconnect", True)
        self.config.setdefault("timeout", 3)
        
        # MQTT 推送配置
        self.config.setdefault("mqtt_enabled", False)
        self.config.setdefault("mqtt_broker", "localhost")
        self.config.setdefault("mqtt_port", 1883)
        self.config.setdefault("mqtt_topic", "modbus/data")

    def start(self):
        """启动组件"""
        super().start()
        
        if not MODBUS_AVAILABLE:
            error_msg = "pymodbus 未安装。请运行: pip install pymodbus>=3.0.0"
            logger.error(error_msg)
            self.set_output("error", error_msg)
            self.set_output("connected", False)
            return
        
        # 连接 MQTT (如果启用)
        if self.config.get("mqtt_enabled") and MQTT_AVAILABLE:
            self._setup_mqtt()
        
        # 连接 Modbus
        self._connect()
        
        # 启动轮询线程
        self._stop_event.clear()
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()
        
        logger.info(f"ModbusTCPClient ({self.instance_id}) 已启动")

    def stop(self):
        """停止组件"""
        self._stop_event.set()
        
        if self._poll_thread and self._poll_thread.is_alive():
            self._poll_thread.join(timeout=2)
        
        if self._client:
            try:
                self._client.close()
                logger.info(f"ModbusTCPClient ({self.instance_id}) 连接已关闭")
            except Exception as e:
                logger.error(f"关闭 Modbus 连接失败: {e}")
        
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        
        self._client = None
        self._mqtt_client = None
        self._is_connected = False
        super().stop()

    def _connect(self) -> bool:
        """连接 Modbus 服务器"""
        try:
            self._client = ModbusTcpClient(
                host=self.config["host"],
                port=self.config["port"],
                timeout=self.config["timeout"]
            )
            
            if self._client.connect():
                self._is_connected = True
                self._reconnect_count = 0
                self.set_output("connected", True)
                self.set_output("error", "")
                logger.info(f"已连接到 Modbus 服务器: {self.config['host']}:{self.config['port']}")
                return True
            else:
                self._is_connected = False
                self.set_output("connected", False)
                self.set_output("error", "连接失败")
                return False
                
        except Exception as e:
            logger.error(f"Modbus 连接错误: {e}")
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            return False

    def _setup_mqtt(self):
        """设置 MQTT 连接"""
        if not MQTT_AVAILABLE:
            logger.warning("paho-mqtt 未安装，MQTT 推送功能不可用")
            return
        
        try:
            client_id = f"modbus_client_{self.instance_id}"
            self._mqtt_client = mqtt.Client(
                client_id=client_id,
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2
            )
            self._mqtt_client.connect(
                self.config["mqtt_broker"],
                self.config["mqtt_port"],
                keepalive=60
            )
            self._mqtt_client.loop_start()
            logger.info(f"MQTT 已连接: {self.config['mqtt_broker']}:{self.config['mqtt_port']}")
        except Exception as e:
            logger.error(f"MQTT 连接失败: {e}")
            self._mqtt_client = None

    def _read_registers(self) -> Optional[List[int]]:
        """读取寄存器"""
        if not self._client or not self._is_connected:
            return None
        
        try:
            slave_id = self.config["slave_id"]
            address = self.config["register_address"]
            count = self.config["register_count"]
            reg_type = self.config["register_type"]
            
            if reg_type == "holding":
                result = self._client.read_holding_registers(
                    address=address, count=count, device_id=slave_id
                )
            else:  # input
                result = self._client.read_input_registers(
                    address=address, count=count, device_id=slave_id
                )
            
            if result and not result.isError():
                return result.registers
            else:
                error_msg = str(result) if result else "读取失败"
                logger.error(f"Modbus 读取错误: {error_msg}")
                self.set_output("error", error_msg)
                return None
                
        except Exception as e:
            logger.error(f"Modbus 读取异常: {e}")
            self.set_output("error", str(e))
            self._is_connected = False
            self.set_output("connected", False)
            return None

    def _parse_values(self, registers: List[int]) -> Dict[str, Any]:
        """解析寄存器值并构建数据对象"""
        data_type = self.config.get("data_type", "uint16")
        
        parsed_values = []
        for i, reg in enumerate(registers):
            if data_type == "uint16":
                parsed_values.append(reg)
            elif data_type == "int16":
                parsed_values.append(reg if reg < 32768 else reg - 65536)
            else:
                parsed_values.append(reg)
        
        # 构建完整数据对象
        data = {
            "timestamp": time.time(),
            "host": self.config["host"],
            "slave_id": self.config["slave_id"],
            "register_address": self.config["register_address"],
            "values": parsed_values,
            "labels": {
                "0": "温度",
                "1": "湿度",
                "2": "压力",
                "3": "电压",
                "4": "电流",
                "5": "计数器"
            }
        }
        
        return data

    def _publish_to_mqtt(self, data: Dict[str, Any]):
        """将数据推送到 MQTT"""
        if not self._mqtt_client:
            return
        
        try:
            payload = json.dumps(data)
            self._mqtt_client.publish(
                self.config["mqtt_topic"],
                payload,
                qos=0
            )
            logger.debug(f"MQTT 推送: {self.config['mqtt_topic']}")
        except Exception as e:
            logger.error(f"MQTT 推送失败: {e}")

    def _poll_loop(self):
        """轮询读取循环"""
        poll_interval = self.config.get("poll_interval_ms", 1000) / 1000.0
        
        while not self._stop_event.is_set():
            try:
                # 检查连接状态
                if not self._is_connected:
                    if self.config.get("auto_reconnect", True):
                        self._reconnect_count += 1
                        logger.info(f"尝试重连 (第 {self._reconnect_count} 次)...")
                        time.sleep(min(self._reconnect_count * 2, 30))  # 指数退避
                        self._connect()
                    else:
                        self._stop_event.wait(1)
                    continue
                
                # 读取寄存器
                registers = self._read_registers()
                
                if registers:
                    # 解析数据
                    data = self._parse_values(registers)
                    
                    # 输出到端口
                    self.set_output("value", data["values"][0] if data["values"] else 0)
                    self.set_output("values", data["values"])
                    self.set_output("data", data)
                    self.set_output("connected", True)
                    
                    # 推送到 MQTT
                    if self.config.get("mqtt_enabled"):
                        self._publish_to_mqtt(data)
                
                # 等待下一次轮询
                self._stop_event.wait(poll_interval)
                
            except Exception as e:
                logger.error(f"轮询循环异常: {e}")
                self._is_connected = False
                self.set_output("connected", False)
                self._stop_event.wait(1)

    def process(self):
        """处理写入请求"""
        if not self._is_running:
            return
        
        trigger = self.get_input("write_trigger")
        if trigger:
            write_value = self.get_input("write_value")
            if write_value is not None and self._client and self._is_connected:
                try:
                    address = self.config["register_address"]
                    slave_id = self.config["slave_id"]
                    result = self._client.write_register(
                        address=address,
                        value=int(write_value),
                        slave=slave_id
                    )
                    if result and not result.isError():
                        logger.info(f"写入成功: 地址={address}, 值={write_value}")
                    else:
                        logger.error(f"写入失败: {result}")
                except Exception as e:
                    logger.error(f"写入异常: {e}")


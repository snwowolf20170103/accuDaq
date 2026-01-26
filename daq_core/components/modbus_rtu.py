"""
Modbus RTU 组件
通过串口使用 Modbus RTU 协议通信
"""

import logging
import threading
import time
from typing import Any, Dict, Optional

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)

# 尝试导入依赖
try:
    from pymodbus.client import ModbusSerialClient
    from pymodbus.exceptions import ModbusException
    MODBUS_RTU_AVAILABLE = True
except ImportError:
    MODBUS_RTU_AVAILABLE = False
    ModbusSerialClient = None
    ModbusException = Exception


@ComponentRegistry.register
class ModbusRTUComponent(ComponentBase):
    """
    Modbus RTU 客户端组件
    
    功能：
    - 通过串口连接 Modbus RTU 从站
    - 读取/写入保持寄存器、输入寄存器、线圈等
    - 支持自动重连
    
    配置参数：
        port: str - 串口名称（如 COM1, /dev/ttyUSB0）
        baudrate: int - 波特率（默认 9600）
        parity: str - 校验位（N/E/O，默认 N）
        stopbits: int - 停止位（1/2，默认 1）
        bytesize: int - 数据位（7/8，默认 8）
        slave_id: int - 从站地址（默认 1）
        register_address: int - 起始寄存器地址
        register_count: int - 读取寄存器数量
        register_type: str - 寄存器类型（holding/input/coil/discrete）
        poll_interval_ms: int - 轮询间隔（毫秒）
        auto_reconnect: bool - 是否自动重连
    """
    
    component_type = ComponentType.DEVICE
    component_name = "ModbusRTU"
    component_description = "Modbus RTU 串口通信组件"
    component_icon = "🏭"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._client: Optional[Any] = None
        self._poll_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_connected = False
        self._reconnect_count = 0

    def _setup_ports(self):
        """设置输入输出端口"""
        # 输入端口
        self.add_input_port("write_value", PortType.NUMBER, "要写入的值")
        self.add_input_port("write_trigger", PortType.BOOLEAN, "写入触发信号")
        self.add_input_port("write_address", PortType.NUMBER, "写入寄存器地址")
        
        # 输出端口
        self.add_output_port("value", PortType.NUMBER, "读取到的值")
        self.add_output_port("values", PortType.ARRAY, "读取到的值数组")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("error", PortType.STRING, "错误信息")
        self.add_output_port("last_update", PortType.NUMBER, "最后更新时间戳")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("port", "COM1")
        self.config.setdefault("baudrate", 9600)
        self.config.setdefault("parity", "N")
        self.config.setdefault("stopbits", 1)
        self.config.setdefault("bytesize", 8)
        self.config.setdefault("slave_id", 1)
        self.config.setdefault("register_address", 0)
        self.config.setdefault("register_count", 1)
        self.config.setdefault("register_type", "holding")  # holding, input, coil, discrete
        self.config.setdefault("data_type", "uint16")  # uint16, int16, float32
        self.config.setdefault("poll_interval_ms", 1000)
        self.config.setdefault("auto_reconnect", True)
        self.config.setdefault("reconnect_interval", 3)
        self.config.setdefault("timeout", 1)

    def start(self):
        """启动组件"""
        super().start()
        
        if not MODBUS_RTU_AVAILABLE:
            logger.error("pymodbus not installed. Install with: pip install pymodbus>=3.0.0")
            self.set_output("error", "pymodbus not installed")
            self.set_output("connected", False)
            return
        
        self._connect()
        
        # 启动轮询线程
        self._stop_event.clear()
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._poll_thread.start()

    def stop(self):
        """停止组件"""
        self._stop_event.set()
        if self._poll_thread and self._poll_thread.is_alive():
            self._poll_thread.join(timeout=2)
        
        if self._client:
            try:
                self._client.close()
                logger.info(f"ModbusRTU ({self.instance_id}) 连接已关闭")
            except Exception as e:
                logger.error(f"关闭 Modbus RTU 连接失败: {e}")
        
        self._client = None
        self._is_connected = False
        super().stop()

    def _connect(self) -> bool:
        """连接 Modbus RTU"""
        if not MODBUS_RTU_AVAILABLE:
            return False
        
        try:
            parity_map = {'N': 'N', 'E': 'E', 'O': 'O'}
            
            self._client = ModbusSerialClient(
                port=self.config["port"],
                baudrate=self.config["baudrate"],
                parity=parity_map.get(self.config["parity"], 'N'),
                stopbits=self.config["stopbits"],
                bytesize=self.config["bytesize"],
                timeout=self.config["timeout"]
            )
            
            if self._client.connect():
                self._is_connected = True
                self.set_output("connected", True)
                self.set_output("error", "")
                self._reconnect_count = 0
                logger.info(f"ModbusRTU ({self.instance_id}) 连接成功: {self.config['port']}")
                return True
            else:
                self._is_connected = False
                self.set_output("connected", False)
                self.set_output("error", "连接失败")
                return False
                
        except Exception as e:
            logger.error(f"Modbus RTU 连接失败: {e}")
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            return False

    def _reconnect(self):
        """重连逻辑"""
        if not self.config.get("auto_reconnect", True):
            return
        
        self._reconnect_count += 1
        interval = self.config.get("reconnect_interval", 3)
        
        logger.info(f"ModbusRTU ({self.instance_id}) 尝试重连 (第 {self._reconnect_count} 次)")
        
        if self._client:
            try:
                self._client.close()
            except:
                pass
        
        time.sleep(interval)
        self._connect()

    def _read_registers(self):
        """读取寄存器"""
        if not self._client or not self._is_connected:
            return None
        
        try:
            slave_id = self.config["slave_id"]
            address = self.config["register_address"]
            count = self.config["register_count"]
            reg_type = self.config["register_type"]
            
            result = None
            if reg_type == "holding":
                result = self._client.read_holding_registers(
                    address=address, count=count, slave=slave_id
                )
            elif reg_type == "input":
                result = self._client.read_input_registers(
                    address=address, count=count, slave=slave_id
                )
            elif reg_type == "coil":
                result = self._client.read_coils(
                    address=address, count=count, slave=slave_id
                )
            elif reg_type == "discrete":
                result = self._client.read_discrete_inputs(
                    address=address, count=count, slave=slave_id
                )
            
            if result and not result.isError():
                if reg_type in ["holding", "input"]:
                    values = result.registers
                else:
                    values = result.bits[:count]
                
                self.set_output("values", values)
                self.set_output("last_update", time.time())
                
                # 解析第一个值
                if values:
                    parsed_value = self._parse_value(values)
                    self.set_output("value", parsed_value)
                
                return values
            else:
                error_msg = str(result) if result else "Unknown error"
                logger.error(f"Modbus RTU 读取失败: {error_msg}")
                self.set_output("error", error_msg)
                return None
                
        except Exception as e:
            logger.error(f"Modbus RTU 读取异常: {e}")
            self.set_output("error", str(e))
            self._is_connected = False
            self.set_output("connected", False)
            return None

    def _parse_value(self, registers):
        """解析寄存器值"""
        if not registers:
            return 0
        
        data_type = self.config.get("data_type", "uint16")
        
        if data_type == "uint16":
            return registers[0]
        elif data_type == "int16":
            value = registers[0]
            return value if value < 32768 else value - 65536
        elif data_type == "float32" and len(registers) >= 2:
            import struct
            bytes_data = struct.pack('>HH', registers[0], registers[1])
            return struct.unpack('>f', bytes_data)[0]
        else:
            return registers[0]

    def _write_register(self, address: int, value: int) -> bool:
        """写入单个寄存器"""
        if not self._client or not self._is_connected:
            return False
        
        try:
            slave_id = self.config["slave_id"]
            reg_type = self.config["register_type"]
            
            if reg_type in ["holding"]:
                result = self._client.write_register(
                    address=address, value=value, slave=slave_id
                )
            elif reg_type == "coil":
                result = self._client.write_coil(
                    address=address, value=bool(value), slave=slave_id
                )
            else:
                logger.warning(f"寄存器类型 {reg_type} 不支持写入")
                return False
            
            if result and not result.isError():
                logger.debug(f"ModbusRTU 写入成功: 地址={address}, 值={value}")
                return True
            else:
                error_msg = str(result) if result else "Unknown error"
                logger.error(f"Modbus RTU 写入失败: {error_msg}")
                self.set_output("error", error_msg)
                return False
                
        except Exception as e:
            logger.error(f"Modbus RTU 写入异常: {e}")
            self.set_output("error", str(e))
            return False

    def _poll_loop(self):
        """轮询读取循环"""
        poll_interval = self.config.get("poll_interval_ms", 1000) / 1000.0
        
        while not self._stop_event.is_set():
            try:
                if not self._is_connected:
                    if self.config.get("auto_reconnect", True):
                        self._reconnect()
                    else:
                        self._stop_event.wait(1)
                    continue
                
                # 读取寄存器
                self._read_registers()
                
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
        
        # 检查写入触发
        trigger = self.get_input("write_trigger")
        if trigger:
            write_value = self.get_input("write_value")
            write_address = self.get_input("write_address")
            
            if write_value is not None:
                address = int(write_address) if write_address else self.config["register_address"]
                self._write_register(address, int(write_value))

    def destroy(self):
        """销毁组件"""
        self.stop()
        super().destroy()

"""
Modbus TCP 客户端组件
功能：读取 Modbus TCP 设备的保持寄存器
"""

from .base import ComponentBase, PortType, ComponentRegistry, ComponentType

try:
    from pymodbus.client import ModbusTcpClient
    from pymodbus.exceptions import ModbusException
    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False
    ModbusTcpClient = None
    ModbusException = Exception


@ComponentRegistry.register('ModbusClient')
class ModbusClientComponent(ComponentBase):
    """
    Modbus TCP 客户端组件

    配置参数:
        host: str - Modbus 服务器地址（默认: '127.0.0.1'）
        port: int - Modbus 服务器端口（默认: 502）
        register: int - 寄存器地址（默认: 0）
        count: int - 读取寄存器数量（默认: 1）
        slave_id: int - 从站 ID（默认: 1）
        data_type: str - 数据类型 ('uint16', 'int16', 'float32')

    输出端口:
        value: NUMBER - 读取到的值
        connected: BOOLEAN - 连接状态
    """

    component_name = "ModbusClient"
    component_type = ComponentType.DEVICE

    def _setup_ports(self):
        """设置端口"""
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("connected", PortType.BOOLEAN)

    def configure(self):
        """配置组件"""
        super().configure()

        if not MODBUS_AVAILABLE:
            self.logger.error(
                "pymodbus not installed. Install with: pip install pymodbus>=3.0.0"
            )
            self.client = None
            return

        self.host = self.config.get("host", "127.0.0.1")
        self.port = self.config.get("port", 502)
        self.register = self.config.get("register", 0)
        self.count = self.config.get("count", 1)
        self.slave_id = self.config.get("slave_id", 1)
        self.data_type = self.config.get("data_type", "uint16")

        self.client = None
        self.is_connected = False

    def start(self):
        """启动组件并连接到 Modbus 服务器"""
        super().start()

        if not MODBUS_AVAILABLE:
            self.logger.error("Modbus client not available")
            return

        try:
            self.client = ModbusTcpClient(host=self.host, port=self.port)
            connection = self.client.connect()

            if connection:
                self.is_connected = True
                self.logger.info(f"Connected to Modbus server at {self.host}:{self.port}")
            else:
                self.is_connected = False
                self.logger.error(f"Failed to connect to Modbus server at {self.host}:{self.port}")

        except Exception as e:
            self.is_connected = False
            self.logger.error(f"Modbus connection error: {e}")

    def stop(self):
        """停止组件并断开连接"""
        if self.client and self.is_connected:
            try:
                self.client.close()
                self.logger.info("Modbus connection closed")
            except Exception as e:
                self.logger.error(f"Error closing Modbus connection: {e}")

        self.is_connected = False
        super().stop()

    def process(self):
        """处理逻辑：读取 Modbus 寄存器"""
        if not self.client or not self.is_connected:
            self.set_output("connected", False)
            return

        try:
            # 读取保持寄存器
            result = self.client.read_holding_registers(
                address=self.register,
                count=self.count,
                slave=self.slave_id
            )

            if result.isError():
                self.logger.error(f"Modbus read error: {result}")
                self.set_output("connected", False)
                return

            # 解析数据
            value = self._parse_value(result.registers)

            # 输出数据
            self.set_output("value", value)
            self.set_output("connected", True)

        except ModbusException as e:
            self.logger.error(f"Modbus exception: {e}")
            self.set_output("connected", False)
        except Exception as e:
            self.logger.error(f"Unexpected error reading Modbus: {e}")
            self.set_output("connected", False)

    def _parse_value(self, registers):
        """解析寄存器值"""
        if not registers:
            return 0

        if self.data_type == "uint16":
            return registers[0]
        elif self.data_type == "int16":
            # 转换为有符号整数
            value = registers[0]
            return value if value < 32768 else value - 65536
        elif self.data_type == "float32" and len(registers) >= 2:
            # 合并两个寄存器为 float32
            import struct
            bytes_data = struct.pack('>HH', registers[0], registers[1])
            return struct.unpack('>f', bytes_data)[0]
        else:
            return registers[0]

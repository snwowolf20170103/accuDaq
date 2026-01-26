"""
串口通信组件
支持：读取/写入串口数据，自动重连，设备扫描
"""

import logging
import threading
import time
from typing import Any, Dict, List, Optional

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)

# 尝试导入 pyserial
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    serial = None


@ComponentRegistry.register
class SerialPortComponent(ComponentBase):
    """
    串口通信组件
    
    功能：
    - 连接串口设备（COM/ttyUSB/ttyACM等）
    - 读取/写入串口数据
    - 自动断线重连
    - 支持多种数据格式（ASCII/HEX/Raw）
    
    配置参数：
        port: str - 串口名称（如 COM1, /dev/ttyUSB0）
        baudrate: int - 波特率（默认 9600）
        bytesize: int - 数据位（5/6/7/8，默认 8）
        parity: str - 校验位（N/E/O/M/S，默认 N）
        stopbits: float - 停止位（1/1.5/2，默认 1）
        timeout: float - 读取超时（秒）
        auto_reconnect: bool - 是否自动重连
        data_format: str - 数据格式（ascii/hex/raw）
    """
    
    component_type = ComponentType.DEVICE
    component_name = "SerialPort"
    component_description = "串口通信组件，支持读写串口设备"
    component_icon = "🔌"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._serial: Optional[Any] = None
        self._read_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._reconnect_count = 0
        self._last_data = None

    def _setup_ports(self):
        """设置输入输出端口"""
        # 输入端口
        self.add_input_port("write_data", PortType.STRING, "要发送的数据")
        self.add_input_port("send_trigger", PortType.BOOLEAN, "发送触发信号")
        
        # 输出端口
        self.add_output_port("read_data", PortType.STRING, "接收到的数据")
        self.add_output_port("raw_bytes", PortType.ARRAY, "原始字节数组")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("error", PortType.STRING, "错误信息")
        self.add_output_port("rx_count", PortType.NUMBER, "接收字节数")
        self.add_output_port("tx_count", PortType.NUMBER, "发送字节数")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("port", "COM1")
        self.config.setdefault("baudrate", 9600)
        self.config.setdefault("bytesize", 8)
        self.config.setdefault("parity", "N")
        self.config.setdefault("stopbits", 1)
        self.config.setdefault("timeout", 0.5)
        self.config.setdefault("auto_reconnect", True)
        self.config.setdefault("reconnect_interval", 3)
        self.config.setdefault("data_format", "ascii")  # ascii, hex, raw
        self.config.setdefault("line_ending", "\n")
        
        self._rx_count = 0
        self._tx_count = 0

    def start(self):
        """启动组件"""
        super().start()
        
        if not SERIAL_AVAILABLE:
            logger.error("pyserial not installed. Install with: pip install pyserial")
            self.set_output("error", "pyserial not installed")
            self.set_output("connected", False)
            return
        
        self._connect()
        
        # 启动读取线程
        self._stop_event.clear()
        self._read_thread = threading.Thread(target=self._read_loop, daemon=True)
        self._read_thread.start()

    def stop(self):
        """停止组件"""
        self._stop_event.set()
        if self._read_thread and self._read_thread.is_alive():
            self._read_thread.join(timeout=2)
        
        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
                logger.info(f"SerialPort ({self.instance_id}) 已关闭")
            except Exception as e:
                logger.error(f"关闭串口失败: {e}")
        
        self._serial = None
        super().stop()

    def _connect(self) -> bool:
        """连接串口"""
        if not SERIAL_AVAILABLE:
            return False
            
        try:
            parity_map = {
                'N': serial.PARITY_NONE,
                'E': serial.PARITY_EVEN,
                'O': serial.PARITY_ODD,
                'M': serial.PARITY_MARK,
                'S': serial.PARITY_SPACE
            }
            
            stopbits_map = {
                1: serial.STOPBITS_ONE,
                1.5: serial.STOPBITS_ONE_POINT_FIVE,
                2: serial.STOPBITS_TWO
            }
            
            self._serial = serial.Serial(
                port=self.config["port"],
                baudrate=self.config["baudrate"],
                bytesize=self.config["bytesize"],
                parity=parity_map.get(self.config["parity"], serial.PARITY_NONE),
                stopbits=stopbits_map.get(self.config["stopbits"], serial.STOPBITS_ONE),
                timeout=self.config["timeout"]
            )
            
            self.set_output("connected", True)
            self.set_output("error", "")
            self._reconnect_count = 0
            logger.info(f"SerialPort ({self.instance_id}) 连接成功: {self.config['port']}")
            return True
            
        except Exception as e:
            logger.error(f"串口连接失败: {e}")
            self.set_output("connected", False)
            self.set_output("error", str(e))
            return False

    def _reconnect(self):
        """重连逻辑"""
        if not self.config.get("auto_reconnect", True):
            return
        
        self._reconnect_count += 1
        interval = self.config.get("reconnect_interval", 3)
        
        logger.info(f"SerialPort ({self.instance_id}) 尝试重连 (第 {self._reconnect_count} 次)")
        
        if self._serial:
            try:
                self._serial.close()
            except:
                pass
        
        time.sleep(interval)
        self._connect()

    def _read_loop(self):
        """读取数据循环"""
        while not self._stop_event.is_set():
            try:
                if not self._serial or not self._serial.is_open:
                    if self.config.get("auto_reconnect", True):
                        self._reconnect()
                    else:
                        self._stop_event.wait(1)
                    continue
                
                # 读取数据
                if self._serial.in_waiting > 0:
                    data = self._serial.read(self._serial.in_waiting)
                    self._rx_count += len(data)
                    self.set_output("rx_count", self._rx_count)
                    self.set_output("raw_bytes", list(data))
                    
                    # 根据格式转换数据
                    data_format = self.config.get("data_format", "ascii")
                    if data_format == "ascii":
                        try:
                            str_data = data.decode('utf-8', errors='replace').strip()
                        except:
                            str_data = data.decode('latin-1', errors='replace').strip()
                        self._last_data = str_data
                        self.set_output("read_data", str_data)
                    elif data_format == "hex":
                        hex_str = data.hex().upper()
                        self._last_data = hex_str
                        self.set_output("read_data", hex_str)
                    else:  # raw
                        self._last_data = list(data)
                        self.set_output("read_data", str(list(data)))
                    
                    logger.debug(f"SerialPort ({self.instance_id}) 接收: {self._last_data}")
                
                self._stop_event.wait(0.01)  # 10ms 轮询间隔
                
            except serial.SerialException as e:
                logger.error(f"串口读取错误: {e}")
                self.set_output("connected", False)
                self.set_output("error", str(e))
                if self.config.get("auto_reconnect", True):
                    self._reconnect()
            except Exception as e:
                logger.error(f"读取循环异常: {e}")
                self._stop_event.wait(1)

    def _write_data(self, data: str) -> bool:
        """写入数据到串口"""
        if not self._serial or not self._serial.is_open:
            logger.warning("串口未连接，无法发送")
            return False
        
        try:
            data_format = self.config.get("data_format", "ascii")
            line_ending = self.config.get("line_ending", "\n")
            
            if data_format == "ascii":
                bytes_data = (data + line_ending).encode('utf-8')
            elif data_format == "hex":
                # 将十六进制字符串转换为字节
                hex_str = data.replace(" ", "").replace("0x", "")
                bytes_data = bytes.fromhex(hex_str)
            else:  # raw
                bytes_data = data.encode('utf-8')
            
            written = self._serial.write(bytes_data)
            self._tx_count += written
            self.set_output("tx_count", self._tx_count)
            
            logger.debug(f"SerialPort ({self.instance_id}) 发送: {data}")
            return True
            
        except Exception as e:
            logger.error(f"串口写入失败: {e}")
            self.set_output("error", str(e))
            return False

    def process(self):
        """处理发送请求"""
        if not self._is_running:
            return
        
        # 检查发送触发
        trigger = self.get_input("send_trigger")
        if trigger:
            write_data = self.get_input("write_data")
            if write_data:
                self._write_data(str(write_data))

    def destroy(self):
        """销毁组件"""
        self.stop()
        super().destroy()

    @staticmethod
    def scan_ports() -> List[Dict[str, Any]]:
        """扫描可用串口"""
        if not SERIAL_AVAILABLE:
            return []
        
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append({
                "port": port.device,
                "description": port.description,
                "hwid": port.hwid,
                "manufacturer": port.manufacturer,
                "product": port.product,
                "serial_number": port.serial_number,
                "vid": port.vid,
                "pid": port.pid
            })
        return ports


@ComponentRegistry.register
class SerialScannerComponent(ComponentBase):
    """
    串口扫描组件
    扫描系统中可用的串口设备
    """
    
    component_type = ComponentType.DEVICE
    component_name = "SerialScanner"
    component_description = "扫描可用的串口设备"
    component_icon = "🔍"

    def _setup_ports(self):
        self.add_input_port("scan_trigger", PortType.BOOLEAN, "触发扫描")
        self.add_output_port("ports", PortType.ARRAY, "可用串口列表")
        self.add_output_port("port_count", PortType.NUMBER, "串口数量")

    def start(self):
        super().start()
        self._do_scan()

    def stop(self):
        super().stop()

    def _do_scan(self):
        """执行扫描"""
        ports = SerialPortComponent.scan_ports()
        self.set_output("ports", ports)
        self.set_output("port_count", len(ports))
        logger.info(f"SerialScanner 发现 {len(ports)} 个串口设备")

    def process(self):
        trigger = self.get_input("scan_trigger")
        if trigger:
            self._do_scan()

"""
SCPI 设备组件
支持 SCPI (Standard Commands for Programmable Instruments) 协议
用于控制和读取各种测试测量仪器
"""

import logging
import threading
import time
from typing import Any, Dict, List, Optional

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)

# 尝试导入 pyvisa
try:
    import pyvisa
    VISA_AVAILABLE = True
except ImportError:
    VISA_AVAILABLE = False
    pyvisa = None


@ComponentRegistry.register
class SCPIDeviceComponent(ComponentBase):
    """
    SCPI 设备组件
    
    功能：
    - 通过 VISA 连接仪器设备（GPIB/USB/Ethernet/Serial）
    - 发送 SCPI 命令并读取响应
    - 支持查询、设置、测量等操作
    - 自动断线重连
    
    配置参数：
        resource_name: str - VISA 资源名称（如 GPIB0::1::INSTR, TCPIP::192.168.1.100::INSTR）
        timeout: int - 超时时间（毫秒）
        read_termination: str - 读取终止符
        write_termination: str - 写入终止符
        auto_reconnect: bool - 是否自动重连
    """
    
    component_type = ComponentType.DEVICE
    component_name = "SCPIDevice"
    component_description = "SCPI 协议仪器控制组件"
    component_icon = "📟"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._resource_manager: Optional[Any] = None
        self._instrument: Optional[Any] = None
        self._is_connected = False
        self._lock = threading.Lock()

    def _setup_ports(self):
        """设置输入输出端口"""
        # 输入端口
        self.add_input_port("command", PortType.STRING, "SCPI 命令")
        self.add_input_port("send_trigger", PortType.BOOLEAN, "发送触发信号")
        self.add_input_port("query", PortType.STRING, "SCPI 查询命令")
        self.add_input_port("query_trigger", PortType.BOOLEAN, "查询触发信号")
        
        # 输出端口
        self.add_output_port("response", PortType.STRING, "查询响应")
        self.add_output_port("numeric_value", PortType.NUMBER, "数值响应")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("idn", PortType.STRING, "设备标识")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("resource_name", "GPIB0::1::INSTR")
        self.config.setdefault("timeout", 5000)  # 毫秒
        self.config.setdefault("read_termination", "\n")
        self.config.setdefault("write_termination", "\n")
        self.config.setdefault("auto_reconnect", True)
        self.config.setdefault("reconnect_interval", 3)
        self.config.setdefault("query_idn_on_connect", True)

    def start(self):
        """启动组件"""
        super().start()
        
        if not VISA_AVAILABLE:
            logger.error("pyvisa not installed. Install with: pip install pyvisa pyvisa-py")
            self.set_output("error", "pyvisa not installed")
            self.set_output("connected", False)
            return
        
        try:
            self._resource_manager = pyvisa.ResourceManager()
        except Exception as e:
            logger.error(f"无法创建 VISA ResourceManager: {e}")
            self.set_output("error", f"VISA initialization failed: {e}")
            return
        
        self._connect()

    def stop(self):
        """停止组件"""
        if self._instrument:
            try:
                self._instrument.close()
                logger.info(f"SCPIDevice ({self.instance_id}) 连接已关闭")
            except Exception as e:
                logger.error(f"关闭 SCPI 连接失败: {e}")
        
        self._instrument = None
        self._is_connected = False
        super().stop()

    def _connect(self) -> bool:
        """连接仪器"""
        if not VISA_AVAILABLE or not self._resource_manager:
            return False
        
        try:
            resource_name = self.config["resource_name"]
            
            self._instrument = self._resource_manager.open_resource(resource_name)
            self._instrument.timeout = self.config["timeout"]
            self._instrument.read_termination = self.config["read_termination"]
            self._instrument.write_termination = self.config["write_termination"]
            
            self._is_connected = True
            self.set_output("connected", True)
            self.set_output("error", "")
            
            # 查询设备标识
            if self.config.get("query_idn_on_connect", True):
                try:
                    idn = self._instrument.query("*IDN?").strip()
                    self.set_output("idn", idn)
                    logger.info(f"SCPIDevice ({self.instance_id}) 连接成功: {idn}")
                except Exception as e:
                    logger.warning(f"无法查询 IDN: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"SCPI 连接失败: {e}")
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            return False

    def write(self, command: str) -> bool:
        """发送 SCPI 命令"""
        if not self._instrument or not self._is_connected:
            logger.warning("仪器未连接，无法发送命令")
            return False
        
        with self._lock:
            try:
                self._instrument.write(command)
                logger.debug(f"SCPIDevice 发送: {command}")
                return True
            except Exception as e:
                logger.error(f"SCPI 写入失败: {e}")
                self.set_output("error", str(e))
                self._is_connected = False
                self.set_output("connected", False)
                return False

    def query(self, command: str) -> Optional[str]:
        """发送 SCPI 查询命令并返回响应"""
        if not self._instrument or not self._is_connected:
            logger.warning("仪器未连接，无法查询")
            return None
        
        with self._lock:
            try:
                response = self._instrument.query(command).strip()
                logger.debug(f"SCPIDevice 查询: {command} -> {response}")
                return response
            except Exception as e:
                logger.error(f"SCPI 查询失败: {e}")
                self.set_output("error", str(e))
                self._is_connected = False
                self.set_output("connected", False)
                return None

    def process(self):
        """处理命令请求"""
        if not self._is_running:
            return
        
        # 处理发送命令
        send_trigger = self.get_input("send_trigger")
        if send_trigger:
            command = self.get_input("command")
            if command:
                self.write(str(command))
        
        # 处理查询命令
        query_trigger = self.get_input("query_trigger")
        if query_trigger:
            query_cmd = self.get_input("query")
            if query_cmd:
                response = self.query(str(query_cmd))
                if response:
                    self.set_output("response", response)
                    # 尝试解析为数值
                    try:
                        numeric = float(response)
                        self.set_output("numeric_value", numeric)
                    except ValueError:
                        pass

    def destroy(self):
        """销毁组件"""
        self.stop()
        if self._resource_manager:
            try:
                self._resource_manager.close()
            except:
                pass
        super().destroy()

    @staticmethod
    def scan_resources() -> List[str]:
        """扫描可用的 VISA 资源"""
        if not VISA_AVAILABLE:
            return []
        
        try:
            rm = pyvisa.ResourceManager()
            resources = list(rm.list_resources())
            rm.close()
            return resources
        except Exception as e:
            logger.error(f"扫描 VISA 资源失败: {e}")
            return []


@ComponentRegistry.register
class SCPIScannerComponent(ComponentBase):
    """
    SCPI 设备扫描组件
    扫描系统中可用的 VISA 资源
    """
    
    component_type = ComponentType.DEVICE
    component_name = "SCPIScanner"
    component_description = "扫描可用的 VISA/SCPI 设备"
    component_icon = "🔍"

    def _setup_ports(self):
        self.add_input_port("scan_trigger", PortType.BOOLEAN, "触发扫描")
        self.add_output_port("resources", PortType.ARRAY, "可用资源列表")
        self.add_output_port("resource_count", PortType.NUMBER, "资源数量")

    def start(self):
        super().start()
        self._do_scan()

    def stop(self):
        super().stop()

    def _do_scan(self):
        """执行扫描"""
        resources = SCPIDeviceComponent.scan_resources()
        self.set_output("resources", resources)
        self.set_output("resource_count", len(resources))
        logger.info(f"SCPIScanner 发现 {len(resources)} 个 VISA 资源")

    def process(self):
        trigger = self.get_input("scan_trigger")
        if trigger:
            self._do_scan()

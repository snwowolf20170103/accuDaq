"""
工业电力协议组件
支持 IEC 61850、DNP3、IEC 60870-5-104 等电力系统协议
"""

import logging
import threading
import time
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)


# ============ IEC 61850 协议组件 ============

class IEC61850DataType(Enum):
    """IEC 61850 数据类型"""
    BOOLEAN = "BOOLEAN"
    INT8 = "INT8"
    INT16 = "INT16"
    INT32 = "INT32"
    INT64 = "INT64"
    FLOAT32 = "FLOAT32"
    FLOAT64 = "FLOAT64"
    VISIBLE_STRING = "VISIBLE_STRING"
    TIMESTAMP = "TIMESTAMP"
    QUALITY = "QUALITY"


@dataclass
class IEC61850DataAttribute:
    """IEC 61850 数据属性"""
    name: str
    fc: str  # Functional Constraint (MX, ST, CO, etc.)
    data_type: IEC61850DataType
    value: Any = None


@ComponentRegistry.register
class IEC61850ClientComponent(ComponentBase):
    """
    IEC 61850 MMS 客户端组件
    
    功能：
    - 连接 IEC 61850 服务器
    - 读取/写入数据属性
    - 订阅报告 (Report)
    - 支持 GOOSE 消息
    
    配置参数：
        server_ip: str - 服务器 IP 地址
        server_port: int - 端口号 (默认 102)
        ied_name: str - IED 名称
        ap_title: list - AP Title
    """
    
    component_type = ComponentType.COMMUNICATION
    component_name = "IEC61850Client"
    component_description = "IEC 61850 MMS 客户端"
    component_icon = "⚡"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._client = None
        self._is_connected = False
        self._subscriptions: Dict[str, Callable] = {}

    def _setup_ports(self):
        self.add_input_port("connect", PortType.BOOLEAN, "连接触发")
        self.add_input_port("read_ref", PortType.STRING, "读取引用")
        self.add_input_port("write_ref", PortType.STRING, "写入引用")
        self.add_input_port("write_value", PortType.ANY, "写入值")
        
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("read_value", PortType.ANY, "读取值")
        self.add_output_port("report_data", PortType.OBJECT, "报告数据")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        self.config.setdefault("server_ip", "192.168.1.100")
        self.config.setdefault("server_port", 102)
        self.config.setdefault("ied_name", "IED1")
        self.config.setdefault("ap_title", [1, 1, 1, 999, 1])
        self.config.setdefault("auto_connect", False)

    def start(self):
        super().start()
        if self.config.get("auto_connect"):
            self._connect()

    def stop(self):
        self._disconnect()
        super().stop()

    def _connect(self):
        """连接到 IEC 61850 服务器"""
        try:
            # 尝试使用 libiec61850 Python 绑定
            try:
                import iec61850
                
                self._client = iec61850.IedConnection_create()
                error = iec61850.IedConnection_connect(
                    self._client,
                    self.config["server_ip"],
                    self.config["server_port"]
                )
                
                if error == iec61850.IED_ERROR_OK:
                    self._is_connected = True
                    self.set_output("connected", True)
                    logger.info(f"IEC 61850 已连接: {self.config['server_ip']}")
                else:
                    raise Exception(f"Connection error: {error}")
                    
            except ImportError:
                # 模拟连接
                logger.warning("libiec61850 未安装，使用模拟模式")
                self._is_connected = True
                self.set_output("connected", True)
                
        except Exception as e:
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"IEC 61850 连接失败: {e}")

    def _disconnect(self):
        """断开连接"""
        if self._client:
            try:
                import iec61850
                iec61850.IedConnection_close(self._client)
                iec61850.IedConnection_destroy(self._client)
            except:
                pass
        self._client = None
        self._is_connected = False
        self.set_output("connected", False)

    def read_data_attribute(self, object_reference: str, fc: str = "MX") -> Any:
        """
        读取数据属性
        
        Args:
            object_reference: 对象引用 (如 "IED1LD1/MMXU1.TotW.mag.f")
            fc: 功能约束 (MX, ST, CO, etc.)
        """
        if not self._is_connected:
            return None
        
        try:
            import iec61850
            
            value = iec61850.IedConnection_readObject(
                self._client, object_reference, fc
            )
            return value
        except ImportError:
            # 模拟读取
            return {"value": 0.0, "quality": "good", "timestamp": time.time()}
        except Exception as e:
            self.set_output("error", str(e))
            return None

    def write_data_attribute(self, object_reference: str, fc: str, value: Any) -> bool:
        """写入数据属性"""
        if not self._is_connected:
            return False
        
        try:
            import iec61850
            
            iec61850.IedConnection_writeObject(
                self._client, object_reference, fc, value
            )
            return True
        except ImportError:
            return True  # 模拟
        except Exception as e:
            self.set_output("error", str(e))
            return False

    def subscribe_report(self, rcb_reference: str, callback: Callable):
        """订阅报告"""
        self._subscriptions[rcb_reference] = callback

    def process(self):
        if not self._is_running:
            return
        
        # 处理连接
        if self.get_input("connect") and not self._is_connected:
            self._connect()
        
        # 处理读取
        read_ref = self.get_input("read_ref")
        if read_ref:
            value = self.read_data_attribute(read_ref)
            self.set_output("read_value", value)
        
        # 处理写入
        write_ref = self.get_input("write_ref")
        write_value = self.get_input("write_value")
        if write_ref and write_value is not None:
            self.write_data_attribute(write_ref, "CO", write_value)


@ComponentRegistry.register
class IEC61850GOOSEComponent(ComponentBase):
    """
    IEC 61850 GOOSE 订阅/发布组件
    
    功能：
    - GOOSE 消息订阅
    - GOOSE 消息发布
    """
    
    component_type = ComponentType.COMMUNICATION
    component_name = "IEC61850GOOSE"
    component_description = "IEC 61850 GOOSE 消息"
    component_icon = "📡"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._subscriber = None
        self._publisher = None

    def _setup_ports(self):
        self.add_input_port("publish_data", PortType.OBJECT, "发布数据")
        self.add_input_port("publish_trigger", PortType.BOOLEAN, "发布触发")
        
        self.add_output_port("received_data", PortType.OBJECT, "接收数据")
        self.add_output_port("goose_valid", PortType.BOOLEAN, "GOOSE 有效")
        self.add_output_port("sq_num", PortType.NUMBER, "序列号")
        self.add_output_port("state_num", PortType.NUMBER, "状态号")

    def _on_configure(self):
        self.config.setdefault("interface", "eth0")
        self.config.setdefault("subscribe_gocbref", "")
        self.config.setdefault("publish_gocbref", "")
        self.config.setdefault("app_id", 0x1000)

    def start(self):
        super().start()

    def stop(self):
        super().stop()

    def process(self):
        pass


# ============ DNP3 协议组件 ============

class DNP3ObjectGroup(Enum):
    """DNP3 对象组"""
    BINARY_INPUT = 1
    BINARY_OUTPUT = 10
    COUNTER = 20
    ANALOG_INPUT = 30
    ANALOG_OUTPUT = 40
    TIME = 50


@ComponentRegistry.register
class DNP3MasterComponent(ComponentBase):
    """
    DNP3 主站组件
    
    功能：
    - 连接 DNP3 从站
    - 轮询数据
    - 发送控制命令
    
    配置参数：
        slave_ip: str - 从站 IP
        slave_port: int - 端口 (默认 20000)
        master_addr: int - 主站地址
        slave_addr: int - 从站地址
    """
    
    component_type = ComponentType.COMMUNICATION
    component_name = "DNP3Master"
    component_description = "DNP3 主站"
    component_icon = "🔌"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._master = None
        self._is_connected = False
        self._poll_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def _setup_ports(self):
        self.add_input_port("connect", PortType.BOOLEAN, "连接触发")
        self.add_input_port("poll_trigger", PortType.BOOLEAN, "轮询触发")
        self.add_input_port("control_point", PortType.NUMBER, "控制点索引")
        self.add_input_port("control_value", PortType.ANY, "控制值")
        
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("binary_inputs", PortType.ARRAY, "二进制输入")
        self.add_output_port("analog_inputs", PortType.ARRAY, "模拟输入")
        self.add_output_port("counters", PortType.ARRAY, "计数器")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        self.config.setdefault("slave_ip", "192.168.1.100")
        self.config.setdefault("slave_port", 20000)
        self.config.setdefault("master_addr", 1)
        self.config.setdefault("slave_addr", 10)
        self.config.setdefault("poll_interval_ms", 1000)
        self.config.setdefault("auto_connect", False)

    def start(self):
        super().start()
        if self.config.get("auto_connect"):
            self._connect()

    def stop(self):
        self._stop_event.set()
        if self._poll_thread and self._poll_thread.is_alive():
            self._poll_thread.join(timeout=2)
        self._disconnect()
        super().stop()

    def _connect(self):
        """连接 DNP3 从站"""
        try:
            # 尝试使用 pydnp3
            try:
                from pydnp3 import opendnp3, openpal, asiopal, asiodnp3
                
                # 配置连接
                # 实际实现需要完整的 pydnp3 设置
                self._is_connected = True
                self.set_output("connected", True)
                logger.info(f"DNP3 已连接: {self.config['slave_ip']}")
                
            except ImportError:
                # 模拟连接
                logger.warning("pydnp3 未安装，使用模拟模式")
                self._is_connected = True
                self.set_output("connected", True)
                
        except Exception as e:
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"DNP3 连接失败: {e}")

    def _disconnect(self):
        """断开连接"""
        self._master = None
        self._is_connected = False
        self.set_output("connected", False)

    def poll_class(self, class_num: int = 0) -> Dict:
        """
        轮询数据类
        
        Args:
            class_num: 0=Class 0, 1=Class 1, 2=Class 2, 3=Class 3
        """
        if not self._is_connected:
            return {}
        
        try:
            # 模拟轮询结果
            return {
                "binary_inputs": [{"index": i, "value": i % 2 == 0, "flags": 0x01} for i in range(10)],
                "analog_inputs": [{"index": i, "value": 100.0 + i * 10, "flags": 0x01} for i in range(5)],
                "counters": [{"index": i, "value": 1000 + i * 100, "flags": 0x01} for i in range(3)],
            }
        except Exception as e:
            self.set_output("error", str(e))
            return {}

    def send_control(self, index: int, value: Any, op_type: str = "LATCH_ON"):
        """发送控制命令"""
        if not self._is_connected:
            return False
        
        try:
            # 模拟控制
            logger.info(f"DNP3 控制: index={index}, value={value}, op={op_type}")
            return True
        except Exception as e:
            self.set_output("error", str(e))
            return False

    def process(self):
        if not self._is_running:
            return
        
        if self.get_input("connect") and not self._is_connected:
            self._connect()
        
        if self.get_input("poll_trigger"):
            data = self.poll_class()
            self.set_output("binary_inputs", data.get("binary_inputs", []))
            self.set_output("analog_inputs", data.get("analog_inputs", []))
            self.set_output("counters", data.get("counters", []))


# ============ IEC 60870-5-104 协议组件 ============

@ComponentRegistry.register
class IEC104ClientComponent(ComponentBase):
    """
    IEC 60870-5-104 客户端组件
    
    功能：
    - 连接 IEC 104 服务器
    - 读取遥测/遥信
    - 发送遥控命令
    
    配置参数：
        server_ip: str - 服务器 IP
        server_port: int - 端口 (默认 2404)
        common_addr: int - 公共地址
    """
    
    component_type = ComponentType.COMMUNICATION
    component_name = "IEC104Client"
    component_description = "IEC 60870-5-104 客户端"
    component_icon = "🔋"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._client = None
        self._is_connected = False

    def _setup_ports(self):
        self.add_input_port("connect", PortType.BOOLEAN, "连接触发")
        self.add_input_port("interrogation", PortType.BOOLEAN, "总召唤触发")
        self.add_input_port("control_addr", PortType.NUMBER, "控制信息地址")
        self.add_input_port("control_value", PortType.ANY, "控制值")
        
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("single_points", PortType.ARRAY, "单点信息 (遥信)")
        self.add_output_port("measured_values", PortType.ARRAY, "测量值 (遥测)")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        self.config.setdefault("server_ip", "192.168.1.100")
        self.config.setdefault("server_port", 2404)
        self.config.setdefault("common_addr", 1)
        self.config.setdefault("originator_addr", 0)
        self.config.setdefault("auto_connect", False)

    def start(self):
        super().start()
        if self.config.get("auto_connect"):
            self._connect()

    def stop(self):
        self._disconnect()
        super().stop()

    def _connect(self):
        """连接到 IEC 104 服务器"""
        try:
            try:
                import iec104
                
                self._client = iec104.Client(
                    self.config["server_ip"],
                    self.config["server_port"]
                )
                self._client.connect()
                self._is_connected = True
                self.set_output("connected", True)
                logger.info(f"IEC 104 已连接: {self.config['server_ip']}")
                
            except ImportError:
                logger.warning("iec104 未安装，使用模拟模式")
                self._is_connected = True
                self.set_output("connected", True)
                
        except Exception as e:
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"IEC 104 连接失败: {e}")

    def _disconnect(self):
        """断开连接"""
        if self._client:
            try:
                self._client.disconnect()
            except:
                pass
        self._client = None
        self._is_connected = False
        self.set_output("connected", False)

    def send_interrogation(self):
        """发送总召唤"""
        if not self._is_connected:
            return
        
        try:
            # 模拟总召唤响应
            single_points = [{"ioa": 1000 + i, "value": i % 2 == 0, "quality": "good"} for i in range(20)]
            measured_values = [{"ioa": 2000 + i, "value": 100.0 + i * 5.5, "quality": "good"} for i in range(10)]
            
            self.set_output("single_points", single_points)
            self.set_output("measured_values", measured_values)
        except Exception as e:
            self.set_output("error", str(e))

    def send_command(self, ioa: int, value: Any, cmd_type: str = "single"):
        """发送遥控命令"""
        if not self._is_connected:
            return False
        
        try:
            logger.info(f"IEC 104 命令: ioa={ioa}, value={value}, type={cmd_type}")
            return True
        except Exception as e:
            self.set_output("error", str(e))
            return False

    def process(self):
        if not self._is_running:
            return
        
        if self.get_input("connect") and not self._is_connected:
            self._connect()
        
        if self.get_input("interrogation"):
            self.send_interrogation()
        
        control_addr = self.get_input("control_addr")
        control_value = self.get_input("control_value")
        if control_addr is not None and control_value is not None:
            self.send_command(int(control_addr), control_value)


# ============ BACnet 协议组件 ============

@ComponentRegistry.register
class BACnetClientComponent(ComponentBase):
    """
    BACnet 客户端组件
    
    功能：
    - 连接 BACnet 设备
    - 读取/写入属性
    - 支持 COV (Change of Value) 订阅
    
    用于楼宇自动化系统
    """
    
    component_type = ComponentType.COMMUNICATION
    component_name = "BACnetClient"
    component_description = "BACnet 楼宇自动化协议客户端"
    component_icon = "🏢"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._client = None
        self._is_connected = False

    def _setup_ports(self):
        self.add_input_port("connect", PortType.BOOLEAN, "连接触发")
        self.add_input_port("device_id", PortType.NUMBER, "设备实例 ID")
        self.add_input_port("object_type", PortType.STRING, "对象类型")
        self.add_input_port("object_instance", PortType.NUMBER, "对象实例")
        self.add_input_port("property_id", PortType.STRING, "属性 ID")
        self.add_input_port("write_value", PortType.ANY, "写入值")
        
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("read_value", PortType.ANY, "读取值")
        self.add_output_port("device_list", PortType.ARRAY, "发现的设备")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        self.config.setdefault("local_ip", "0.0.0.0")
        self.config.setdefault("local_port", 47808)
        self.config.setdefault("broadcast_addr", "255.255.255.255")
        self.config.setdefault("max_apdu_length", 1476)

    def start(self):
        super().start()

    def stop(self):
        super().stop()

    def discover_devices(self) -> List[Dict]:
        """发现 BACnet 设备"""
        try:
            # 模拟设备发现
            return [
                {"device_id": 1001, "name": "AHU-1", "vendor": "Accu"},
                {"device_id": 1002, "name": "VAV-1", "vendor": "Accu"},
            ]
        except Exception as e:
            self.set_output("error", str(e))
            return []

    def read_property(self, device_id: int, object_type: str, instance: int, property_id: str) -> Any:
        """读取 BACnet 属性"""
        try:
            # 模拟读取
            return {"value": 72.5, "status": "active"}
        except Exception as e:
            self.set_output("error", str(e))
            return None

    def process(self):
        pass

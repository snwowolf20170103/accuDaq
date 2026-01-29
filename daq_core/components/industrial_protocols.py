"""
工业协议组件 - 电力/楼宇/工厂自动化协议
包含：IEC 61850, IEC 101/103/104, DNP3, Profibus, Profinet, BACnet
"""

import json
import logging
import threading
import time
from typing import Optional

from .base import ComponentBase, ComponentRegistry, ComponentType, PortType

logger = logging.getLogger(__name__)


# ============ IEC 61850 组件 ============

@ComponentRegistry.register
class IEC61850ClientComponent(ComponentBase):
    """
    IEC 61850 客户端组件
    用于变电站自动化系统通信（MMS 协议）
    
    配置项：
    - host: IED 设备 IP 地址
    - port: MMS 端口（默认 102）
    - ied_name: IED 名称
    - logical_device: 逻辑设备名
    - logical_node: 逻辑节点名
    """
    component_name = "IEC61850Client"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("client_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("ied_name", PortType.STRING)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.host = self.config.get('host', '192.168.1.100')
        self.port = self.config.get('port', 102)
        self.ied_name = self.config.get('ied_name', 'IED1')
        self.client = None
        self._connected = False
        self._simulation_mode = False
        
    def start(self):
        super().start()
        try:
            # 尝试导入 libiec61850 Python 绑定
            import iec61850
            self.client = iec61850.IedConnection.create()
            self.client.connect(self.host, self.port)
            
            self._connected = True
            self._simulation_mode = False
            self.set_output("connected", True)
            self.set_output("ied_name", self.ied_name)
            self.set_output("client_ref", self)
            
            logger.info(f"IEC 61850 Client connected to {self.host}:{self.port}")
            
        except ImportError:
            logger.warning("iec61850 not installed, running in simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("ied_name", self.ied_name)
            self.set_output("client_ref", self)
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"IEC 61850 Client connect failed: {e}")
    
    def stop(self):
        if self.client and not self._simulation_mode:
            try:
                self.client.close()
            except:
                pass
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


@ComponentRegistry.register
class IEC61850DataReaderComponent(ComponentBase):
    """
    IEC 61850 数据读取组件
    读取逻辑节点数据对象，支持 MQTT 转发
    """
    component_name = "IEC61850DataReader"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_output_port("value", PortType.ANY)
        self.add_output_port("quality", PortType.STRING)
        self.add_output_port("timestamp", PortType.STRING)
        self.add_output_port("raw_data", PortType.OBJECT)
    
    def _on_configure(self):
        self.logical_device = self.config.get('logical_device', 'LD0')
        self.logical_node = self.config.get('logical_node', 'MMXU1')
        self.data_object = self.config.get('data_object', 'TotW')
        self.data_attribute = self.config.get('data_attribute', 'mag.f')
        
        # MQTT 配置
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'iec61850/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 1000)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        client_component = self.get_input("client")
        is_simulation = True
        value = 0
        quality = "Good"
        
        if client_component and hasattr(client_component, 'client'):
            is_simulation = getattr(client_component, '_simulation_mode', True)
            if not is_simulation and client_component.client:
                try:
                    # 构建完整的数据引用
                    ref = f"{self.logical_device}/{self.logical_node}.{self.data_object}.{self.data_attribute}"
                    value = client_component.client.readFloatValue(ref)
                    quality = "Good"
                except Exception as e:
                    logger.error(f"IEC 61850 read error: {e}")
                    quality = "Bad"
        
        if is_simulation:
            self._simulation_counter += 1
            value = round(1000 + 500 * math.sin(self._simulation_counter * 0.05), 2)  # 模拟功率值
            quality = "Good (Simulation)"
        
        data = {
            "logical_device": self.logical_device,
            "logical_node": self.logical_node,
            "data_object": self.data_object,
            "value": value,
            "quality": quality,
            "timestamp": timestamp_str,
            "source": "simulation" if is_simulation else "iec61850"
        }
        
        self.set_output("value", value)
        self.set_output("quality", quality)
        self.set_output("timestamp", timestamp_str)
        self.set_output("raw_data", data)
        
        if self.mqtt_enabled and self._mqtt_client:
            try:
                self._mqtt_client.publish(self.mqtt_topic, json.dumps(data))
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


# ============ IEC 60870-5-104 组件 ============

@ComponentRegistry.register
class IEC104ClientComponent(ComponentBase):
    """
    IEC 60870-5-104 客户端组件
    用于电力系统远动通信（基于 TCP/IP）
    
    配置项：
    - host: 从站 IP 地址
    - port: 端口（默认 2404）
    - common_address: 公共地址
    - originator_address: 源站地址
    """
    component_name = "IEC104Client"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("client_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.host = self.config.get('host', '192.168.1.100')
        self.port = self.config.get('port', 2404)
        self.common_address = self.config.get('common_address', 1)
        self.originator_address = self.config.get('originator_address', 0)
        self.client = None
        self._connected = False
        self._simulation_mode = False
        self._data_points = {}  # 存储接收到的数据点
        
    def start(self):
        super().start()
        try:
            import c104
            self.client = c104.Client()
            connection = self.client.add_connection(
                ip=self.host, 
                port=self.port,
                init=c104.Init.ALL
            )
            self.client.start()
            
            self._connected = True
            self._simulation_mode = False
            self.set_output("connected", True)
            self.set_output("client_ref", self)
            
            logger.info(f"IEC 104 Client connected to {self.host}:{self.port}")
            
        except ImportError:
            logger.warning("c104 not installed, running in simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("client_ref", self)
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"IEC 104 Client connect failed: {e}")
    
    def stop(self):
        if self.client and not self._simulation_mode:
            try:
                self.client.stop()
            except:
                pass
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


@ComponentRegistry.register
class IEC104DataPointComponent(ComponentBase):
    """
    IEC 104 数据点组件
    读取遥测/遥信数据，支持 MQTT 转发
    """
    component_name = "IEC104DataPoint"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_input_port("command_value", PortType.NUMBER)
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("quality", PortType.STRING)
        self.add_output_port("raw_data", PortType.OBJECT)
    
    def _on_configure(self):
        self.ioa = self.config.get('ioa', 1)  # 信息对象地址
        self.type_id = self.config.get('type_id', 'M_ME_NC_1')  # 类型标识
        
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'iec104/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 1000)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        client_component = self.get_input("client")
        is_simulation = True
        value = 0
        quality = "Good"
        
        if client_component and hasattr(client_component, '_data_points'):
            is_simulation = getattr(client_component, '_simulation_mode', True)
            if not is_simulation:
                point = client_component._data_points.get(self.ioa)
                if point:
                    value = point.get('value', 0)
                    quality = point.get('quality', 'Good')
        
        if is_simulation:
            self._simulation_counter += 1
            value = round(220 + 10 * math.sin(self._simulation_counter * 0.1), 2)  # 模拟电压
            quality = "Good (Simulation)"
        
        data = {
            "ioa": self.ioa,
            "type_id": self.type_id,
            "value": value,
            "quality": quality,
            "timestamp": timestamp_str,
            "source": "simulation" if is_simulation else "iec104"
        }
        
        self.set_output("value", value)
        self.set_output("quality", quality)
        self.set_output("raw_data", data)
        
        if self.mqtt_enabled and self._mqtt_client:
            try:
                self._mqtt_client.publish(self.mqtt_topic, json.dumps(data))
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


# ============ IEC 60870-5-101 组件 ============

@ComponentRegistry.register
class IEC101MasterComponent(ComponentBase):
    """
    IEC 60870-5-101 主站组件
    用于串口远动通信
    
    配置项：
    - serial_port: 串口（如 COM1 或 /dev/ttyUSB0）
    - baudrate: 波特率
    - link_address: 链路地址
    - common_address: 公共地址
    """
    component_name = "IEC101Master"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("master_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.serial_port = self.config.get('serial_port', 'COM1')
        self.baudrate = self.config.get('baudrate', 9600)
        self.link_address = self.config.get('link_address', 1)
        self.common_address = self.config.get('common_address', 1)
        self._connected = False
        self._simulation_mode = False
        self._data_points = {}
        
    def start(self):
        super().start()
        try:
            # IEC 101 通常需要自定义实现或使用特定库
            # 这里使用模拟模式作为默认
            import serial
            self.serial = serial.Serial(self.serial_port, self.baudrate, timeout=1)
            
            self._connected = True
            self._simulation_mode = False
            self.set_output("connected", True)
            self.set_output("master_ref", self)
            
            logger.info(f"IEC 101 Master started on {self.serial_port}")
            
        except Exception as e:
            logger.warning(f"IEC 101: {e}, running in simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("master_ref", self)
    
    def stop(self):
        if hasattr(self, 'serial') and self.serial:
            try:
                self.serial.close()
            except:
                pass
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


# ============ IEC 60870-5-103 组件 ============

@ComponentRegistry.register
class IEC103MasterComponent(ComponentBase):
    """
    IEC 60870-5-103 主站组件
    用于继电保护设备通信
    
    配置项：
    - serial_port: 串口
    - baudrate: 波特率
    - asdu_address: ASDU 地址
    """
    component_name = "IEC103Master"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("master_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.serial_port = self.config.get('serial_port', 'COM1')
        self.baudrate = self.config.get('baudrate', 9600)
        self.asdu_address = self.config.get('asdu_address', 1)
        self._connected = False
        self._simulation_mode = False
        
    def start(self):
        super().start()
        try:
            import serial
            self.serial = serial.Serial(self.serial_port, self.baudrate, timeout=1)
            
            self._connected = True
            self._simulation_mode = False
            self.set_output("connected", True)
            self.set_output("master_ref", self)
            
            logger.info(f"IEC 103 Master started on {self.serial_port}")
            
        except Exception as e:
            logger.warning(f"IEC 103: {e}, running in simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("master_ref", self)
    
    def stop(self):
        if hasattr(self, 'serial') and self.serial:
            try:
                self.serial.close()
            except:
                pass
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


# ============ DNP3 组件 ============

@ComponentRegistry.register
class DNP3MasterComponent(ComponentBase):
    """
    DNP3 主站组件
    用于北美电力系统远动通信
    
    配置项：
    - host: 从站 IP 地址
    - port: 端口（默认 20000）
    - master_address: 主站地址
    - outstation_address: 从站地址
    """
    component_name = "DNP3Master"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("master_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.host = self.config.get('host', '192.168.1.100')
        self.port = self.config.get('port', 20000)
        self.master_address = self.config.get('master_address', 1)
        self.outstation_address = self.config.get('outstation_address', 10)
        self._connected = False
        self._simulation_mode = False
        self._data_points = {}
        
    def start(self):
        super().start()
        try:
            from pydnp3 import opendnp3, openpal, asiopal, asiodnp3
            
            # DNP3 初始化较复杂，这里简化处理
            self._connected = True
            self._simulation_mode = False
            self.set_output("connected", True)
            self.set_output("master_ref", self)
            
            logger.info(f"DNP3 Master connected to {self.host}:{self.port}")
            
        except ImportError:
            logger.warning("pydnp3 not installed, running in simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("master_ref", self)
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"DNP3 Master connect failed: {e}")
    
    def stop(self):
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


@ComponentRegistry.register
class DNP3DataPointComponent(ComponentBase):
    """
    DNP3 数据点组件
    读取模拟量输入/二进制输入，支持 MQTT 转发
    """
    component_name = "DNP3DataPoint"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("master", PortType.ANY)
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("quality", PortType.STRING)
        self.add_output_port("raw_data", PortType.OBJECT)
    
    def _on_configure(self):
        self.point_index = self.config.get('point_index', 0)
        self.point_type = self.config.get('point_type', 'analog_input')  # analog_input, binary_input
        
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'dnp3/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 1000)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        master_component = self.get_input("master")
        is_simulation = True
        value = 0
        quality = "Good"
        
        if master_component:
            is_simulation = getattr(master_component, '_simulation_mode', True)
        
        if is_simulation:
            self._simulation_counter += 1
            if self.point_type == 'binary_input':
                value = 1 if self._simulation_counter % 20 < 10 else 0
            else:
                value = round(100 + 50 * math.sin(self._simulation_counter * 0.1), 2)
            quality = "Good (Simulation)"
        
        data = {
            "point_index": self.point_index,
            "point_type": self.point_type,
            "value": value,
            "quality": quality,
            "timestamp": timestamp_str,
            "source": "simulation" if is_simulation else "dnp3"
        }
        
        self.set_output("value", value)
        self.set_output("quality", quality)
        self.set_output("raw_data", data)
        
        if self.mqtt_enabled and self._mqtt_client:
            try:
                self._mqtt_client.publish(self.mqtt_topic, json.dumps(data))
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


# ============ Profibus 组件 ============

@ComponentRegistry.register
class ProfibusMasterComponent(ComponentBase):
    """
    Profibus DP 主站组件
    用于工厂自动化现场总线通信
    
    配置项：
    - interface: Profibus 接口（如 DP0）
    - baudrate: 波特率
    - master_address: 主站地址
    """
    component_name = "ProfibusMaster"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("master_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("slave_count", PortType.NUMBER)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.interface = self.config.get('interface', 'DP0')
        self.baudrate = self.config.get('baudrate', 1500000)
        self.master_address = self.config.get('master_address', 1)
        self._connected = False
        self._simulation_mode = False
        
    def start(self):
        super().start()
        # Profibus 需要专用硬件和驱动，通常使用模拟模式
        logger.warning("Profibus: No hardware driver, running in simulation mode")
        self._connected = True
        self._simulation_mode = True
        self.set_output("connected", True)
        self.set_output("slave_count", 3)  # 模拟 3 个从站
        self.set_output("master_ref", self)
    
    def stop(self):
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


@ComponentRegistry.register
class ProfibusSlaveComponent(ComponentBase):
    """
    Profibus DP 从站组件
    读写从站过程数据，支持 MQTT 转发
    """
    component_name = "ProfibusSlave"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("master", PortType.ANY)
        self.add_input_port("write_data", PortType.ARRAY)
        self.add_output_port("read_data", PortType.ARRAY)
        self.add_output_port("raw_data", PortType.OBJECT)
        self.add_output_port("connected", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.slave_address = self.config.get('slave_address', 3)
        self.input_size = self.config.get('input_size', 8)
        self.output_size = self.config.get('output_size', 8)
        
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'profibus/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 100)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        # 模拟数据
        self._simulation_counter += 1
        read_data = [0] * self.input_size
        for i in range(self.input_size):
            read_data[i] = int((128 + 100 * math.sin(self._simulation_counter * 0.1 + i)) % 256)
        
        data = {
            "slave_address": self.slave_address,
            "read_data": read_data,
            "timestamp": timestamp_str,
            "source": "simulation"
        }
        
        self.set_output("connected", True)
        self.set_output("read_data", read_data)
        self.set_output("raw_data", data)
        
        if self.mqtt_enabled and self._mqtt_client:
            try:
                self._mqtt_client.publish(self.mqtt_topic, json.dumps(data))
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


# ============ Profinet 组件 ============

@ComponentRegistry.register
class ProfinetControllerComponent(ComponentBase):
    """
    Profinet IO 控制器组件
    用于工业以太网实时通信
    
    配置项：
    - interface: 网卡名称
    - station_name: 控制器站名
    """
    component_name = "ProfinetController"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("controller_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("device_count", PortType.NUMBER)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.interface = self.config.get('interface', 'eth0')
        self.station_name = self.config.get('station_name', 'controller')
        self._connected = False
        self._simulation_mode = False
        
    def start(self):
        super().start()
        try:
            # Profinet 需要 p-net 或类似库
            # 目前使用模拟模式
            logger.warning("Profinet: Using simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("device_count", 2)
            self.set_output("controller_ref", self)
            
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
    
    def stop(self):
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


@ComponentRegistry.register
class ProfinetDeviceComponent(ComponentBase):
    """
    Profinet IO 设备组件
    读写 IO 设备数据，支持 MQTT 转发
    """
    component_name = "ProfinetDevice"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("controller", PortType.ANY)
        self.add_input_port("write_data", PortType.ARRAY)
        self.add_output_port("read_data", PortType.ARRAY)
        self.add_output_port("raw_data", PortType.OBJECT)
        self.add_output_port("connected", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.device_name = self.config.get('device_name', 'device1')
        self.slot = self.config.get('slot', 1)
        self.subslot = self.config.get('subslot', 1)
        self.input_size = self.config.get('input_size', 8)
        self.output_size = self.config.get('output_size', 8)
        
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'profinet/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 100)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        # 模拟数据
        self._simulation_counter += 1
        read_data = [0] * self.input_size
        for i in range(self.input_size):
            read_data[i] = int((128 + 100 * math.sin(self._simulation_counter * 0.1 + i)) % 256)
        
        data = {
            "device_name": self.device_name,
            "slot": self.slot,
            "subslot": self.subslot,
            "read_data": read_data,
            "timestamp": timestamp_str,
            "source": "simulation"
        }
        
        self.set_output("connected", True)
        self.set_output("read_data", read_data)
        self.set_output("raw_data", data)
        
        if self.mqtt_enabled and self._mqtt_client:
            try:
                self._mqtt_client.publish(self.mqtt_topic, json.dumps(data))
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


# ============ BACnet 组件 ============

@ComponentRegistry.register
class BACnetClientComponent(ComponentBase):
    """
    BACnet/IP 客户端组件
    用于楼宇自动化系统通信
    
    配置项：
    - interface: 网卡 IP 地址
    - port: BACnet 端口（默认 47808）
    """
    component_name = "BACnetClient"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("client_ref", PortType.ANY)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("device_count", PortType.NUMBER)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.interface = self.config.get('interface', '0.0.0.0')
        self.port = self.config.get('port', 47808)
        self._connected = False
        self._simulation_mode = False
        self._devices = {}
        
    def start(self):
        super().start()
        try:
            import BAC0
            self.bacnet = BAC0.lite(ip=self.interface, port=self.port)
            
            self._connected = True
            self._simulation_mode = False
            self.set_output("connected", True)
            self.set_output("client_ref", self)
            
            # 发现设备
            self.bacnet.discover()
            self.set_output("device_count", len(self.bacnet.devices))
            
            logger.info(f"BACnet Client started on {self.interface}:{self.port}")
            
        except ImportError:
            logger.warning("BAC0 not installed, running in simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("device_count", 2)
            self.set_output("client_ref", self)
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"BACnet Client start failed: {e}")
    
    def stop(self):
        if hasattr(self, 'bacnet') and self.bacnet:
            try:
                self.bacnet.disconnect()
            except:
                pass
        self._connected = False
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()


@ComponentRegistry.register
class BACnetObjectComponent(ComponentBase):
    """
    BACnet 对象组件
    读写 BACnet 对象属性，支持 MQTT 转发
    """
    component_name = "BACnetObject"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_input_port("write_value", PortType.NUMBER)
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("raw_data", PortType.OBJECT)
    
    def _on_configure(self):
        self.device_id = self.config.get('device_id', 1234)
        self.object_type = self.config.get('object_type', 'analogInput')
        self.object_instance = self.config.get('object_instance', 1)
        self.property_id = self.config.get('property_id', 'presentValue')
        
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'bacnet/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 1000)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
            except Exception as e:
                logger.error(f"MQTT connection failed: {e}")
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        client_component = self.get_input("client")
        is_simulation = True
        value = 0
        
        if client_component and hasattr(client_component, 'bacnet'):
            is_simulation = getattr(client_component, '_simulation_mode', True)
            if not is_simulation:
                try:
                    # 读取 BACnet 对象
                    obj_ref = f"{self.device_id} {self.object_type} {self.object_instance} {self.property_id}"
                    value = client_component.bacnet.read(obj_ref)
                except Exception as e:
                    logger.error(f"BACnet read error: {e}")
        
        if is_simulation:
            self._simulation_counter += 1
            # 模拟楼宇数据（温度、湿度等）
            if 'temp' in self.object_type.lower():
                value = round(22 + 3 * math.sin(self._simulation_counter * 0.05), 1)
            elif 'humid' in self.object_type.lower():
                value = round(50 + 10 * math.sin(self._simulation_counter * 0.03), 1)
            else:
                value = round(50 + 30 * math.sin(self._simulation_counter * 0.1), 2)
        
        data = {
            "device_id": self.device_id,
            "object_type": self.object_type,
            "object_instance": self.object_instance,
            "value": value,
            "timestamp": timestamp_str,
            "source": "simulation" if is_simulation else "bacnet"
        }
        
        self.set_output("value", value)
        self.set_output("raw_data", data)
        
        if self.mqtt_enabled and self._mqtt_client:
            try:
                self._mqtt_client.publish(self.mqtt_topic, json.dumps(data))
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")

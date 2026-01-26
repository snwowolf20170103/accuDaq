"""
复杂工业协议组件
包含 EtherCAT、CANopen、OPC UA 等
"""

import threading
import time
import logging
from typing import Dict, List, Any, Optional
from abc import abstractmethod

from .base import ComponentBase, PortType, ComponentType, ComponentRegistry

logger = logging.getLogger(__name__)


# ============ EtherCAT 组件 ============

@ComponentRegistry.register
class EtherCATMasterComponent(ComponentBase):
    """
    EtherCAT 主站组件
    用于与 EtherCAT 从站设备通信
    
    注意：需要安装 pysoem 库：pip install pysoem
    """
    component_name = "EtherCATMaster"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("slave_count", PortType.NUMBER)
        self.add_output_port("state", PortType.STRING)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.interface = self.config.get('interface', 'eth0')  # 网卡名称
        self.cycle_time_ms = self.config.get('cycle_time_ms', 1)
        self.master = None
        self._connected = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
    def start(self):
        super().start()
        try:
            import pysoem
            self.master = pysoem.Master()
            self.master.open(self.interface)
            
            # 扫描从站
            if self.master.config_init() > 0:
                self.master.config_map()
                self.master.state_check(pysoem.SAFEOP_STATE, 50000)
                self.master.state = pysoem.OP_STATE
                self.master.write_state()
                self.master.state_check(pysoem.OP_STATE, 50000)
                
                self._connected = True
                self.set_output("connected", True)
                self.set_output("slave_count", len(self.master.slaves))
                self.set_output("state", "OP")
                
                # 启动循环线程
                self._stop_event.clear()
                self._thread = threading.Thread(target=self._cycle_loop, daemon=True)
                self._thread.start()
                
                logger.info(f"EtherCAT Master started on {self.interface}, {len(self.master.slaves)} slaves found")
            else:
                self.set_output("connected", False)
                self.set_output("error", "No slaves found")
                
        except ImportError:
            logger.warning("pysoem not installed, EtherCAT running in simulation mode")
            self._connected = True
            self.set_output("connected", True)
            self.set_output("slave_count", 0)
            self.set_output("state", "SIMULATION")
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"EtherCAT Master start failed: {e}")
    
    def _cycle_loop(self):
        """EtherCAT 周期循环"""
        while not self._stop_event.is_set():
            try:
                if self.master:
                    self.master.send_processdata()
                    self.master.receive_processdata(2000)
            except Exception as e:
                logger.error(f"EtherCAT cycle error: {e}")
            time.sleep(self.cycle_time_ms / 1000.0)
    
    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1.0)
        if self.master:
            try:
                self.master.state = 0x02  # INIT state
                self.master.write_state()
                self.master.close()
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
class EtherCATSlaveIOComponent(ComponentBase):
    """
    EtherCAT 从站 I/O 组件
    读写 EtherCAT 从站的过程数据
    """
    component_name = "EtherCATSlaveIO"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("master", PortType.ANY)  # 连接到 EtherCAT Master
        self.add_input_port("write_data", PortType.ARRAY)
        self.add_output_port("read_data", PortType.ARRAY)
        self.add_output_port("connected", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.slave_index = self.config.get('slave_index', 0)
        self.input_size = self.config.get('input_size', 8)  # 字节
        self.output_size = self.config.get('output_size', 8)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        # 模拟模式 - 返回模拟数据
        self.set_output("connected", True)
        self.set_output("read_data", [0] * self.input_size)


# ============ CANopen 组件 ============

@ComponentRegistry.register
class CANopenMasterComponent(ComponentBase):
    """
    CANopen 主站组件
    用于 CANopen 网络通信
    
    注意：需要安装 canopen 库：pip install canopen
    """
    component_name = "CANopenMaster"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("node_count", PortType.NUMBER)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.channel = self.config.get('channel', 'can0')
        self.bustype = self.config.get('bustype', 'socketcan')
        self.bitrate = self.config.get('bitrate', 500000)
        self.eds_file = self.config.get('eds_file', None)  # EDS 文件路径
        self.network = None
        self._connected = False
        
    def start(self):
        super().start()
        try:
            import canopen
            self.network = canopen.Network()
            self.network.connect(channel=self.channel, bustype=self.bustype, bitrate=self.bitrate)
            
            # 扫描节点
            self.network.scanner.search()
            time.sleep(0.5)
            
            self._connected = True
            self.set_output("connected", True)
            self.set_output("node_count", len(self.network.scanner.nodes))
            
            logger.info(f"CANopen Master started on {self.channel}, {len(self.network.scanner.nodes)} nodes found")
            
        except ImportError:
            logger.warning("canopen not installed, running in simulation mode")
            self._connected = True
            self.set_output("connected", True)
            self.set_output("node_count", 0)
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"CANopen Master start failed: {e}")
    
    def stop(self):
        if self.network:
            try:
                self.network.disconnect()
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
class CANopenNodeComponent(ComponentBase):
    """
    CANopen 节点组件
    读写 CANopen 节点的对象字典
    """
    component_name = "CANopenNode"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("network", PortType.ANY)
        self.add_input_port("write_value", PortType.NUMBER)
        self.add_output_port("read_value", PortType.NUMBER)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("state", PortType.STRING)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 1)
        self.read_index = self.config.get('read_index', 0x6000)  # 默认读取 TxPDO
        self.read_subindex = self.config.get('read_subindex', 0)
        self.write_index = self.config.get('write_index', 0x6200)  # 默认写入 RxPDO
        self.write_subindex = self.config.get('write_subindex', 0)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        # 模拟模式
        self.set_output("connected", True)
        self.set_output("state", "OPERATIONAL")
        self.set_output("read_value", 0)


@ComponentRegistry.register
class CANopenPDOComponent(ComponentBase):
    """
    CANopen PDO 组件
    处理过程数据对象
    """
    component_name = "CANopenPDO"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("network", PortType.ANY)
        self.add_input_port("tx_data", PortType.ARRAY)
        self.add_output_port("rx_data", PortType.ARRAY)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 1)
        self.pdo_number = self.config.get('pdo_number', 1)  # 1-4
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        self.set_output("rx_data", [0, 0, 0, 0, 0, 0, 0, 0])


# ============ OPC UA 组件 ============

@ComponentRegistry.register
class OPCUAClientComponent(ComponentBase):
    """
    OPC UA 客户端组件
    连接 OPC UA 服务器并读写数据
    
    注意：需要安装 opcua 库：pip install opcua
    """
    component_name = "OPCUAClient"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("server_state", PortType.STRING)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.endpoint = self.config.get('endpoint', 'opc.tcp://localhost:4840')
        self.username = self.config.get('username', None)
        self.password = self.config.get('password', None)
        self.security_policy = self.config.get('security_policy', None)
        self.client = None
        self._connected = False
        
    def start(self):
        super().start()
        try:
            from opcua import Client
            self.client = Client(self.endpoint)
            
            if self.username and self.password:
                self.client.set_user(self.username)
                self.client.set_password(self.password)
            
            self.client.connect()
            self._connected = True
            
            self.set_output("connected", True)
            self.set_output("server_state", "Connected")
            
            logger.info(f"OPC UA Client connected to {self.endpoint}")
            
        except ImportError:
            logger.warning("opcua not installed, running in simulation mode")
            self._connected = True
            self.set_output("connected", True)
            self.set_output("server_state", "SIMULATION")
        except Exception as e:
            self.set_output("connected", False)
            self.set_output("error", str(e))
            logger.error(f"OPC UA Client connect failed: {e}")
    
    def stop(self):
        if self.client:
            try:
                self.client.disconnect()
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
class OPCUANodeReaderComponent(ComponentBase):
    """
    OPC UA 节点读取组件
    读取 OPC UA 服务器上的节点值
    """
    component_name = "OPCUANodeReader"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("quality", PortType.STRING)
        self.add_output_port("timestamp", PortType.STRING)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 'ns=2;i=1')
        self.poll_interval_ms = self.config.get('poll_interval_ms', 1000)
        self._last_poll = 0
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        current_time = time.time() * 1000
        if current_time - self._last_poll >= self.poll_interval_ms:
            self._last_poll = current_time
            # 模拟模式
            self.set_output("value", 0)
            self.set_output("quality", "Good")
            self.set_output("timestamp", time.strftime("%Y-%m-%d %H:%M:%S"))


@ComponentRegistry.register
class OPCUANodeWriterComponent(ComponentBase):
    """
    OPC UA 节点写入组件
    写入值到 OPC UA 服务器节点
    """
    component_name = "OPCUANodeWriter"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_input_port("value", PortType.NUMBER)
        self.add_input_port("trigger", PortType.BOOLEAN)
        self.add_output_port("success", PortType.BOOLEAN)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 'ns=2;i=1')
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        trigger = self.get_input("trigger")
        value = self.get_input("value")
        
        if trigger and value is not None:
            # 模拟模式
            self.set_output("success", True)
            self.set_output("error", "")


@ComponentRegistry.register
class OPCUASubscriptionComponent(ComponentBase):
    """
    OPC UA 订阅组件
    订阅 OPC UA 节点变化
    """
    component_name = "OPCUASubscription"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("changed", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.node_ids = self.config.get('node_ids', ['ns=2;i=1'])
        self.publish_interval_ms = self.config.get('publish_interval_ms', 500)
        self._last_value = None
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        # 模拟模式
        import random
        new_value = random.random() * 100
        changed = self._last_value != new_value
        self._last_value = new_value
        
        self.set_output("value", new_value)
        self.set_output("changed", changed)

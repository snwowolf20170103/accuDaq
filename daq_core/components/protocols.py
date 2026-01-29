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
        self.add_output_port("master_ref", PortType.ANY)  # 组件实例引用，供 SlaveIO 使用
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("slave_count", PortType.NUMBER)
        self.add_output_port("state", PortType.STRING)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.interface = self.config.get('interface', 'eth0')  # 网卡名称
        self.cycle_time_ms = self.config.get('cycle_time_ms', 1)
        self.master = None
        self._connected = False
        self._simulation_mode = False
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
                self._simulation_mode = False
                self.set_output("connected", True)
                self.set_output("slave_count", len(self.master.slaves))
                self.set_output("state", "OP")
                self.set_output("master_ref", self)  # 传递组件实例
                
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
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("slave_count", 2)  # 模拟 2 个从站
            self.set_output("state", "SIMULATION")
            self.set_output("master_ref", self)  # 模拟模式也传递实例
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
    读写 EtherCAT 从站的过程数据，支持 MQTT 转发
    
    配置项：
    - slave_index: 从站索引（0 开始）
    - input_size: 输入数据大小（字节）
    - output_size: 输出数据大小（字节）
    - mqtt_enabled: 是否启用 MQTT 转发
    - mqtt_broker: MQTT Broker 地址
    - mqtt_port: MQTT 端口
    - mqtt_topic: MQTT 主题
    """
    component_name = "EtherCATSlaveIO"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("master", PortType.ANY)  # 连接到 EtherCAT Master
        self.add_input_port("write_data", PortType.ARRAY)
        self.add_output_port("read_data", PortType.ARRAY)
        self.add_output_port("raw_data", PortType.OBJECT)
        self.add_output_port("connected", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.slave_index = self.config.get('slave_index', 0)
        self.input_size = self.config.get('input_size', 8)  # 字节
        self.output_size = self.config.get('output_size', 8)
        
        # MQTT 转发配置
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'ethercat/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 100)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        
        # 初始化 MQTT 客户端
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
                logger.info(f"EtherCAT SlaveIO: MQTT connected to {self.mqtt_broker}:{self.mqtt_port}")
            except Exception as e:
                logger.error(f"EtherCAT SlaveIO: MQTT connection failed: {e}")
                self._mqtt_client = None
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import json
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        # 获取主站组件
        master_component = self.get_input("master")
        write_data = self.get_input("write_data")
        
        is_simulation = True
        read_data = [0] * self.input_size
        
        if master_component and hasattr(master_component, 'master'):
            pysoem_master = master_component.master
            is_simulation = getattr(master_component, '_simulation_mode', True)
            
            if not is_simulation and pysoem_master:
                try:
                    # 获取从站
                    if self.slave_index < len(pysoem_master.slaves):
                        slave = pysoem_master.slaves[self.slave_index]
                        
                        # 读取输入数据
                        read_data = list(slave.input)
                        
                        # 写入输出数据
                        if write_data and len(write_data) <= len(slave.output):
                            slave.output = bytes(write_data)
                            
                except Exception as e:
                    logger.error(f"EtherCAT SlaveIO read error: {e}")
        
        if is_simulation:
            # 模拟模式：生成模拟数据
            self._simulation_counter += 1
            for i in range(self.input_size):
                read_data[i] = int((50 + 30 * math.sin(self._simulation_counter * 0.1 + i)) % 256)
        
        # 构建数据包
        data = {
            "slave_index": self.slave_index,
            "read_data": read_data,
            "timestamp": timestamp_str,
            "source": "simulation" if is_simulation else "ethercat"
        }
        
        # 设置输出
        self.set_output("connected", True)
        self.set_output("read_data", read_data)
        self.set_output("raw_data", data)
        
        # MQTT 转发
        if self.mqtt_enabled and self._mqtt_client:
            try:
                payload = json.dumps(data)
                self._mqtt_client.publish(self.mqtt_topic, payload)
                logger.debug(f"EtherCAT -> MQTT: {self.mqtt_topic} = {payload}")
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


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
        self.add_output_port("network_ref", PortType.ANY)  # 组件实例引用，供 Node/PDO 使用
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
        self._simulation_mode = False
        
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
            self._simulation_mode = False
            self.set_output("connected", True)
            self.set_output("node_count", len(self.network.scanner.nodes))
            self.set_output("network_ref", self)  # 传递组件实例
            
            logger.info(f"CANopen Master started on {self.channel}, {len(self.network.scanner.nodes)} nodes found")
            
        except ImportError:
            logger.warning("canopen not installed, running in simulation mode")
            self._connected = True
            self._simulation_mode = True
            self.set_output("connected", True)
            self.set_output("node_count", 2)  # 模拟 2 个节点
            self.set_output("network_ref", self)  # 模拟模式也传递实例
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
    读写 CANopen 节点的对象字典 (SDO)，支持 MQTT 转发
    
    配置项：
    - node_id: 节点 ID (1-127)
    - read_index: 读取的对象字典索引 (如 0x6000)
    - read_subindex: 读取的子索引
    - write_index: 写入的对象字典索引
    - write_subindex: 写入的子索引
    - mqtt_enabled: 是否启用 MQTT 转发
    - mqtt_topic: MQTT 主题
    """
    component_name = "CANopenNode"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("network", PortType.ANY)
        self.add_input_port("write_value", PortType.NUMBER)
        self.add_output_port("read_value", PortType.NUMBER)
        self.add_output_port("raw_data", PortType.OBJECT)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("state", PortType.STRING)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 1)
        self.read_index = self.config.get('read_index', 0x6000)
        self.read_subindex = self.config.get('read_subindex', 0)
        self.write_index = self.config.get('write_index', 0x6200)
        self.write_subindex = self.config.get('write_subindex', 0)
        
        # MQTT 转发配置
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'canopen/data')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 100)
        self._simulation_counter = 0
        self._node = None
    
    def start(self):
        super().start()
        
        # 初始化 MQTT 客户端
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
                logger.info(f"CANopen Node: MQTT connected to {self.mqtt_broker}:{self.mqtt_port}")
            except Exception as e:
                logger.error(f"CANopen Node: MQTT connection failed: {e}")
                self._mqtt_client = None
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import json
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        # 获取网络组件
        network_component = self.get_input("network")
        write_value = self.get_input("write_value")
        
        is_simulation = True
        read_value = 0
        state = "UNKNOWN"
        
        if network_component and hasattr(network_component, 'network'):
            canopen_network = network_component.network
            is_simulation = getattr(network_component, '_simulation_mode', True)
            
            if not is_simulation and canopen_network:
                try:
                    # 获取或创建节点
                    if self._node is None:
                        self._node = canopen_network.add_node(self.node_id)
                    
                    # 读取 SDO
                    read_value = self._node.sdo[self.read_index][self.read_subindex].raw
                    state = str(self._node.nmt.state)
                    
                    # 写入 SDO
                    if write_value is not None:
                        self._node.sdo[self.write_index][self.write_subindex].raw = int(write_value)
                        
                except Exception as e:
                    logger.error(f"CANopen Node read error: {e}")
                    state = "ERROR"
        
        if is_simulation:
            # 模拟模式：生成模拟数据
            self._simulation_counter += 1
            read_value = int(50 + 30 * math.sin(self._simulation_counter * 0.1))
            state = "OPERATIONAL"
        
        # 构建数据包
        data = {
            "node_id": self.node_id,
            "read_index": hex(self.read_index),
            "read_subindex": self.read_subindex,
            "value": read_value,
            "state": state,
            "timestamp": timestamp_str,
            "source": "simulation" if is_simulation else "canopen"
        }
        
        # 设置输出
        self.set_output("connected", True)
        self.set_output("read_value", read_value)
        self.set_output("state", state)
        self.set_output("raw_data", data)
        
        # MQTT 转发
        if self.mqtt_enabled and self._mqtt_client:
            try:
                payload = json.dumps(data)
                self._mqtt_client.publish(self.mqtt_topic, payload)
                logger.debug(f"CANopen -> MQTT: {self.mqtt_topic} = {payload}")
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


@ComponentRegistry.register
class CANopenPDOComponent(ComponentBase):
    """
    CANopen PDO 组件
    处理过程数据对象，支持 MQTT 转发
    
    配置项：
    - node_id: 节点 ID (1-127)
    - pdo_number: PDO 编号 (1-4)
    - mqtt_enabled: 是否启用 MQTT 转发
    - mqtt_topic: MQTT 主题
    """
    component_name = "CANopenPDO"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("network", PortType.ANY)
        self.add_input_port("tx_data", PortType.ARRAY)
        self.add_output_port("rx_data", PortType.ARRAY)
        self.add_output_port("raw_data", PortType.OBJECT)
        self.add_output_port("connected", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 1)
        self.pdo_number = self.config.get('pdo_number', 1)  # 1-4
        
        # MQTT 转发配置
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'canopen/pdo')
        
        self._mqtt_client = None
        self._last_poll = 0
        self._poll_interval_ms = self.config.get('poll_interval_ms', 100)
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        
        # 初始化 MQTT 客户端
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
                logger.info(f"CANopen PDO: MQTT connected to {self.mqtt_broker}:{self.mqtt_port}")
            except Exception as e:
                logger.error(f"CANopen PDO: MQTT connection failed: {e}")
                self._mqtt_client = None
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import json
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self._poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        # 获取网络组件
        network_component = self.get_input("network")
        tx_data = self.get_input("tx_data")
        
        is_simulation = True
        rx_data = [0] * 8  # CAN 帧最大 8 字节
        
        if network_component and hasattr(network_component, 'network'):
            canopen_network = network_component.network
            is_simulation = getattr(network_component, '_simulation_mode', True)
            
            if not is_simulation and canopen_network:
                try:
                    # 获取节点
                    node = canopen_network.add_node(self.node_id)
                    
                    # 读取 RPDO (接收 PDO)
                    rpdo = node.rpdo[self.pdo_number]
                    if rpdo.is_received:
                        rx_data = list(rpdo.data)[:8]
                    
                    # 发送 TPDO (发送 PDO)
                    if tx_data:
                        tpdo = node.tpdo[self.pdo_number]
                        tpdo.data = bytes(tx_data[:8])
                        tpdo.transmit()
                        
                except Exception as e:
                    logger.error(f"CANopen PDO error: {e}")
        
        if is_simulation:
            # 模拟模式：生成模拟数据
            self._simulation_counter += 1
            for i in range(8):
                rx_data[i] = int((50 + 30 * math.sin(self._simulation_counter * 0.1 + i)) % 256)
        
        # 构建数据包
        data = {
            "node_id": self.node_id,
            "pdo_number": self.pdo_number,
            "rx_data": rx_data,
            "timestamp": timestamp_str,
            "source": "simulation" if is_simulation else "canopen"
        }
        
        # 设置输出
        self.set_output("connected", True)
        self.set_output("rx_data", rx_data)
        self.set_output("raw_data", data)
        
        # MQTT 转发
        if self.mqtt_enabled and self._mqtt_client:
            try:
                payload = json.dumps(data)
                self._mqtt_client.publish(self.mqtt_topic, payload)
                logger.debug(f"CANopen PDO -> MQTT: {self.mqtt_topic} = {payload}")
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


# ============ OPC UA 组件 ============

@ComponentRegistry.register
class OPCUAClientComponent(ComponentBase):
    """
    OPC UA 客户端组件
    连接 OPC UA 服务器并读写数据
    
    支持功能：
    - 连接到 OPC UA 服务器
    - 用户名/密码认证
    - 自动重连
    - 浏览服务器地址空间
    
    注意：需要安装 opcua 库：pip install opcua
    或更现代的 asyncua 库：pip install asyncua
    """
    component_name = "OPCUAClient"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("client_ref", PortType.ANY)  # 组件实例引用，供 Reader 使用
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("server_state", PortType.STRING)
        self.add_output_port("namespace_array", PortType.ARRAY)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.endpoint = self.config.get('endpoint', 'opc.tcp://localhost:4840')
        self.username = self.config.get('username', None)
        self.password = self.config.get('password', None)
        self.security_policy = self.config.get('security_policy', None)
        self.auto_reconnect = self.config.get('auto_reconnect', True)
        self.reconnect_interval = self.config.get('reconnect_interval', 5)
        self.client = None
        self._connected = False
        self._simulation_mode = False
        self._reconnect_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
    def start(self):
        super().start()
        self._stop_event.clear()
        self._try_connect()
        
    def _try_connect(self):
        """尝试连接到 OPC UA 服务器"""
        try:
            from opcua import Client, ua
            self.client = Client(self.endpoint)
            
            # 设置认证
            if self.username and self.password:
                self.client.set_user(self.username)
                self.client.set_password(self.password)
            
            # 设置安全策略
            if self.security_policy:
                self.client.set_security_string(self.security_policy)
            
            self.client.connect()
            self._connected = True
            self._simulation_mode = False
            
            # 获取命名空间数组
            try:
                ns_array = self.client.get_namespace_array()
                self.set_output("namespace_array", ns_array)
            except:
                self.set_output("namespace_array", [])
            
            self.set_output("connected", True)
            self.set_output("server_state", "Connected")
            self.set_output("error", "")
            self.set_output("client_ref", self)  # 传递组件实例
            
            logger.info(f"OPC UA Client connected to {self.endpoint}")
            
        except ImportError:
            logger.error("opcua library not installed")
            self._connected = False
            self.set_output("connected", False)
            self.set_output("server_state", "Error: Library Missing")
            self.set_output("namespace_array", [])
            self.set_output("error", "opcua library not installed")
            
        except Exception as e:
            self._connected = False
            self.set_output("connected", False)
            self.set_output("server_state", "Disconnected")
            self.set_output("error", str(e))
            logger.error(f"OPC UA Client connect failed: {e}")
            
            # 启动自动重连
            if self.auto_reconnect and not self._stop_event.is_set():
                self._start_reconnect_thread()
    
    def _start_reconnect_thread(self):
        """启动重连线程"""
        if self._reconnect_thread is None or not self._reconnect_thread.is_alive():
            self._reconnect_thread = threading.Thread(target=self._reconnect_loop, daemon=True)
            self._reconnect_thread.start()
    
    def _reconnect_loop(self):
        """重连循环"""
        while not self._stop_event.is_set() and not self._connected:
            time.sleep(self.reconnect_interval)
            if not self._stop_event.is_set():
                logger.info(f"OPC UA Client attempting to reconnect to {self.endpoint}")
                self._try_connect()
    
    def stop(self):
        self._stop_event.set()
        if self._reconnect_thread:
            self._reconnect_thread.join(timeout=1.0)
        if self.client and not self._simulation_mode:
            try:
                self.client.disconnect()
            except:
                pass
        self._connected = False
        self.set_output("connected", False)
        self.set_output("server_state", "Stopped")
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self._connected:
            self.stop()
        elif enable is True and not self._connected:
            self.start()
    
    def get_client(self):
        """获取 OPC UA 客户端实例（供其他组件使用）"""
        return self.client if not self._simulation_mode else None
    
    def is_simulation(self):
        """是否在模拟模式"""
        return self._simulation_mode


@ComponentRegistry.register
class OPCUANodeReaderComponent(ComponentBase):
    """
    OPC UA 节点读取组件
    读取 OPC UA 服务器上的节点值，支持 MQTT 转发
    
    配置项：
    - node_id: OPC UA 节点 ID (如 "ns=2;i=1" 或 "ns=2;s=Temperature")
    - poll_interval_ms: 轮询间隔（毫秒）
    - mqtt_enabled: 是否启用 MQTT 转发
    - mqtt_broker: MQTT Broker 地址
    - mqtt_port: MQTT 端口
    - mqtt_topic: MQTT 主题
    """
    component_name = "OPCUANodeReader"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_output_port("value", PortType.ANY)
        self.add_output_port("quality", PortType.STRING)
        self.add_output_port("timestamp", PortType.STRING)
        self.add_output_port("raw_data", PortType.OBJECT)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 'ns=2;i=1')
        self.node_ids = self.config.get('node_ids', [])  # 支持批量读取
        self.poll_interval_ms = self.config.get('poll_interval_ms', 1000)
        self.data_type = self.config.get('data_type', 'auto')  # auto, float, int, string, bool
        
        # MQTT 转发配置
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'opcua/data')
        
        self._last_poll = 0
        self._mqtt_client = None
        self._node = None
        self._nodes = []
        self._simulation_counter = 0
    
    def start(self):
        super().start()
        
        # 初始化 MQTT 客户端
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
                logger.info(f"OPC UA Node Reader: MQTT connected to {self.mqtt_broker}:{self.mqtt_port}")
            except Exception as e:
                logger.error(f"OPC UA Node Reader: MQTT connection failed: {e}")
                self._mqtt_client = None
    
    def stop(self):
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import json
        import math
        
        current_time = time.time() * 1000
        if current_time - self._last_poll < self.poll_interval_ms:
            return
            
        self._last_poll = current_time
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
        
        # 获取客户端组件
        client_component = self.get_input("client")
        
        # 检查是否模拟模式
        is_simulation = True
        opc_client = None
        
        if client_component and hasattr(client_component, 'get_client'):
            opc_client = client_component.get_client()
            is_simulation = client_component.is_simulation() if hasattr(client_component, 'is_simulation') else (opc_client is None)
        
        if is_simulation or opc_client is None:
            # 不生成模拟数据，只报告状态
            value = None
            quality = "Bad (Not Connected)"
            data = {
                "node_id": self.node_id,
                "value": None,
                "quality": quality,
                "timestamp": timestamp_str,
                "error": "Client not connected",
                "source": "none"
            }
        else:
            # 真实读取模式
            try:
                from opcua import ua
                
                # 解析节点 ID
                if self._node is None:
                    self._node = opc_client.get_node(self.node_id)
                
                # 读取节点值
                data_value = self._node.get_data_value()
                value = data_value.Value.Value
                quality = str(data_value.StatusCode)
                
                # 类型转换
                if self.data_type == 'float':
                    value = float(value)
                elif self.data_type == 'int':
                    value = int(value)
                elif self.data_type == 'string':
                    value = str(value)
                elif self.data_type == 'bool':
                    value = bool(value)
                
                data = {
                    "node_id": self.node_id,
                    "value": value,
                    "quality": quality,
                    "timestamp": timestamp_str,
                    "source_timestamp": str(data_value.SourceTimestamp),
                    "server_timestamp": str(data_value.ServerTimestamp),
                    "source": "opcua"
                }
                
            except Exception as e:
                logger.error(f"OPC UA read error: {e}")
                value = None
                quality = f"Bad ({str(e)})"
                data = {
                    "node_id": self.node_id,
                    "value": None,
                    "quality": quality,
                    "timestamp": timestamp_str,
                    "error": str(e),
                    "source": "opcua"
                }
        
        # 设置输出
        self.set_output("value", value if value is not None else 0)
        self.set_output("quality", quality)
        self.set_output("timestamp", timestamp_str)
        self.set_output("raw_data", data)
        
        # MQTT 转发
        if self.mqtt_enabled and self._mqtt_client:
            try:
                payload = json.dumps(data)
                self._mqtt_client.publish(self.mqtt_topic, payload)
                logger.debug(f"OPC UA -> MQTT: {self.mqtt_topic} = {payload}")
            except Exception as e:
                logger.error(f"MQTT publish error: {e}")


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
        self.add_input_port("value", PortType.ANY)
        self.add_input_port("trigger", PortType.BOOLEAN)
        self.add_output_port("success", PortType.BOOLEAN)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.node_id = self.config.get('node_id', 'ns=2;i=1')
        self.data_type = self.config.get('data_type', 'auto')  # auto, float, int, string, bool
        self._node = None
        self._last_trigger = False
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        trigger = self.get_input("trigger")
        value = self.get_input("value")
        
        # 边沿触发（仅在 trigger 从 False 变为 True 时执行）
        if trigger and not self._last_trigger and value is not None:
            client_component = self.get_input("client")
            
            is_simulation = True
            opc_client = None
            
            if client_component and hasattr(client_component, 'get_client'):
                opc_client = client_component.get_client()
                is_simulation = opc_client is None
            
            if is_simulation:
                # 模拟模式
                logger.info(f"OPC UA Write (Simulation): {self.node_id} = {value}")
                self.set_output("success", True)
                self.set_output("error", "")
            else:
                # 真实写入
                try:
                    from opcua import ua
                    
                    if self._node is None:
                        self._node = opc_client.get_node(self.node_id)
                    
                    # 根据配置转换类型
                    if self.data_type == 'float':
                        typed_value = ua.Variant(float(value), ua.VariantType.Float)
                    elif self.data_type == 'int':
                        typed_value = ua.Variant(int(value), ua.VariantType.Int32)
                    elif self.data_type == 'string':
                        typed_value = ua.Variant(str(value), ua.VariantType.String)
                    elif self.data_type == 'bool':
                        typed_value = ua.Variant(bool(value), ua.VariantType.Boolean)
                    else:
                        typed_value = ua.DataValue(ua.Variant(value))
                    
                    self._node.set_value(typed_value)
                    
                    self.set_output("success", True)
                    self.set_output("error", "")
                    logger.info(f"OPC UA Write: {self.node_id} = {value}")
                    
                except Exception as e:
                    self.set_output("success", False)
                    self.set_output("error", str(e))
                    logger.error(f"OPC UA write error: {e}")
        
        self._last_trigger = trigger


@ComponentRegistry.register
class OPCUASubscriptionComponent(ComponentBase):
    """
    OPC UA 订阅组件
    订阅 OPC UA 节点变化，支持 MQTT 转发
    
    当数据变化时才触发回调，比轮询更高效
    """
    component_name = "OPCUASubscription"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("client", PortType.ANY)
        self.add_output_port("values", PortType.OBJECT)
        self.add_output_port("last_value", PortType.NUMBER)
        self.add_output_port("changed", PortType.BOOLEAN)
        self.add_output_port("change_count", PortType.NUMBER)
    
    def _on_configure(self):
        self.node_ids = self.config.get('node_ids', ['ns=2;i=1'])
        self.publish_interval_ms = self.config.get('publish_interval_ms', 500)
        
        # MQTT 转发配置
        self.mqtt_enabled = self.config.get('mqtt_enabled', False)
        self.mqtt_broker = self.config.get('mqtt_broker', 'localhost')
        self.mqtt_port = self.config.get('mqtt_port', 1883)
        self.mqtt_topic = self.config.get('mqtt_topic', 'opcua/subscription')
        
        self._subscription = None
        self._handles = []
        self._values = {}
        self._last_value = None
        self._changed = False
        self._change_count = 0
        self._mqtt_client = None
        self._lock = threading.Lock()
        
        # 模拟模式相关
        self._simulation_counter = 0
        self._last_simulation_time = 0
    
    def start(self):
        super().start()
        
        # 初始化 MQTT 客户端
        if self.mqtt_enabled:
            try:
                import paho.mqtt.client as mqtt
                self._mqtt_client = mqtt.Client()
                self._mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
                self._mqtt_client.loop_start()
                logger.info(f"OPC UA Subscription: MQTT connected")
            except Exception as e:
                logger.error(f"OPC UA Subscription: MQTT connection failed: {e}")
    
    def _data_change_handler(self, node, val, data):
        """OPC UA 数据变化回调"""
        import json
        
        with self._lock:
            node_id = str(node.nodeid)
            self._values[node_id] = val
            self._last_value = val
            self._changed = True
            self._change_count += 1
            
            # MQTT 转发
            if self.mqtt_enabled and self._mqtt_client:
                try:
                    payload = json.dumps({
                        "node_id": node_id,
                        "value": val if not hasattr(val, '__iter__') or isinstance(val, str) else list(val),
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "change_count": self._change_count
                    })
                    self._mqtt_client.publish(self.mqtt_topic, payload)
                except Exception as e:
                    logger.error(f"MQTT publish error: {e}")
    
    def stop(self):
        if self._subscription:
            try:
                self._subscription.delete()
            except:
                pass
        if self._mqtt_client:
            try:
                self._mqtt_client.loop_stop()
                self._mqtt_client.disconnect()
            except:
                pass
        super().stop()
        
    def process(self):
        import json
        import math
        
        client_component = self.get_input("client")
        
        is_simulation = True
        opc_client = None
        
        if client_component and hasattr(client_component, 'get_client'):
            opc_client = client_component.get_client()
            is_simulation = client_component.is_simulation() if hasattr(client_component, 'is_simulation') else (opc_client is None)
        
        if is_simulation or opc_client is None:
             # 如果是模拟模式或未连接，不做任何操作
             return
        else:
            # 真实订阅模式
            if self._subscription is None and opc_client:
                try:
                    from opcua import Client
                    
                    # 创建订阅
                    handler = SubHandler(self._data_change_handler)
                    self._subscription = opc_client.create_subscription(
                        self.publish_interval_ms, handler
                    )
                    
                    # 添加监控项
                    for node_id in self.node_ids:
                        node = opc_client.get_node(node_id)
                        handle = self._subscription.subscribe_data_change(node)
                        self._handles.append(handle)
                    
                    logger.info(f"OPC UA Subscription created for {len(self.node_ids)} nodes")
                    
                except Exception as e:
                    logger.error(f"OPC UA Subscription error: {e}")
        
        # 设置输出
        with self._lock:
            self.set_output("values", dict(self._values))
            self.set_output("last_value", self._last_value if self._last_value is not None else 0)
            self.set_output("changed", self._changed)
            self.set_output("change_count", self._change_count)
            self._changed = False


class SubHandler:
    """OPC UA 订阅处理器"""
    def __init__(self, callback):
        self.callback = callback
    
    def datachange_notification(self, node, val, data):
        self.callback(node, val, data)
    
    def event_notification(self, event):
        pass

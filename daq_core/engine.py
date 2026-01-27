"""
DAQ 引擎 - 组件运行时核心
负责加载、管理和调度组件执行
"""

import logging
import time
import threading
from typing import Any, Dict, List, Optional, Tuple

from .components.base import ComponentBase, ComponentRegistry

logger = logging.getLogger(__name__)


class Connection:
    """组件间连接定义"""

    def __init__(
        self,
        source_component_id: str,
        source_port: str,
        target_component_id: str,
        target_port: str
    ):
        self.source_component_id = source_component_id
        self.source_port = source_port
        self.target_component_id = target_component_id
        self.target_port = target_port

    def to_dict(self) -> Dict[str, str]:
        return {
            "source_component_id": self.source_component_id,
            "source_port": self.source_port,
            "target_component_id": self.target_component_id,
            "target_port": self.target_port,
        }


class DAQEngine:
    """
    DAQ 引擎
    负责组件的生命周期管理和数据流调度
    """

    def __init__(self):
        self._components: Dict[str, ComponentBase] = {}
        self._connections: List[Connection] = []
        self._is_running = False
        self._main_loop_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._tick_interval = 0.1  # 100ms
        
        # 调试功能
        self._debug_enabled = False
        self._mqtt_client = None
        self._debug_topic_base = "accudaq/debug/flow"

        # 配置日志
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        )
        
    def add_component(self, type_name: str, instance_id: str, config: Dict[str, Any] = None) -> ComponentBase:
        """添加并配置组件"""
        component = ComponentRegistry.create(type_name, instance_id, config)
        if component is None:
            raise ValueError(f"无法创建组件: {type_name}")
        self._components[instance_id] = component
        return component

    def get_component(self, instance_id: str) -> Optional[ComponentBase]:
        """获取组件实例"""
        return self._components.get(instance_id)

    def connect(self, source_id: str, source_port: str, target_id: str, target_port: str):
        """建立组件间的连接"""
        connection = Connection(source_id, source_port, target_id, target_port)
        self._connections.append(connection)
        logger.debug(f"建立连接: {source_id}:{source_port} -> {target_id}:{target_port}")

    def enable_debug(self, host='localhost', port=1883):
        """开启调试模式，推送数据流到 MQTT"""
        try:
            import paho.mqtt.client as mqtt
            import json
            
            self._mqtt_client = mqtt.Client()
            self._mqtt_client.connect(host, port, 60)
            self._mqtt_client.loop_start()
            self._debug_enabled = True
            logging.info(f"调试模式已开启 (MQTT: {host}:{port})")
        except ImportError:
            logging.warning("无法开启调试模式: 缺少 paho-mqtt 库")
        except Exception as e:
            logging.error(f"开启调试模式失败: {e}")

    def _transfer_data(self):
        """传输连接间的数据"""
        for conn in self._connections:
            source = self._components.get(conn.source_component_id)
            target = self._components.get(conn.target_component_id)

            if source and target:
                if conn.source_port in source.output_ports:
                    value = source.output_ports[conn.source_port].get_value()
                    
                    # 只有当值不为 None 时才传输和报告
                    if value is not None:
                        # 调试发布
                        if self._debug_enabled and self._mqtt_client:
                            try:
                                # 构造唯一的 topic ID
                                # 格式: accudaq/debug/edge/sourceId___sourcePort___targetId___targetPort
                                edge_key = f"{conn.source_component_id}___{conn.source_port}___{conn.target_component_id}___{conn.target_port}"
                                topic = f"accudaq/debug/edge/{edge_key}"
                                
                                # Payload 只发 value，为了减少带宽，或者发简单对象
                                payload = value
                                
                                import json
                                self._mqtt_client.publish(topic, json.dumps(payload))
                            except Exception:
                                pass # 忽略调试过程中的错误

                        if conn.target_port in target.input_ports:
                            target.input_ports[conn.target_port].set_value(value)

    # 需要在主循环中主动调用 process() 的组件
    # MQTT/MockDevice 有自己的线程，不需要在这里处理
    _PROCESS_COMPONENTS = {
        "MathOperation", "Compare", "CSVStorage", "CustomScript",
        "ThresholdAlarm", "DebugPrint", "GlobalVariable", "ModbusClient",
        "WhileLoop", "Conditional",
        # MQTT 发布和数据探针
        "MQTTPublisher", "DataProbe",
        # 高级算法组件
        "FFT", "MovingAverageFilter", "LowPassFilter", "HighPassFilter",
        "PIDController", "KalmanFilter", "Statistics",
        # 协议子组件（需要主动轮询）
        "EtherCATSlaveIO", "CANopenNode", "CANopenPDO",
        "OPCUANodeReader", "OPCUANodeWriter", "OPCUASubscription",
        # 串口和 SCPI 组件
        "SerialPort", "ModbusRTU", "SCPIDevice",
        # USB 和蓝牙组件
        "USBDevice", "USBHID", "BluetoothRFCOMM", "BLEDevice",
        # FPGA 子组件
        "FPGARegisterRead", "FPGARegisterWrite", "FPGAADC", "FPGADAC", "FPGADMA", "FPGAPWM",
    }

    def _main_loop(self):
        """主循环 - 定时触发组件处理"""
        while not self._stop_event.is_set():
            try:
                # 1. 传输数据
                self._transfer_data()

                # 2. 处理各组件（跳过有自己循环的组件）
                for component in self._components.values():
                    if component._is_running:
                        # 只对需要主动触发的组件调用 process
                        if component.component_name in self._PROCESS_COMPONENTS:
                            component.process()

            except Exception as e:
                logger.error(f"主循环异常: {e}")

            self._stop_event.wait(self._tick_interval)

    def start(self):
        """启动引擎"""
        if self._is_running:
            logger.warning("引擎已在运行")
            return

        logger.info("启动 DAQ 引擎...")

        # 启动所有组件
        for component in self._components.values():
            try:
                component.start()
            except Exception as e:
                logger.error(f"组件 {component.instance_id} 启动失败: {e}")

        # 启动主循环
        self._stop_event.clear()
        self._main_loop_thread = threading.Thread(target=self._main_loop, daemon=True)
        self._main_loop_thread.start()

        self._is_running = True
        logger.info("DAQ 引擎已启动")

    def stop(self):
        """停止引擎"""
        if not self._is_running:
            return

        logger.info("停止 DAQ 引擎...")

        # 停止主循环
        self._stop_event.set()
        if self._main_loop_thread:
            self._main_loop_thread.join(timeout=2)

        # 停止所有组件
        for component in self._components.values():
            try:
                component.stop()
            except Exception as e:
                logger.error(f"组件 {component.instance_id} 停止失败: {e}")

        self._is_running = False
        logger.info("DAQ 引擎已停止")

    def destroy(self):
        """销毁引擎，释放所有资源"""
        self.stop()
        for component in list(self._components.values()):
            component.destroy()
        self._components.clear()
        self._connections.clear()
        logger.info("DAQ 引擎已销毁")

    def get_status(self) -> Dict[str, Any]:
        """获取引擎状态"""
        return {
            "is_running": self._is_running,
            "component_count": len(self._components),
            "connection_count": len(self._connections),
            "components": [
                {
                    "id": c.instance_id,
                    "name": c.component_name,
                    "type": c.component_type.value,
                    "running": c._is_running
                }
                for c in self._components.values()
            ],
            "connections": [c.to_dict() for c in self._connections]
        }

    def list_available_components(self) -> List[Dict[str, Any]]:
        """列出所有可用组件"""
        return ComponentRegistry.list_all()

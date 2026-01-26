"""
蓝牙设备组件
支持 Bluetooth Classic (RFCOMM) 和 BLE (Bluetooth Low Energy)
"""

import logging
import threading
import time
from typing import Any, Dict, List, Optional, Callable

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)

# 尝试导入蓝牙相关库
try:
    import bluetooth
    BT_CLASSIC_AVAILABLE = True
except ImportError:
    BT_CLASSIC_AVAILABLE = False
    bluetooth = None

try:
    from bleak import BleakClient, BleakScanner
    import asyncio
    BLE_AVAILABLE = True
except ImportError:
    BLE_AVAILABLE = False
    BleakClient = None
    BleakScanner = None


@ComponentRegistry.register
class BluetoothRFCOMMComponent(ComponentBase):
    """
    蓝牙 RFCOMM 组件（经典蓝牙）
    
    功能：
    - 通过 RFCOMM 协议连接蓝牙设备
    - 读取/写入数据
    - 支持自动重连
    
    配置参数：
        address: str - 蓝牙设备地址（如 "00:11:22:33:44:55"）
        port: int - RFCOMM 端口（默认 1）
        auto_reconnect: bool - 是否自动重连
    """
    
    component_type = ComponentType.DEVICE
    component_name = "BluetoothRFCOMM"
    component_description = "蓝牙 RFCOMM (经典蓝牙) 通信组件"
    component_icon = "📶"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._socket = None
        self._read_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_connected = False

    def _setup_ports(self):
        """设置输入输出端口"""
        self.add_input_port("write_data", PortType.STRING, "要发送的数据")
        self.add_input_port("send_trigger", PortType.BOOLEAN, "发送触发信号")
        
        self.add_output_port("read_data", PortType.STRING, "接收到的数据")
        self.add_output_port("raw_bytes", PortType.ARRAY, "原始字节数组")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("address", "")
        self.config.setdefault("port", 1)
        self.config.setdefault("auto_reconnect", True)
        self.config.setdefault("reconnect_interval", 5)
        self.config.setdefault("buffer_size", 1024)

    def start(self):
        """启动组件"""
        super().start()
        
        if not BT_CLASSIC_AVAILABLE:
            logger.error("PyBluez not installed. Install with: pip install PyBluez")
            self.set_output("error", "PyBluez not installed")
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
        
        self._disconnect()
        super().stop()

    def _connect(self) -> bool:
        """连接蓝牙设备"""
        if not BT_CLASSIC_AVAILABLE:
            return False
        
        address = self.config.get("address", "")
        if not address:
            self.set_output("error", "蓝牙地址未配置")
            return False
        
        try:
            port = self.config["port"]
            
            self._socket = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
            self._socket.connect((address, port))
            self._socket.setblocking(False)
            
            self._is_connected = True
            self.set_output("connected", True)
            self.set_output("error", "")
            
            logger.info(f"BluetoothRFCOMM ({self.instance_id}) 连接成功: {address}")
            return True
            
        except Exception as e:
            logger.error(f"蓝牙连接失败: {e}")
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            return False

    def _disconnect(self):
        """断开蓝牙连接"""
        if self._socket:
            try:
                self._socket.close()
            except:
                pass
        self._socket = None
        self._is_connected = False

    def _read_loop(self):
        """读取数据循环"""
        while not self._stop_event.is_set():
            try:
                if not self._is_connected:
                    if self.config.get("auto_reconnect", True):
                        time.sleep(self.config.get("reconnect_interval", 5))
                        self._connect()
                    else:
                        self._stop_event.wait(1)
                    continue
                
                try:
                    data = self._socket.recv(self.config["buffer_size"])
                    if data:
                        self.set_output("raw_bytes", list(data))
                        try:
                            str_data = data.decode('utf-8').strip()
                            self.set_output("read_data", str_data)
                        except:
                            self.set_output("read_data", data.hex())
                        logger.debug(f"BluetoothRFCOMM 接收: {data}")
                except bluetooth.btcommon.BluetoothError as e:
                    if "timed out" not in str(e).lower():
                        raise
                
                self._stop_event.wait(0.01)
                
            except Exception as e:
                logger.error(f"蓝牙读取错误: {e}")
                self._is_connected = False
                self.set_output("connected", False)
                self.set_output("error", str(e))

    def process(self):
        """处理发送请求"""
        if not self._is_running:
            return
        
        trigger = self.get_input("send_trigger")
        if trigger and self._socket and self._is_connected:
            write_data = self.get_input("write_data")
            if write_data:
                try:
                    self._socket.send(str(write_data).encode('utf-8'))
                    logger.debug(f"BluetoothRFCOMM 发送: {write_data}")
                except Exception as e:
                    logger.error(f"蓝牙发送失败: {e}")
                    self.set_output("error", str(e))

    def destroy(self):
        self.stop()
        super().destroy()

    @staticmethod
    def scan_devices(duration: int = 8) -> List[Dict[str, Any]]:
        """扫描附近的蓝牙设备"""
        if not BT_CLASSIC_AVAILABLE:
            return []
        
        try:
            devices = []
            nearby = bluetooth.discover_devices(duration=duration, lookup_names=True, lookup_class=True)
            for addr, name, device_class in nearby:
                devices.append({
                    "address": addr,
                    "name": name,
                    "device_class": device_class,
                })
            return devices
        except Exception as e:
            logger.error(f"扫描蓝牙设备失败: {e}")
            return []


@ComponentRegistry.register
class BLEDeviceComponent(ComponentBase):
    """
    BLE (Bluetooth Low Energy) 设备组件
    
    功能：
    - 通过 BLE 连接设备
    - 读取/写入 GATT 特征值
    - 支持通知订阅
    
    配置参数：
        address: str - BLE 设备地址
        service_uuid: str - 服务 UUID
        characteristic_uuid: str - 特征 UUID
        enable_notifications: bool - 是否启用通知
    """
    
    component_type = ComponentType.DEVICE
    component_name = "BLEDevice"
    component_description = "BLE (低功耗蓝牙) 通信组件"
    component_icon = "📡"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._client = None
        self._loop = None
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_connected = False
        self._last_notification = None

    def _setup_ports(self):
        """设置输入输出端口"""
        self.add_input_port("write_value", PortType.ARRAY, "要写入的字节数组")
        self.add_input_port("write_trigger", PortType.BOOLEAN, "写入触发信号")
        self.add_input_port("read_trigger", PortType.BOOLEAN, "读取触发信号")
        
        self.add_output_port("read_value", PortType.ARRAY, "读取到的字节数组")
        self.add_output_port("notification", PortType.ARRAY, "通知数据")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("address", "")
        self.config.setdefault("service_uuid", "")
        self.config.setdefault("characteristic_uuid", "")
        self.config.setdefault("enable_notifications", True)
        self.config.setdefault("auto_reconnect", True)

    def start(self):
        """启动组件"""
        super().start()
        
        if not BLE_AVAILABLE:
            logger.error("bleak not installed. Install with: pip install bleak")
            self.set_output("error", "bleak not installed")
            self.set_output("connected", False)
            return
        
        # 创建新的事件循环并在线程中运行
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_async_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """停止组件"""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        super().stop()

    def _run_async_loop(self):
        """运行异步事件循环"""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        
        try:
            self._loop.run_until_complete(self._async_main())
        except Exception as e:
            logger.error(f"BLE 异步循环错误: {e}")
        finally:
            self._loop.close()

    async def _async_main(self):
        """异步主函数"""
        address = self.config.get("address", "")
        if not address:
            self.set_output("error", "BLE 地址未配置")
            return
        
        while not self._stop_event.is_set():
            try:
                async with BleakClient(address) as client:
                    self._client = client
                    self._is_connected = True
                    self.set_output("connected", True)
                    self.set_output("error", "")
                    
                    logger.info(f"BLEDevice ({self.instance_id}) 连接成功: {address}")
                    
                    # 启用通知
                    char_uuid = self.config.get("characteristic_uuid", "")
                    if char_uuid and self.config.get("enable_notifications", True):
                        await client.start_notify(char_uuid, self._notification_handler)
                    
                    # 保持连接直到停止
                    while not self._stop_event.is_set() and client.is_connected:
                        await asyncio.sleep(0.1)
                    
                    if char_uuid and self.config.get("enable_notifications", True):
                        try:
                            await client.stop_notify(char_uuid)
                        except:
                            pass
                    
            except Exception as e:
                logger.error(f"BLE 连接错误: {e}")
                self._is_connected = False
                self.set_output("connected", False)
                self.set_output("error", str(e))
                
                if self.config.get("auto_reconnect", True) and not self._stop_event.is_set():
                    await asyncio.sleep(3)
                else:
                    break

    def _notification_handler(self, sender, data):
        """通知回调处理"""
        self._last_notification = list(data)
        self.set_output("notification", list(data))
        logger.debug(f"BLE 通知: {list(data)}")

    def process(self):
        """处理读写请求"""
        if not self._is_running or not self._client or not self._is_connected:
            return
        
        # 由于 BLE 操作是异步的，这里只做简单的状态更新
        pass

    def destroy(self):
        self.stop()
        super().destroy()

    @staticmethod
    async def scan_devices_async(timeout: float = 5.0) -> List[Dict[str, Any]]:
        """异步扫描 BLE 设备"""
        if not BLE_AVAILABLE:
            return []
        
        try:
            devices = await BleakScanner.discover(timeout=timeout)
            return [
                {
                    "address": d.address,
                    "name": d.name or "Unknown",
                    "rssi": d.rssi,
                }
                for d in devices
            ]
        except Exception as e:
            logger.error(f"扫描 BLE 设备失败: {e}")
            return []


@ComponentRegistry.register
class BluetoothScannerComponent(ComponentBase):
    """
    蓝牙设备扫描组件
    """
    
    component_type = ComponentType.DEVICE
    component_name = "BluetoothScanner"
    component_description = "扫描可用的蓝牙设备"
    component_icon = "🔍"

    def _setup_ports(self):
        self.add_input_port("scan_trigger", PortType.BOOLEAN, "触发扫描")
        self.add_input_port("scan_duration", PortType.NUMBER, "扫描时长（秒）")
        
        self.add_output_port("classic_devices", PortType.ARRAY, "经典蓝牙设备列表")
        self.add_output_port("ble_devices", PortType.ARRAY, "BLE 设备列表")
        self.add_output_port("scanning", PortType.BOOLEAN, "是否正在扫描")
        self.add_output_port("total_count", PortType.NUMBER, "设备总数")

    def start(self):
        super().start()

    def stop(self):
        super().stop()

    def _do_scan(self, duration: int = 5):
        """执行扫描"""
        self.set_output("scanning", True)
        
        # 扫描经典蓝牙
        classic_devices = BluetoothRFCOMMComponent.scan_devices(duration)
        self.set_output("classic_devices", classic_devices)
        
        # 扫描 BLE（需要异步）
        ble_devices = []
        if BLE_AVAILABLE:
            try:
                loop = asyncio.new_event_loop()
                ble_devices = loop.run_until_complete(BLEDeviceComponent.scan_devices_async(duration))
                loop.close()
            except Exception as e:
                logger.error(f"BLE 扫描失败: {e}")
        
        self.set_output("ble_devices", ble_devices)
        self.set_output("total_count", len(classic_devices) + len(ble_devices))
        self.set_output("scanning", False)
        
        logger.info(f"BluetoothScanner 发现 {len(classic_devices)} 个经典蓝牙, {len(ble_devices)} 个 BLE 设备")

    def process(self):
        trigger = self.get_input("scan_trigger")
        if trigger:
            duration = self.get_input("scan_duration") or 5
            # 在线程中运行扫描
            threading.Thread(target=self._do_scan, args=(int(duration),), daemon=True).start()

"""
USB 设备组件
支持 USB HID 设备通信和 USB-TMC（测试测量仪器）
"""

import logging
import threading
import time
from typing import Any, Dict, List, Optional

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)

# 尝试导入 USB 相关库
try:
    import usb.core
    import usb.util
    USB_AVAILABLE = True
except ImportError:
    USB_AVAILABLE = False
    usb = None

try:
    import hid
    HID_AVAILABLE = True
except ImportError:
    HID_AVAILABLE = False
    hid = None


@ComponentRegistry.register
class USBDeviceComponent(ComponentBase):
    """
    USB 设备组件
    
    功能：
    - 连接 USB 设备（通过 VID/PID）
    - 批量传输读写数据
    - 支持自动重连
    
    配置参数：
        vendor_id: int - 厂商 ID (VID)
        product_id: int - 产品 ID (PID)
        interface: int - 接口号（默认 0）
        endpoint_in: int - 输入端点（默认 0x81）
        endpoint_out: int - 输出端点（默认 0x01）
        timeout: int - 超时时间（毫秒）
        auto_reconnect: bool - 是否自动重连
    """
    
    component_type = ComponentType.DEVICE
    component_name = "USBDevice"
    component_description = "USB 设备通信组件"
    component_icon = "🔌"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._device = None
        self._read_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_connected = False

    def _setup_ports(self):
        """设置输入输出端口"""
        self.add_input_port("write_data", PortType.ARRAY, "要发送的字节数组")
        self.add_input_port("send_trigger", PortType.BOOLEAN, "发送触发信号")
        
        self.add_output_port("read_data", PortType.ARRAY, "接收到的字节数组")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("error", PortType.STRING, "错误信息")
        self.add_output_port("device_info", PortType.OBJECT, "设备信息")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("vendor_id", 0x0000)
        self.config.setdefault("product_id", 0x0000)
        self.config.setdefault("interface", 0)
        self.config.setdefault("endpoint_in", 0x81)
        self.config.setdefault("endpoint_out", 0x01)
        self.config.setdefault("timeout", 1000)
        self.config.setdefault("auto_reconnect", True)
        self.config.setdefault("read_size", 64)

    def start(self):
        """启动组件"""
        super().start()
        
        if not USB_AVAILABLE:
            logger.error("pyusb not installed. Install with: pip install pyusb")
            self.set_output("error", "pyusb not installed")
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
        """连接 USB 设备"""
        if not USB_AVAILABLE:
            return False
        
        try:
            vid = self.config["vendor_id"]
            pid = self.config["product_id"]
            
            self._device = usb.core.find(idVendor=vid, idProduct=pid)
            
            if self._device is None:
                logger.error(f"未找到 USB 设备 VID={hex(vid)} PID={hex(pid)}")
                self.set_output("connected", False)
                self.set_output("error", f"Device not found: VID={hex(vid)} PID={hex(pid)}")
                return False
            
            # 分离内核驱动
            if self._device.is_kernel_driver_active(self.config["interface"]):
                try:
                    self._device.detach_kernel_driver(self.config["interface"])
                except usb.core.USBError as e:
                    logger.warning(f"无法分离内核驱动: {e}")
            
            # 设置配置
            self._device.set_configuration()
            
            # 获取设备信息
            device_info = {
                "vendor_id": hex(vid),
                "product_id": hex(pid),
                "manufacturer": usb.util.get_string(self._device, self._device.iManufacturer) if self._device.iManufacturer else "",
                "product": usb.util.get_string(self._device, self._device.iProduct) if self._device.iProduct else "",
                "serial": usb.util.get_string(self._device, self._device.iSerialNumber) if self._device.iSerialNumber else "",
            }
            
            self._is_connected = True
            self.set_output("connected", True)
            self.set_output("device_info", device_info)
            self.set_output("error", "")
            
            logger.info(f"USBDevice ({self.instance_id}) 连接成功: {device_info.get('product', 'Unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"USB 连接失败: {e}")
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            return False

    def _disconnect(self):
        """断开 USB 连接"""
        if self._device:
            try:
                usb.util.dispose_resources(self._device)
            except:
                pass
        self._device = None
        self._is_connected = False

    def _read_loop(self):
        """读取数据循环"""
        while not self._stop_event.is_set():
            try:
                if not self._is_connected:
                    if self.config.get("auto_reconnect", True):
                        time.sleep(2)
                        self._connect()
                    else:
                        self._stop_event.wait(1)
                    continue
                
                # 读取数据
                endpoint_in = self.config["endpoint_in"]
                read_size = self.config["read_size"]
                timeout = self.config["timeout"]
                
                try:
                    data = self._device.read(endpoint_in, read_size, timeout)
                    if data:
                        self.set_output("read_data", list(data))
                        logger.debug(f"USBDevice 接收: {list(data)}")
                except usb.core.USBError as e:
                    if e.errno != 110:  # 忽略超时错误
                        raise
                
                self._stop_event.wait(0.01)
                
            except Exception as e:
                logger.error(f"USB 读取错误: {e}")
                self._is_connected = False
                self.set_output("connected", False)
                self.set_output("error", str(e))

    def _write_data(self, data: List[int]) -> bool:
        """写入数据到 USB 设备"""
        if not self._is_connected or not self._device:
            return False
        
        try:
            endpoint_out = self.config["endpoint_out"]
            self._device.write(endpoint_out, data)
            logger.debug(f"USBDevice 发送: {data}")
            return True
        except Exception as e:
            logger.error(f"USB 写入失败: {e}")
            self.set_output("error", str(e))
            return False

    def process(self):
        """处理发送请求"""
        if not self._is_running:
            return
        
        trigger = self.get_input("send_trigger")
        if trigger:
            write_data = self.get_input("write_data")
            if write_data:
                self._write_data(list(write_data))

    def destroy(self):
        self.stop()
        super().destroy()

    @staticmethod
    def scan_devices() -> List[Dict[str, Any]]:
        """扫描可用的 USB 设备"""
        if not USB_AVAILABLE:
            return []
        
        devices = []
        try:
            for dev in usb.core.find(find_all=True):
                devices.append({
                    "vendor_id": hex(dev.idVendor),
                    "product_id": hex(dev.idProduct),
                    "bus": dev.bus,
                    "address": dev.address,
                    "manufacturer": usb.util.get_string(dev, dev.iManufacturer) if dev.iManufacturer else "",
                    "product": usb.util.get_string(dev, dev.iProduct) if dev.iProduct else "",
                })
        except Exception as e:
            logger.error(f"扫描 USB 设备失败: {e}")
        
        return devices


@ComponentRegistry.register
class USBHIDComponent(ComponentBase):
    """
    USB HID 设备组件
    用于人机接口设备通信
    """
    
    component_type = ComponentType.DEVICE
    component_name = "USBHID"
    component_description = "USB HID 设备通信组件"
    component_icon = "🎮"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._device = None
        self._read_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_connected = False

    def _setup_ports(self):
        """设置输入输出端口"""
        self.add_input_port("write_data", PortType.ARRAY, "要发送的 HID 报告")
        self.add_input_port("send_trigger", PortType.BOOLEAN, "发送触发信号")
        
        self.add_output_port("read_data", PortType.ARRAY, "接收到的 HID 报告")
        self.add_output_port("connected", PortType.BOOLEAN, "连接状态")
        self.add_output_port("error", PortType.STRING, "错误信息")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("vendor_id", 0x0000)
        self.config.setdefault("product_id", 0x0000)
        self.config.setdefault("usage_page", None)
        self.config.setdefault("usage", None)
        self.config.setdefault("auto_reconnect", True)

    def start(self):
        """启动组件"""
        super().start()
        
        if not HID_AVAILABLE:
            logger.error("hidapi not installed. Install with: pip install hidapi")
            self.set_output("error", "hidapi not installed")
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
        
        if self._device:
            try:
                self._device.close()
            except:
                pass
        self._device = None
        self._is_connected = False
        super().stop()

    def _connect(self) -> bool:
        """连接 HID 设备"""
        if not HID_AVAILABLE:
            return False
        
        try:
            vid = self.config["vendor_id"]
            pid = self.config["product_id"]
            
            self._device = hid.device()
            self._device.open(vid, pid)
            self._device.set_nonblocking(True)
            
            self._is_connected = True
            self.set_output("connected", True)
            self.set_output("error", "")
            
            logger.info(f"USBHID ({self.instance_id}) 连接成功")
            return True
            
        except Exception as e:
            logger.error(f"HID 连接失败: {e}")
            self._is_connected = False
            self.set_output("connected", False)
            self.set_output("error", str(e))
            return False

    def _read_loop(self):
        """读取 HID 报告循环"""
        while not self._stop_event.is_set():
            try:
                if not self._is_connected:
                    if self.config.get("auto_reconnect", True):
                        time.sleep(2)
                        self._connect()
                    else:
                        self._stop_event.wait(1)
                    continue
                
                data = self._device.read(64)
                if data:
                    self.set_output("read_data", list(data))
                
                self._stop_event.wait(0.01)
                
            except Exception as e:
                logger.error(f"HID 读取错误: {e}")
                self._is_connected = False
                self.set_output("connected", False)

    def process(self):
        """处理发送请求"""
        if not self._is_running:
            return
        
        trigger = self.get_input("send_trigger")
        if trigger:
            write_data = self.get_input("write_data")
            if write_data and self._device:
                try:
                    self._device.write(list(write_data))
                except Exception as e:
                    logger.error(f"HID 写入失败: {e}")
                    self.set_output("error", str(e))

    def destroy(self):
        self.stop()
        super().destroy()

    @staticmethod
    def scan_devices() -> List[Dict[str, Any]]:
        """扫描可用的 HID 设备"""
        if not HID_AVAILABLE:
            return []
        
        try:
            return [
                {
                    "vendor_id": hex(d["vendor_id"]),
                    "product_id": hex(d["product_id"]),
                    "product_string": d.get("product_string", ""),
                    "manufacturer_string": d.get("manufacturer_string", ""),
                    "serial_number": d.get("serial_number", ""),
                    "path": d.get("path", b"").decode() if isinstance(d.get("path"), bytes) else d.get("path", ""),
                }
                for d in hid.enumerate()
            ]
        except Exception as e:
            logger.error(f"扫描 HID 设备失败: {e}")
            return []


@ComponentRegistry.register
class USBScannerComponent(ComponentBase):
    """
    USB 设备扫描组件
    """
    
    component_type = ComponentType.DEVICE
    component_name = "USBScanner"
    component_description = "扫描可用的 USB 设备"
    component_icon = "🔍"

    def _setup_ports(self):
        self.add_input_port("scan_trigger", PortType.BOOLEAN, "触发扫描")
        self.add_output_port("usb_devices", PortType.ARRAY, "USB 设备列表")
        self.add_output_port("hid_devices", PortType.ARRAY, "HID 设备列表")
        self.add_output_port("total_count", PortType.NUMBER, "设备总数")

    def start(self):
        super().start()
        self._do_scan()

    def stop(self):
        super().stop()

    def _do_scan(self):
        """执行扫描"""
        usb_devices = USBDeviceComponent.scan_devices()
        hid_devices = USBHIDComponent.scan_devices()
        
        self.set_output("usb_devices", usb_devices)
        self.set_output("hid_devices", hid_devices)
        self.set_output("total_count", len(usb_devices) + len(hid_devices))
        
        logger.info(f"USBScanner 发现 {len(usb_devices)} 个 USB 设备, {len(hid_devices)} 个 HID 设备")

    def process(self):
        trigger = self.get_input("scan_trigger")
        if trigger:
            self._do_scan()

"""
FPGA 支持模块
支持 FPGA 数据采集、高速 IO、自定义 IP 核通信
"""

import struct
import time
import threading
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import logging

from ..components.base import ComponentBase, PortType, ComponentType
from ..components.registry import ComponentRegistry

logger = logging.getLogger(__name__)


class FPGAInterface(Enum):
    """FPGA 接口类型"""
    AXI_LITE = "axi_lite"
    AXI_STREAM = "axi_stream"
    PCIE = "pcie"
    JTAG = "jtag"
    SPI = "spi"
    UART = "uart"
    ETHERNET = "ethernet"


@dataclass
class FPGARegister:
    """FPGA 寄存器定义"""
    name: str
    address: int
    width: int  # 位宽: 8, 16, 32, 64
    access: str  # "r", "w", "rw"
    description: str = ""
    default_value: int = 0


class FPGADriver:
    """
    FPGA 驱动基类
    提供与 FPGA 通信的基本接口
    """
    
    def __init__(self, interface: FPGAInterface, **kwargs):
        self.interface = interface
        self.connected = False
        self._lock = threading.Lock()
        
    def connect(self) -> bool:
        """连接 FPGA"""
        raise NotImplementedError
        
    def disconnect(self) -> None:
        """断开连接"""
        raise NotImplementedError
        
    def read_register(self, address: int, width: int = 32) -> int:
        """读取寄存器"""
        raise NotImplementedError
        
    def write_register(self, address: int, value: int, width: int = 32) -> bool:
        """写入寄存器"""
        raise NotImplementedError
        
    def read_memory(self, address: int, length: int) -> bytes:
        """读取内存块"""
        raise NotImplementedError
        
    def write_memory(self, address: int, data: bytes) -> bool:
        """写入内存块"""
        raise NotImplementedError


class SimulatedFPGADriver(FPGADriver):
    """
    模拟 FPGA 驱动
    用于开发和测试
    """
    
    def __init__(self, **kwargs):
        super().__init__(FPGAInterface.AXI_LITE, **kwargs)
        self._registers: Dict[int, int] = {}
        self._memory: bytearray = bytearray(1024 * 1024)  # 1MB 模拟内存
        
    def connect(self) -> bool:
        self.connected = True
        logger.info("Simulated FPGA connected")
        return True
        
    def disconnect(self) -> None:
        self.connected = False
        logger.info("Simulated FPGA disconnected")
        
    def read_register(self, address: int, width: int = 32) -> int:
        with self._lock:
            value = self._registers.get(address, 0)
            # 模拟一些动态值
            if address == 0x0000:  # 状态寄存器
                value = 0x01  # Ready
            elif address == 0x0010:  # ADC 数据模拟
                import random
                value = random.randint(0, 4095)  # 12-bit ADC
            return value
        
    def write_register(self, address: int, value: int, width: int = 32) -> bool:
        with self._lock:
            mask = (1 << width) - 1
            self._registers[address] = value & mask
            logger.debug(f"Write register 0x{address:08X} = 0x{value:08X}")
            return True
        
    def read_memory(self, address: int, length: int) -> bytes:
        with self._lock:
            return bytes(self._memory[address:address + length])
        
    def write_memory(self, address: int, data: bytes) -> bool:
        with self._lock:
            self._memory[address:address + len(data)] = data
            return True


class PCIeFPGADriver(FPGADriver):
    """
    PCIe FPGA 驱动
    通过 PCIe 与 FPGA 板卡通信
    """
    
    def __init__(self, device_path: str = "/dev/xdma0_user", **kwargs):
        super().__init__(FPGAInterface.PCIE, **kwargs)
        self.device_path = device_path
        self._fd = None
        
    def connect(self) -> bool:
        try:
            import os
            self._fd = os.open(self.device_path, os.O_RDWR)
            self.connected = True
            logger.info(f"PCIe FPGA connected: {self.device_path}")
            return True
        except (OSError, ImportError) as e:
            logger.error(f"PCIe FPGA connection failed: {e}")
            return False
        
    def disconnect(self) -> None:
        if self._fd is not None:
            import os
            os.close(self._fd)
            self._fd = None
        self.connected = False
        
    def read_register(self, address: int, width: int = 32) -> int:
        if not self.connected or self._fd is None:
            return 0
        
        import os
        with self._lock:
            os.lseek(self._fd, address, os.SEEK_SET)
            data = os.read(self._fd, width // 8)
            if width == 8:
                return struct.unpack('<B', data)[0]
            elif width == 16:
                return struct.unpack('<H', data)[0]
            elif width == 32:
                return struct.unpack('<I', data)[0]
            elif width == 64:
                return struct.unpack('<Q', data)[0]
            return 0
        
    def write_register(self, address: int, value: int, width: int = 32) -> bool:
        if not self.connected or self._fd is None:
            return False
        
        import os
        with self._lock:
            if width == 8:
                data = struct.pack('<B', value)
            elif width == 16:
                data = struct.pack('<H', value)
            elif width == 32:
                data = struct.pack('<I', value)
            elif width == 64:
                data = struct.pack('<Q', value)
            else:
                return False
            
            os.lseek(self._fd, address, os.SEEK_SET)
            os.write(self._fd, data)
            return True
        
    def read_memory(self, address: int, length: int) -> bytes:
        if not self.connected or self._fd is None:
            return b''
        
        import os
        with self._lock:
            os.lseek(self._fd, address, os.SEEK_SET)
            return os.read(self._fd, length)
        
    def write_memory(self, address: int, data: bytes) -> bool:
        if not self.connected or self._fd is None:
            return False
        
        import os
        with self._lock:
            os.lseek(self._fd, address, os.SEEK_SET)
            os.write(self._fd, data)
            return True


# ============ FPGA 组件 ============

@ComponentRegistry.register
class FPGADeviceComponent(ComponentBase):
    """
    FPGA 设备组件
    管理与 FPGA 板卡的连接
    """
    component_name = "FPGADevice"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("connected", PortType.BOOLEAN)
        self.add_output_port("status", PortType.STRING)
        self.add_output_port("error", PortType.STRING)
    
    def _on_configure(self):
        self.interface_type = self.config.get('interface', 'simulated')
        self.device_path = self.config.get('device_path', '/dev/xdma0_user')
        self.driver: Optional[FPGADriver] = None
        
    def start(self):
        super().start()
        
        # 根据接口类型创建驱动
        if self.interface_type == 'pcie':
            self.driver = PCIeFPGADriver(device_path=self.device_path)
        else:
            self.driver = SimulatedFPGADriver()
        
        if self.driver.connect():
            self.set_output("connected", True)
            self.set_output("status", "Connected")
        else:
            self.set_output("connected", False)
            self.set_output("error", "Connection failed")
    
    def stop(self):
        if self.driver:
            self.driver.disconnect()
        super().stop()
    
    def process(self):
        enable = self.get_input("enable")
        if enable is False and self.driver and self.driver.connected:
            self.driver.disconnect()
            self.set_output("connected", False)
        elif enable is True and self.driver and not self.driver.connected:
            self.driver.connect()
            self.set_output("connected", self.driver.connected)
    
    def get_driver(self) -> Optional[FPGADriver]:
        """获取 FPGA 驱动实例"""
        return self.driver


@ComponentRegistry.register
class FPGARegisterReadComponent(ComponentBase):
    """
    FPGA 寄存器读取组件
    从 FPGA 读取寄存器值
    """
    component_name = "FPGARegisterRead"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("fpga", PortType.ANY)  # 连接到 FPGADevice
        self.add_input_port("trigger", PortType.BOOLEAN)
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("success", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.address = self.config.get('address', 0)
        self.width = self.config.get('width', 32)
        self.auto_read = self.config.get('auto_read', True)
        self.poll_interval_ms = self.config.get('poll_interval_ms', 100)
        self._last_poll = 0
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        trigger = self.get_input("trigger")
        current_time = time.time() * 1000
        
        should_read = trigger or (
            self.auto_read and 
            current_time - self._last_poll >= self.poll_interval_ms
        )
        
        if should_read:
            self._last_poll = current_time
            
            # 模拟读取
            import random
            value = random.randint(0, (1 << self.width) - 1)
            
            self.set_output("value", value)
            self.set_output("success", True)


@ComponentRegistry.register
class FPGARegisterWriteComponent(ComponentBase):
    """
    FPGA 寄存器写入组件
    向 FPGA 写入寄存器值
    """
    component_name = "FPGARegisterWrite"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("fpga", PortType.ANY)
        self.add_input_port("value", PortType.NUMBER)
        self.add_input_port("trigger", PortType.BOOLEAN)
        self.add_output_port("success", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.address = self.config.get('address', 0)
        self.width = self.config.get('width', 32)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        trigger = self.get_input("trigger")
        value = self.get_input("value")
        
        if trigger and value is not None:
            # 模拟写入
            logger.debug(f"FPGA Write: 0x{self.address:08X} = {value}")
            self.set_output("success", True)


@ComponentRegistry.register
class FPGAADCComponent(ComponentBase):
    """
    FPGA ADC 组件
    读取 FPGA 上的 ADC 数据
    """
    component_name = "FPGAADC"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("fpga", PortType.ANY)
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("channel_0", PortType.NUMBER)
        self.add_output_port("channel_1", PortType.NUMBER)
        self.add_output_port("channel_2", PortType.NUMBER)
        self.add_output_port("channel_3", PortType.NUMBER)
        self.add_output_port("sample_rate", PortType.NUMBER)
    
    def _on_configure(self):
        self.base_address = self.config.get('base_address', 0x1000)
        self.resolution = self.config.get('resolution', 12)  # 12-bit ADC
        self.sample_rate = self.config.get('sample_rate', 100000)  # 100 kSPS
        self.channels = self.config.get('channels', 4)
        self._time_offset = time.time()
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        enable = self.get_input("enable")
        if enable is False:
            return
        
        # 模拟 ADC 数据
        t = time.time() - self._time_offset
        max_value = (1 << self.resolution) - 1
        
        # 生成模拟信号
        import math
        ch0 = int((math.sin(2 * math.pi * 10 * t) + 1) / 2 * max_value)
        ch1 = int((math.sin(2 * math.pi * 5 * t + 0.5) + 1) / 2 * max_value)
        ch2 = int((math.sin(2 * math.pi * 2 * t + 1.0) + 1) / 2 * max_value)
        ch3 = int((math.cos(2 * math.pi * 1 * t) + 1) / 2 * max_value)
        
        self.set_output("channel_0", ch0)
        self.set_output("channel_1", ch1)
        self.set_output("channel_2", ch2)
        self.set_output("channel_3", ch3)
        self.set_output("sample_rate", self.sample_rate)


@ComponentRegistry.register
class FPGADACComponent(ComponentBase):
    """
    FPGA DAC 组件
    向 FPGA 上的 DAC 写入数据
    """
    component_name = "FPGADAC"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("fpga", PortType.ANY)
        self.add_input_port("channel_0", PortType.NUMBER)
        self.add_input_port("channel_1", PortType.NUMBER)
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("success", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.base_address = self.config.get('base_address', 0x2000)
        self.resolution = self.config.get('resolution', 16)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        enable = self.get_input("enable")
        if enable is False:
            return
        
        ch0 = self.get_input("channel_0")
        ch1 = self.get_input("channel_1")
        
        if ch0 is not None or ch1 is not None:
            # 模拟 DAC 输出
            logger.debug(f"DAC Output: CH0={ch0}, CH1={ch1}")
            self.set_output("success", True)


@ComponentRegistry.register
class FPGADMAComponent(ComponentBase):
    """
    FPGA DMA 组件
    高速数据传输
    """
    component_name = "FPGADMA"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("fpga", PortType.ANY)
        self.add_input_port("start", PortType.BOOLEAN)
        self.add_input_port("direction", PortType.STRING)  # "read" or "write"
        self.add_output_port("data", PortType.ANY)
        self.add_output_port("complete", PortType.BOOLEAN)
        self.add_output_port("bytes_transferred", PortType.NUMBER)
    
    def _on_configure(self):
        self.buffer_address = self.config.get('buffer_address', 0x10000)
        self.buffer_size = self.config.get('buffer_size', 4096)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        start = self.get_input("start")
        direction = self.get_input("direction") or "read"
        
        if start:
            # 模拟 DMA 传输
            if direction == "read":
                # 模拟读取数据
                data = bytes(range(min(256, self.buffer_size)))
                self.set_output("data", list(data))
            
            self.set_output("complete", True)
            self.set_output("bytes_transferred", self.buffer_size)


@ComponentRegistry.register
class FPGAPWMComponent(ComponentBase):
    """
    FPGA PWM 组件
    生成 PWM 信号
    """
    component_name = "FPGAPWM"
    component_type = ComponentType.DEVICE
    
    def _setup_ports(self):
        self.add_input_port("fpga", PortType.ANY)
        self.add_input_port("duty_cycle", PortType.NUMBER)  # 0-100%
        self.add_input_port("frequency", PortType.NUMBER)  # Hz
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_output_port("active", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.base_address = self.config.get('base_address', 0x3000)
        self.channel = self.config.get('channel', 0)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        enable = self.get_input("enable")
        duty = self.get_input("duty_cycle") or 50
        freq = self.get_input("frequency") or 1000
        
        if enable:
            # 模拟 PWM 配置
            logger.debug(f"PWM CH{self.channel}: {duty}% @ {freq}Hz")
            self.set_output("active", True)
        else:
            self.set_output("active", False)

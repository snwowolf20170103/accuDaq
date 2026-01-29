"""
Modbus TCP 模拟器 - 模拟 PLC 设备
无需真实设备即可测试 Modbus TCP 功能
"""

import argparse
import logging
import signal
import sys
import time
import math
import random

try:
    from pymodbus.server import StartTcpServer
    from pymodbus.datastore import ModbusSequentialDataBlock, ModbusServerContext, ModbusDeviceContext
    PYMODBUS_AVAILABLE = True
except ImportError:
    PYMODBUS_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DynamicDataUpdater:
    """动态更新寄存器数据（模拟真实传感器变化）"""
    
    def __init__(self, context, update_interval: float = 1.0):
        self.context = context
        self.update_interval = update_interval
        self.running = False
        self.tick = 0
    
    def start(self):
        """开始动态更新"""
        import threading
        self.running = True
        self.thread = threading.Thread(target=self._update_loop, daemon=True)
        self.thread.start()
    
    def stop(self):
        self.running = False
    
    def _update_loop(self):
        while self.running:
            self._update_registers()
            self.tick += 1
            time.sleep(self.update_interval)
    
    def _update_registers(self):
        """更新寄存器数据"""
        slave_id = 0x00  # 默认从站
        
        # 模拟温度传感器 (寄存器 0): 正弦波 20-30°C
        temperature = int(25 + 5 * math.sin(self.tick * 0.1) + random.uniform(-0.5, 0.5))
        
        # 模拟湿度传感器 (寄存器 1): 40-60%
        humidity = int(50 + 10 * math.sin(self.tick * 0.05 + 1) + random.uniform(-1, 1))
        
        # 模拟压力传感器 (寄存器 2): 100-200 kPa
        pressure = int(150 + 50 * math.sin(self.tick * 0.08) + random.uniform(-2, 2))
        
        # 模拟电压 (寄存器 3): 220V 左右
        voltage = int(220 + random.uniform(-5, 5))
        
        # 模拟电流 (寄存器 4): 0-10A
        current = int(5 + 5 * abs(math.sin(self.tick * 0.15)) + random.uniform(-0.2, 0.2))
        
        # 计数器 (寄存器 5): 递增
        counter = self.tick % 65536
        
        values = [temperature, humidity, pressure, voltage, current, counter]
        
        # 写入保持寄存器 (功能码 3)
        self.context[slave_id].setValues(3, 0, values)
        
        if self.tick % 5 == 0:  # 每 5 秒打印一次
            logger.info(f"寄存器更新: 温度={temperature}°C, 湿度={humidity}%, 压力={pressure}kPa, "
                       f"电压={voltage}V, 电流={current}A, 计数={counter}")


def create_server_context():
    """创建 Modbus 服务器上下文"""
    # 初始化数据块
    # 功能码 1: Coils (线圈) - 可读写布尔值
    # 功能码 2: Discrete Inputs (离散输入) - 只读布尔值
    # 功能码 3: Holding Registers (保持寄存器) - 可读写 16 位整数
    # 功能码 4: Input Registers (输入寄存器) - 只读 16 位整数
    
    coils = ModbusSequentialDataBlock(0, [False] * 100)
    discrete_inputs = ModbusSequentialDataBlock(0, [False] * 100)
    holding_registers = ModbusSequentialDataBlock(0, [0] * 100)
    input_registers = ModbusSequentialDataBlock(0, [0] * 100)
    
    # 设置初始值
    # 保持寄存器 0-5: 温度, 湿度, 压力, 电压, 电流, 计数器
    holding_registers.setValues(0, [25, 50, 150, 220, 5, 0])
    
    # 输入寄存器 (只读): 设备信息
    input_registers.setValues(0, [1, 2, 3, 100])  # 版本号等
    
    # 线圈: 开关状态
    coils.setValues(0, [True, False, True, False])
    
    slave_context = ModbusDeviceContext(
        di=discrete_inputs,
        co=coils,
        hr=holding_registers,
        ir=input_registers
    )
    
    # 单从站模式
    return ModbusServerContext(devices=slave_context, single=True)


def main():
    parser = argparse.ArgumentParser(description='Modbus TCP 模拟器')
    parser.add_argument('--host', default='0.0.0.0', help='监听地址 (默认: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=502, help='监听端口 (默认: 502)')
    parser.add_argument('--update-interval', type=float, default=1.0, help='数据更新间隔(秒)')
    args = parser.parse_args()
    
    if not PYMODBUS_AVAILABLE:
        logger.error("pymodbus 未安装，请运行: pip install pymodbus>=3.0.0")
        sys.exit(1)
    
    logger.info("=" * 50)
    logger.info("Modbus TCP 模拟器")
    logger.info("=" * 50)
    logger.info(f"监听地址: {args.host}:{args.port}")
    logger.info("")
    logger.info("可用寄存器:")
    logger.info("  保持寄存器 (HR):")
    logger.info("    0 - 温度 (°C)")
    logger.info("    1 - 湿度 (%)")
    logger.info("    2 - 压力 (kPa)")
    logger.info("    3 - 电压 (V)")
    logger.info("    4 - 电流 (A)")
    logger.info("    5 - 计数器")
    logger.info("")
    logger.info("测试命令:")
    logger.info(f"  读取保持寄存器: python -c \"from pymodbus.client import ModbusTcpClient; c=ModbusTcpClient('127.0.0.1', {args.port}); c.connect(); print(c.read_holding_registers(0, 6).registers)\"")
    logger.info("=" * 50)
    
    # 创建服务器上下文
    context = create_server_context()
    
    # 创建动态数据更新器
    updater = DynamicDataUpdater(context, args.update_interval)
    updater.start()
    
    # 设置信号处理
    def signal_handler(sig, frame):
        logger.info("\n正在关闭模拟器...")
        updater.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 启动服务器
    try:
        logger.info("Modbus TCP 服务器启动中...")
        StartTcpServer(
            context=context,
            address=(args.host, args.port)
        )
    except PermissionError:
        logger.error(f"无法绑定端口 {args.port}。")
        logger.error("请尝试使用管理员权限运行，或使用其他端口: --port 5020")
        sys.exit(1)
    except Exception as e:
        logger.error(f"服务器启动失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

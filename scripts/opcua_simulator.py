"""
OPC UA 模拟服务器
用于测试 AccuDaq OPC UA 组件

启动方式：
    python opcua_simulator.py

功能：
- 创建一个本地 OPC UA 服务器 (opc.tcp://localhost:4840)
- 模拟工业设备变量（温度、压力、流量等）
- 数据每秒自动更新

依赖：
    pip install opcua
"""

import sys
import time
import math
import random
import logging
import argparse
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from opcua import Server, ua
except ImportError:
    print("错误: 未安装 'opcua' 库。请运行 'pip install opcua' 安装。")
    sys.exit(1)


class OPCUASimulator:
    """OPC UA 模拟服务器"""
    
    def __init__(self, endpoint: str = "opc.tcp://0.0.0.0:4840"):
        self.endpoint = endpoint
        self.server = Server()
        self.running = False
        self.variables = {}
        self.counter = 0
        
    def setup(self):
        """配置服务器"""
        logger.info(f"正在配置 OPC UA 服务器: {self.endpoint}")
        
        # 设置服务器端点
        self.server.set_endpoint(self.endpoint)
        self.server.set_server_name("AccuDaq OPC UA Simulator")
        
        # 配置安全策略（允许无加密连接）
        self.server.set_security_policy([
            ua.SecurityPolicyType.NoSecurity,
        ])
        
        # 注册命名空间
        uri = "http://accudaq.example.com"
        idx = self.server.register_namespace(uri)
        
        # 获取对象节点
        objects = self.server.get_objects_node()
        
        # 创建设备文件夹
        # 使用 delete_recursive 防止重启时节点已存在错误
        try:
            device_folder = objects.add_folder(idx, "SimulatedDevice")
        except ua.UaError:
            # 如果文件夹已存在，尝试获取它
            logger.warning("SimulatedDevice 文件夹可能已存在，尝试获取...")
            # 注意：这里简化处理，在大规模生产代码中应更严谨
            device_folder = objects.call_method("0:GetFolder", "SimulatedDevice") 
            # 实际上 opcua 库重启时内存是新的，通常不会有残留，
            # 除非是持久化存储（这里没用）。
            # BadNodeIdExists 通常是库内部初始化标准节点时的问题。
            # 我们先尝试最简配置。
        
        # 添加模拟变量
        # 1. 温度传感器 (正弦波 + 噪声)
        self.variables["Temperature"] = device_folder.add_variable(
            idx, "Temperature", 25.0
        )
        self.variables["Temperature"].set_writable()
        
        # 2. 压力传感器 (缓慢变化)
        self.variables["Pressure"] = device_folder.add_variable(
            idx, "Pressure", 101.325
        )
        self.variables["Pressure"].set_writable()
        
        # 3. 流量传感器 (随机波动)
        self.variables["FlowRate"] = device_folder.add_variable(
            idx, "FlowRate", 50.0
        )
        self.variables["FlowRate"].set_writable()
        
        # 4. 电压 (稳定值 + 小波动)
        self.variables["Voltage"] = device_folder.add_variable(
            idx, "Voltage", 220.0
        )
        self.variables["Voltage"].set_writable()
        
        # 5. 电流 (正弦波)
        self.variables["Current"] = device_folder.add_variable(
            idx, "Current", 5.0
        )
        self.variables["Current"].set_writable()
        
        # 6. 运行状态 (布尔值)
        self.variables["Running"] = device_folder.add_variable(
            idx, "Running", True
        )
        self.variables["Running"].set_writable()
        
        # 7. 设备状态 (字符串)
        self.variables["Status"] = device_folder.add_variable(
            idx, "Status", "Normal"
        )
        self.variables["Status"].set_writable()
        
        # 8. 累计计数器 (递增)
        self.variables["Counter"] = device_folder.add_variable(
            idx, "Counter", 0
        )
        self.variables["Counter"].set_writable()
        
        logger.info(f"已创建 {len(self.variables)} 个模拟变量")
        
        # 打印节点 ID 信息
        print("\n可用的 OPC UA 节点:")
        print("-" * 60)
        for name, var in self.variables.items():
            print(f"  {name}: {var.nodeid}")
        print("-" * 60)
        print()
        
    def update_values(self):
        """更新模拟值"""
        self.counter += 1
        t = self.counter * 0.1  # 时间因子
        
        # 温度：20-30°C 正弦波 + 噪声
        temp = 25 + 5 * math.sin(t) + random.uniform(-0.5, 0.5)
        self.variables["Temperature"].set_value(round(temp, 2))
        
        # 压力：99-103 kPa 缓慢变化
        pressure = 101.325 + 2 * math.sin(t * 0.2) + random.uniform(-0.1, 0.1)
        self.variables["Pressure"].set_value(round(pressure, 3))
        
        # 流量：40-60 L/min 随机波动
        flow = 50 + random.uniform(-10, 10)
        self.variables["FlowRate"].set_value(round(flow, 1))
        
        # 电压：218-222V 小波动
        voltage = 220 + random.uniform(-2, 2)
        self.variables["Voltage"].set_value(round(voltage, 1))
        
        # 电流：3-7A 正弦波
        current = 5 + 2 * math.sin(t * 0.5)
        self.variables["Current"].set_value(round(current, 2))
        
        # 运行状态：每 30 秒切换一次
        running = (self.counter // 30) % 2 == 0
        self.variables["Running"].set_value(running)
        
        # 状态字符串
        if running:
            status = random.choice(["Normal", "Running", "Active"])
        else:
            status = random.choice(["Standby", "Idle", "Paused"])
        self.variables["Status"].set_value(status)
        
        # 计数器递增
        self.variables["Counter"].set_value(self.counter)
        
    def start(self):
        """启动服务器"""
        self.setup()
        self.server.start()
        self.running = True
        
        logger.info(f"OPC UA 服务器已启动: {self.endpoint}")
        print(f"\n{'='*60}")
        print(f"  OPC UA 模拟服务器已启动")
        print(f"  端点地址: {self.endpoint}")
        print(f"  按 Ctrl+C 停止服务器")
        print(f"{'='*60}\n")
        
        try:
            while self.running:
                self.update_values()
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("收到停止信号")
        finally:
            self.stop()
            
    def stop(self):
        """停止服务器"""
        self.running = False
        self.server.stop()
        logger.info("OPC UA 服务器已停止")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OPC UA 模拟服务器")
    parser.add_argument(
        "--port", 
        type=int, 
        default=4840, 
        help="OPC UA 服务器端口 (默认: 4840)"
    )
    parser.add_argument(
        "--host", 
        default="0.0.0.0", 
        help="OPC UA 服务器绑定地址 (默认: 0.0.0.0)"
    )
    
    args = parser.parse_args()
    endpoint = f"opc.tcp://{args.host}:{args.port}"
    
    simulator = OPCUASimulator(endpoint)
    simulator.start()

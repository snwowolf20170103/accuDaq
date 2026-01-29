"""
纯净版 OPC UA 模拟设备
只作为服务器运行，没有任何 MQTT 发布功能。
用于测试 DAQ 引擎的读取和订阅能力。
"""

import time
import math
import random
import logging
from opcua import Server, ua

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    server = Server()
    server.set_endpoint("opc.tcp://0.0.0.0:4840")
    server.set_server_name("AccuDaq Simulated Device")
    
    # 注册命名空间
    uri = "http://accudaq.example.com"
    idx = server.register_namespace(uri)
    
    # 创建对象
    objects = server.get_objects_node()
    folder = objects.add_folder(idx, "Device1")
    
    # 添加变量（明确指定 NodeID，方便测试）
    # 注意：这里我们尝试强制指定 ID，如果库不支持则会退化为自动分配
    # 但通常按顺序添加就是 i=2, i=3...
    
    temp = folder.add_variable(idx, "Temperature", 25.0)
    press = folder.add_variable(idx, "Pressure", 101.0)
    
    # 设置可写
    temp.set_writable()
    press.set_writable()
    
    server.start()
    
    print("\n" + "="*50)
    print("  OPC UA 模拟设备已启动")
    print("  地址: opc.tcp://localhost:4840")
    print("="*50)
    print("  可用节点 (Node ID):")
    print(f"  🌡️  温度 (Temperature): {temp.nodeid}  <-- 请在编辑器里填这个")
    print(f"  ⏲️  压力 (Pressure):    {press.nodeid}")
    print("="*50 + "\n")
    
    try:
        t = 0
        while True:
            time.sleep(1)
            t += 1
            
            # 模拟数据变化
            v_temp = round(25.0 + 5.0 * math.sin(t * 0.1) + random.uniform(-0.1, 0.1), 2)
            v_press = round(101.0 + 2.0 * math.cos(t * 0.1), 2)
            
            temp.set_value(v_temp)
            press.set_value(v_press)
            
            # 每 5 秒打印一次当前值，方便您对比
            if t % 5 == 0:
                logger.info(f"设备内部值: 温度={v_temp}, 压力={v_press}")
                
    except KeyboardInterrupt:
        server.stop()
        print("设备已停止")

if __name__ == "__main__":
    main()

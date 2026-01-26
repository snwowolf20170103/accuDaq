"""
While Loop 组件 - 循环控制组件
实现周期性循环执行功能
"""

import logging
import threading
import time
from typing import Any, Dict

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)


@ComponentRegistry.register
class WhileLoopComponent(ComponentBase):
    """
    While Loop 组件
    
    功能：
    - 根据条件持续循环执行
    - 支持设置最大迭代次数
    - 支持设置迭代间隔
    - 输出当前迭代计数和运行状态
    """
    
    component_type = ComponentType.LOGIC
    component_name = "WhileLoop"
    component_description = "循环控制组件，支持条件判断和计数循环"
    component_icon = "🔄"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._iteration_count = 0
        self._loop_running = False
        self._loop_thread = None
        self._stop_loop_event = threading.Event()

    def _setup_ports(self):
        """设置输入输出端口"""
        # 输入端口
        self.add_input_port("enable", PortType.BOOLEAN, "启用循环 (True=运行, False=停止)")
        self.add_input_port("condition", PortType.BOOLEAN, "循环条件 (True=继续, False=停止)")
        self.add_input_port("reset", PortType.BOOLEAN, "重置计数器")
        self.add_input_port("data_in", PortType.ANY, "输入数据（传递到循环体）")
        
        # 输出端口
        self.add_output_port("loop_body", PortType.BOOLEAN, "循环体触发信号")
        self.add_output_port("iteration", PortType.NUMBER, "当前迭代次数")
        self.add_output_port("is_running", PortType.BOOLEAN, "循环是否正在运行")
        self.add_output_port("data_out", PortType.ANY, "输出数据（来自循环体）")
        self.add_output_port("completed", PortType.BOOLEAN, "循环完成信号")

    def _on_configure(self):
        """配置变更回调"""
        # 默认配置
        self.config.setdefault("max_iterations", 0)  # 0 表示无限循环
        self.config.setdefault("interval_ms", 100)   # 迭代间隔（毫秒）
        self.config.setdefault("auto_start", False)  # 是否自动启动

    def start(self):
        """启动组件"""
        super().start()
        self._iteration_count = 0
        self._stop_loop_event.clear()
        
        # 如果配置了自动启动，立即开始循环
        if self.config.get("auto_start", False):
            self._start_loop()

    def stop(self):
        """停止组件"""
        self._stop_loop()
        super().stop()

    def _start_loop(self):
        """启动循环线程"""
        if self._loop_running:
            return
            
        self._loop_running = True
        self._stop_loop_event.clear()
        self._loop_thread = threading.Thread(target=self._loop_worker, daemon=True)
        self._loop_thread.start()
        logger.info(f"WhileLoop ({self.instance_id}) 循环已启动")

    def _stop_loop(self):
        """停止循环线程"""
        if not self._loop_running:
            return
            
        self._stop_loop_event.set()
        if self._loop_thread and self._loop_thread.is_alive():
            self._loop_thread.join(timeout=1)
        self._loop_running = False
        logger.info(f"WhileLoop ({self.instance_id}) 循环已停止")

    def _loop_worker(self):
        """循环工作线程"""
        interval_sec = self.config.get("interval_ms", 100) / 1000.0
        max_iterations = self.config.get("max_iterations", 0)
        
        while not self._stop_loop_event.is_set():
            # 检查条件
            condition = self.get_input("condition")
            if condition is False:
                # 条件为False，退出循环
                break
            
            # 检查最大迭代次数
            if max_iterations > 0 and self._iteration_count >= max_iterations:
                break
            
            # 执行一次迭代
            self._iteration_count += 1
            
            # 更新输出
            self.set_output("loop_body", True)
            self.set_output("iteration", self._iteration_count)
            self.set_output("is_running", True)
            
            # 传递数据
            data_in = self.get_input("data_in")
            if data_in is not None:
                self.set_output("data_out", data_in)
            
            # 等待间隔
            self._stop_loop_event.wait(interval_sec)
            
            # 复位循环体触发信号
            self.set_output("loop_body", False)
        
        # 循环结束
        self._loop_running = False
        self.set_output("is_running", False)
        self.set_output("completed", True)
        logger.info(f"WhileLoop ({self.instance_id}) 完成 {self._iteration_count} 次迭代")

    def process(self):
        """处理输入信号"""
        if not self._is_running:
            return
        
        # 检查重置信号
        reset = self.get_input("reset")
        if reset:
            self._iteration_count = 0
            self.set_output("iteration", 0)
            self.set_output("completed", False)
            logger.debug(f"WhileLoop ({self.instance_id}) 计数器已重置")
        
        # 检查启用信号
        enable = self.get_input("enable")
        if enable is True and not self._loop_running:
            self._start_loop()
        elif enable is False and self._loop_running:
            self._stop_loop()
        
        # 更新状态输出
        self.set_output("is_running", self._loop_running)
        self.set_output("iteration", self._iteration_count)

    def destroy(self):
        """销毁组件"""
        self._stop_loop()
        super().destroy()

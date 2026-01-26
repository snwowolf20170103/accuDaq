"""
高精度定时器组件
类似 LabVIEW 的 Timed Loop，支持高精度定时和优先级控制
"""

import logging
import threading
import time
from typing import Any, Dict, List, Optional, Callable
from enum import Enum

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)


class TimingSource(Enum):
    """定时源"""
    SOFTWARE = "software"    # 软件定时
    HARDWARE = "hardware"    # 硬件定时（需要特殊支持）
    EXTERNAL = "external"    # 外部触发


class LoopPriority(Enum):
    """循环优先级"""
    REAL_TIME = 1      # 实时优先级
    HIGH = 2           # 高优先级
    NORMAL = 5         # 普通优先级
    LOW = 8            # 低优先级
    BACKGROUND = 10    # 后台优先级


@ComponentRegistry.register
class TimedLoopComponent(ComponentBase):
    """
    高精度定时循环组件
    
    功能：
    - 周期性执行循环体
    - 支持高精度定时
    - 支持优先级控制
    - 提供定时统计信息
    
    配置参数：
        period_ms: float - 周期时间（毫秒）
        priority: int - 优先级 (1-10, 1 最高)
        timing_source: str - 定时源 (software/hardware/external)
        max_iterations: int - 最大迭代次数（0 表示无限）
        timeout_action: str - 超时处理 (continue/skip/error)
    """
    
    component_type = ComponentType.CONTROL
    component_name = "TimedLoop"
    component_description = "高精度定时循环组件"
    component_icon = "⏱️"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._loop_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._iteration_count = 0
        self._last_start_time = 0
        self._last_duration = 0
        self._total_overruns = 0
        self._min_duration = float('inf')
        self._max_duration = 0
        self._avg_duration = 0
        self._body_callback: Optional[Callable] = None

    def _setup_ports(self):
        """设置输入输出端口"""
        self.add_input_port("start_trigger", PortType.BOOLEAN, "启动触发")
        self.add_input_port("stop_trigger", PortType.BOOLEAN, "停止触发")
        self.add_input_port("body_complete", PortType.BOOLEAN, "循环体完成信号")
        
        self.add_output_port("iteration", PortType.NUMBER, "当前迭代次数")
        self.add_output_port("elapsed_time", PortType.NUMBER, "已运行时间(ms)")
        self.add_output_port("running", PortType.BOOLEAN, "是否正在运行")
        self.add_output_port("period_actual", PortType.NUMBER, "实际周期(ms)")
        self.add_output_port("overrun_count", PortType.NUMBER, "超时次数")
        self.add_output_port("loop_trigger", PortType.BOOLEAN, "循环触发信号")
        self.add_output_port("statistics", PortType.OBJECT, "定时统计信息")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("period_ms", 100)
        self.config.setdefault("priority", 5)
        self.config.setdefault("timing_source", "software")
        self.config.setdefault("max_iterations", 0)
        self.config.setdefault("timeout_action", "continue")
        self.config.setdefault("auto_start", False)

    def set_body_callback(self, callback: Callable[[], None]):
        """设置循环体回调函数"""
        self._body_callback = callback

    def start(self):
        """启动组件"""
        super().start()
        
        if self.config.get("auto_start", False):
            self._start_loop()

    def stop(self):
        """停止组件"""
        self._stop_loop()
        super().stop()

    def _start_loop(self):
        """启动定时循环"""
        if self._loop_thread and self._loop_thread.is_alive():
            return
        
        self._stop_event.clear()
        self._iteration_count = 0
        self._total_overruns = 0
        self._min_duration = float('inf')
        self._max_duration = 0
        self._avg_duration = 0
        
        self._loop_thread = threading.Thread(target=self._loop_func, daemon=True)
        self._loop_thread.start()
        
        self.set_output("running", True)
        logger.info(f"TimedLoop ({self.instance_id}) 已启动, 周期={self.config['period_ms']}ms")

    def _stop_loop(self):
        """停止定时循环"""
        self._stop_event.set()
        if self._loop_thread and self._loop_thread.is_alive():
            self._loop_thread.join(timeout=2)
        
        self.set_output("running", False)
        self.set_output("loop_trigger", False)
        logger.info(f"TimedLoop ({self.instance_id}) 已停止, 迭代次数={self._iteration_count}")

    def _loop_func(self):
        """定时循环函数"""
        period_s = self.config["period_ms"] / 1000.0
        max_iterations = self.config.get("max_iterations", 0)
        timeout_action = self.config.get("timeout_action", "continue")
        
        loop_start_time = time.perf_counter()
        next_time = loop_start_time
        
        total_duration = 0
        
        while not self._stop_event.is_set():
            # 检查迭代限制
            if max_iterations > 0 and self._iteration_count >= max_iterations:
                break
            
            iteration_start = time.perf_counter()
            
            # 发送循环触发信号
            self.set_output("loop_trigger", True)
            self._iteration_count += 1
            self.set_output("iteration", self._iteration_count)
            
            # 执行循环体回调
            if self._body_callback:
                try:
                    self._body_callback()
                except Exception as e:
                    logger.error(f"循环体执行错误: {e}")
            
            # 重置触发信号
            self.set_output("loop_trigger", False)
            
            # 计算本次迭代耗时
            iteration_end = time.perf_counter()
            iteration_duration = (iteration_end - iteration_start) * 1000  # ms
            self._last_duration = iteration_duration
            
            # 更新统计
            total_duration += iteration_duration
            self._min_duration = min(self._min_duration, iteration_duration)
            self._max_duration = max(self._max_duration, iteration_duration)
            self._avg_duration = total_duration / self._iteration_count
            
            # 检查是否超时
            if iteration_duration > self.config["period_ms"]:
                self._total_overruns += 1
                self.set_output("overrun_count", self._total_overruns)
                
                if timeout_action == "error":
                    logger.error(f"TimedLoop 超时: {iteration_duration:.2f}ms > {self.config['period_ms']}ms")
                    break
                elif timeout_action == "skip":
                    # 跳过下一次迭代
                    next_time = time.perf_counter() + period_s
                    continue
            
            # 更新输出
            elapsed = (time.perf_counter() - loop_start_time) * 1000
            self.set_output("elapsed_time", elapsed)
            self.set_output("period_actual", iteration_duration)
            self.set_output("statistics", {
                "iterations": self._iteration_count,
                "min_duration_ms": self._min_duration,
                "max_duration_ms": self._max_duration,
                "avg_duration_ms": self._avg_duration,
                "overruns": self._total_overruns,
            })
            
            # 高精度等待
            next_time += period_s
            sleep_time = next_time - time.perf_counter()
            
            if sleep_time > 0:
                # 使用高精度睡眠
                if sleep_time > 0.001:  # > 1ms
                    time.sleep(sleep_time * 0.9)  # 粗略睡眠
                # 忙等待剩余时间
                while time.perf_counter() < next_time and not self._stop_event.is_set():
                    pass
        
        self.set_output("running", False)

    def process(self):
        """处理触发信号"""
        if not self._is_running:
            return
        
        # 检查启动触发
        start_trigger = self.get_input("start_trigger")
        if start_trigger:
            self._start_loop()
        
        # 检查停止触发
        stop_trigger = self.get_input("stop_trigger")
        if stop_trigger:
            self._stop_loop()

    def destroy(self):
        self._stop_loop()
        super().destroy()


@ComponentRegistry.register
class RateLimiterComponent(ComponentBase):
    """
    速率限制器组件
    
    功能：
    - 限制数据流速率
    - 支持突发模式
    - 提供速率统计
    """
    
    component_type = ComponentType.CONTROL
    component_name = "RateLimiter"
    component_description = "速率限制器组件"
    component_icon = "🚦"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._last_pass_time = 0
        self._pass_count = 0
        self._block_count = 0

    def _setup_ports(self):
        self.add_input_port("input", PortType.ANY, "输入数据")
        self.add_input_port("reset", PortType.BOOLEAN, "重置计数")
        
        self.add_output_port("output", PortType.ANY, "输出数据（通过时）")
        self.add_output_port("passed", PortType.BOOLEAN, "是否通过")
        self.add_output_port("blocked", PortType.BOOLEAN, "是否被阻塞")
        self.add_output_port("rate", PortType.NUMBER, "当前速率(次/秒)")

    def _on_configure(self):
        self.config.setdefault("min_interval_ms", 100)
        self.config.setdefault("burst_size", 1)

    def start(self):
        super().start()
        self._last_pass_time = 0
        self._pass_count = 0
        self._block_count = 0

    def stop(self):
        super().stop()

    def process(self):
        if not self._is_running:
            return
        
        # 检查重置
        if self.get_input("reset"):
            self._pass_count = 0
            self._block_count = 0
        
        input_data = self.get_input("input")
        if input_data is None:
            return
        
        current_time = time.time() * 1000
        min_interval = self.config["min_interval_ms"]
        
        if current_time - self._last_pass_time >= min_interval:
            # 允许通过
            self._last_pass_time = current_time
            self._pass_count += 1
            self.set_output("output", input_data)
            self.set_output("passed", True)
            self.set_output("blocked", False)
        else:
            # 阻塞
            self._block_count += 1
            self.set_output("passed", False)
            self.set_output("blocked", True)
        
        # 计算速率
        if self._pass_count > 0:
            self.set_output("rate", self._pass_count / (current_time / 1000))


@ComponentRegistry.register  
class WatchdogComponent(ComponentBase):
    """
    看门狗组件
    
    功能：
    - 监控数据流活动
    - 超时时触发报警
    """
    
    component_type = ComponentType.CONTROL
    component_name = "Watchdog"
    component_description = "看门狗定时器组件"
    component_icon = "🐕"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._last_feed_time = 0
        self._timeout_triggered = False
        self._check_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def _setup_ports(self):
        self.add_input_port("feed", PortType.ANY, "喂狗信号")
        self.add_input_port("enable", PortType.BOOLEAN, "启用/禁用")
        
        self.add_output_port("timeout", PortType.BOOLEAN, "超时信号")
        self.add_output_port("time_since_feed", PortType.NUMBER, "距上次喂狗时间(ms)")
        self.add_output_port("healthy", PortType.BOOLEAN, "健康状态")

    def _on_configure(self):
        self.config.setdefault("timeout_ms", 5000)
        self.config.setdefault("auto_reset", True)

    def start(self):
        super().start()
        self._last_feed_time = time.time() * 1000
        self._timeout_triggered = False
        
        self._stop_event.clear()
        self._check_thread = threading.Thread(target=self._check_loop, daemon=True)
        self._check_thread.start()

    def stop(self):
        self._stop_event.set()
        if self._check_thread and self._check_thread.is_alive():
            self._check_thread.join(timeout=2)
        super().stop()

    def _check_loop(self):
        """检查循环"""
        while not self._stop_event.is_set():
            current_time = time.time() * 1000
            time_since_feed = current_time - self._last_feed_time
            
            self.set_output("time_since_feed", time_since_feed)
            
            if time_since_feed > self.config["timeout_ms"]:
                if not self._timeout_triggered:
                    self._timeout_triggered = True
                    self.set_output("timeout", True)
                    self.set_output("healthy", False)
                    logger.warning(f"Watchdog ({self.instance_id}) 超时!")
            else:
                self.set_output("healthy", True)
                if self._timeout_triggered and self.config.get("auto_reset", True):
                    self._timeout_triggered = False
                    self.set_output("timeout", False)
            
            self._stop_event.wait(0.1)

    def process(self):
        if not self._is_running:
            return
        
        # 喂狗
        feed = self.get_input("feed")
        if feed is not None:
            self._last_feed_time = time.time() * 1000
            if self._timeout_triggered and self.config.get("auto_reset", True):
                self._timeout_triggered = False
                self.set_output("timeout", False)
                self.set_output("healthy", True)

    def destroy(self):
        self.stop()
        super().destroy()

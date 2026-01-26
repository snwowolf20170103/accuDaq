"""
Timer 组件
功能：定时触发信号，用于周期性执行
"""

import time
import logging
from .base import ComponentBase, PortType, ComponentRegistry, ComponentType

logger = logging.getLogger(__name__)


@ComponentRegistry.register('Timer')
class TimerComponent(ComponentBase):
    """
    定时器组件 - 按设定间隔输出触发信号

    配置参数:
        interval_ms: int - 触发间隔（毫秒，默认: 1000）
        auto_start: bool - 是否自动启动（默认: True）

    输入端口:
        enable: BOOLEAN - 启用/禁用定时器
        reset: BOOLEAN - 重置定时器

    输出端口:
        trigger: BOOLEAN - 触发信号（每次间隔后为 True）
        elapsed_ms: NUMBER - 自启动以来的毫秒数
        tick_count: NUMBER - 触发次数计数
    """

    component_name = "Timer"
    component_type = ComponentType.LOGIC

    def _setup_ports(self):
        """设置端口"""
        self.add_input_port("enable", PortType.BOOLEAN)
        self.add_input_port("reset", PortType.BOOLEAN)
        self.add_output_port("trigger", PortType.BOOLEAN)
        self.add_output_port("elapsed_ms", PortType.NUMBER)
        self.add_output_port("tick_count", PortType.NUMBER)

    def _on_configure(self):
        """配置变更回调"""
        self.interval_ms = self.config.get("interval_ms", 1000)
        self.auto_start = self.config.get("auto_start", True)

        self._start_time = None
        self._last_trigger_time = None
        self._tick_count = 0
        self._enabled = self.auto_start

    def start(self):
        """启动组件"""
        super().start()
        self._start_time = time.time() * 1000  # 转换为毫秒
        self._last_trigger_time = self._start_time
        self._tick_count = 0
        self._enabled = self.auto_start
        logger.info(f"Timer started with interval {self.interval_ms}ms")

    def stop(self):
        """停止组件"""
        self._enabled = False
        super().stop()

    def process(self):
        """处理逻辑：检查是否到达触发时间"""
        # 检查 enable 输入
        enable_input = self.get_input("enable")
        if enable_input is not None:
            self._enabled = bool(enable_input)

        # 检查 reset 输入
        reset_input = self.get_input("reset")
        if reset_input:
            self._start_time = time.time() * 1000
            self._last_trigger_time = self._start_time
            self._tick_count = 0
            logger.debug("Timer reset")

        if not self._enabled:
            self.set_output("trigger", False)
            return

        current_time = time.time() * 1000
        elapsed_ms = current_time - self._start_time
        time_since_last_trigger = current_time - self._last_trigger_time

        # 检查是否应该触发
        if time_since_last_trigger >= self.interval_ms:
            self._last_trigger_time = current_time
            self._tick_count += 1
            self.set_output("trigger", True)
            logger.debug(f"Timer triggered (tick #{self._tick_count})")
        else:
            self.set_output("trigger", False)

        self.set_output("elapsed_ms", elapsed_ms)
        self.set_output("tick_count", self._tick_count)


@ComponentRegistry.register('Counter')
class CounterComponent(ComponentBase):
    """
    计数器组件 - 累加/递减计数

    配置参数:
        initial_value: int - 初始值（默认: 0）
        step: int - 步进值（默认: 1）
        min_value: int - 最小值（默认: None，无限制）
        max_value: int - 最大值（默认: None，无限制）

    输入端口:
        increment: BOOLEAN - 递增信号
        decrement: BOOLEAN - 递减信号
        reset: BOOLEAN - 重置信号
        set_value: NUMBER - 直接设置值

    输出端口:
        value: NUMBER - 当前计数值
        at_min: BOOLEAN - 是否达到最小值
        at_max: BOOLEAN - 是否达到最大值
    """

    component_name = "Counter"
    component_type = ComponentType.LOGIC

    def _setup_ports(self):
        """设置端口"""
        self.add_input_port("increment", PortType.BOOLEAN)
        self.add_input_port("decrement", PortType.BOOLEAN)
        self.add_input_port("reset", PortType.BOOLEAN)
        self.add_input_port("set_value", PortType.NUMBER)
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("at_min", PortType.BOOLEAN)
        self.add_output_port("at_max", PortType.BOOLEAN)

    def _on_configure(self):
        """配置变更回调"""
        self.initial_value = self.config.get("initial_value", 0)
        self.step = self.config.get("step", 1)
        self.min_value = self.config.get("min_value", None)
        self.max_value = self.config.get("max_value", None)

        self._value = self.initial_value
        self._prev_increment = False
        self._prev_decrement = False

    def start(self):
        """启动组件"""
        super().start()
        self._value = self.initial_value

    def stop(self):
        """停止组件"""
        super().stop()

    def process(self):
        """处理逻辑：更新计数"""
        # 检查重置
        reset = self.get_input("reset")
        if reset:
            self._value = self.initial_value
            logger.debug(f"Counter reset to {self.initial_value}")

        # 检查直接设置值
        set_value = self.get_input("set_value")
        if set_value is not None:
            self._value = int(set_value)

        # 检查递增（上升沿触发）
        increment = self.get_input("increment")
        if increment and not self._prev_increment:
            self._value += self.step
            if self.max_value is not None and self._value > self.max_value:
                self._value = self.max_value
        self._prev_increment = bool(increment)

        # 检查递减（上升沿触发）
        decrement = self.get_input("decrement")
        if decrement and not self._prev_decrement:
            self._value -= self.step
            if self.min_value is not None and self._value < self.min_value:
                self._value = self.min_value
        self._prev_decrement = bool(decrement)

        # 输出
        self.set_output("value", self._value)
        self.set_output("at_min", self.min_value is not None and self._value <= self.min_value)
        self.set_output("at_max", self.max_value is not None and self._value >= self.max_value)

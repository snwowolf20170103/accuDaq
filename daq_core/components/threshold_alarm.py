"""
阈值报警组件
功能：当输入值超过阈值时触发报警信号
"""

from .base import ComponentBase, PortType, ComponentRegistry, ComponentType


@ComponentRegistry.register('ThresholdAlarm')
class ThresholdAlarmComponent(ComponentBase):
    """
    阈值报警组件

    配置参数:
        threshold: float - 阈值
        compare_type: str - 比较类型 ('greater', 'less', 'equal', 'greater_equal', 'less_equal')

    输入端口:
        value: NUMBER - 待比较的值

    输出端口:
        alarm: BOOLEAN - 报警信号（True=报警，False=正常）
        value_out: NUMBER - 透传输入值
    """

    component_name = "ThresholdAlarm"
    component_type = ComponentType.PROCESS

    def _setup_ports(self):
        """设置端口"""
        self.add_input_port("value", PortType.NUMBER)
        self.add_output_port("alarm", PortType.BOOLEAN)
        self.add_output_port("value_out", PortType.NUMBER)

    def configure(self):
        """配置组件"""
        super().configure()
        self.threshold = self.config.get("threshold", 30.0)
        self.compare_type = self.config.get("compare_type", "greater")

        self.logger.info(
            f"ThresholdAlarm configured: threshold={self.threshold}, "
            f"compare_type={self.compare_type}"
        )

    def process(self):
        """处理逻辑"""
        value = self.get_input("value")

        if value is not None:
            # 根据比较类型判断是否报警
            alarm = False

            if self.compare_type == "greater":
                alarm = value > self.threshold
            elif self.compare_type == "less":
                alarm = value < self.threshold
            elif self.compare_type == "equal":
                alarm = abs(value - self.threshold) < 1e-6  # 浮点数相等比较
            elif self.compare_type == "greater_equal":
                alarm = value >= self.threshold
            elif self.compare_type == "less_equal":
                alarm = value <= self.threshold

            # 输出结果
            self.set_output("alarm", alarm)
            self.set_output("value_out", value)

            # 报警时记录日志
            if alarm:
                self.logger.warning(
                    f"ALARM! Value {value} {self.compare_type} threshold {self.threshold}"
                )

"""
调试打印组件
功能：将输入数据打印到控制台，用于调试数据流
"""

from .base import ComponentBase, PortType, ComponentRegistry, ComponentType
import json


@ComponentRegistry.register('DebugPrint')
class DebugPrintComponent(ComponentBase):
    """
    调试打印组件

    配置参数:
        prefix: str - 打印前缀（默认: "DEBUG"）
        format: str - 输出格式 ('json', 'simple')

    输入端口:
        value: ANY - 任意类型的输入值

    输出端口:
        value_out: ANY - 透传输入值（方便串联其他组件）
    """

    component_name = "DebugPrint"
    component_type = ComponentType.PROCESS

    def _setup_ports(self):
        """设置端口"""
        self.add_input_port("value", PortType.ANY)
        self.add_output_port("value_out", PortType.ANY)

    def configure(self):
        """配置组件"""
        super().configure()
        self.prefix = self.config.get("prefix", "DEBUG")
        self.format = self.config.get("format", "simple")

    def process(self):
        """处理逻辑"""
        value = self.get_input("value")

        if value is not None:
            # 格式化输出
            if self.format == "json":
                try:
                    output = json.dumps(value, indent=2)
                    print(f"[{self.prefix}] {self.component_id}:")
                    print(output)
                except (TypeError, ValueError):
                    print(f"[{self.prefix}] {self.component_id}: {value}")
            else:
                print(f"[{self.prefix}] {self.component_id}: {value}")

            # 透传输出
            self.set_output("value_out", value)

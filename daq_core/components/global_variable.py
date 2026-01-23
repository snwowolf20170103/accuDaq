"""
全局变量组件
功能：读写全局变量，支持UI绑定
"""

from .base import ComponentBase, PortType, ComponentRegistry, ComponentType
from typing import Any, Dict


# 全局变量存储（跨组件共享）
_GLOBAL_VARIABLES: Dict[str, Any] = {}


@ComponentRegistry.register('GlobalVariable')
class GlobalVariableComponent(ComponentBase):
    """
    全局变量组件

    配置参数:
        variable_name: str - 变量名称
        mode: str - 模式 ('read', 'write', 'read_write')
        initial_value: any - 初始值（仅写模式有效）

    输入端口:
        value_in: ANY - 写入值（写模式）

    输出端口:
        value_out: ANY - 读取值（读模式）
    """

    component_name = "GlobalVariable"
    component_type = ComponentType.PROCESS

    def _setup_ports(self):
        """设置端口"""
        self.add_input_port("value_in", PortType.ANY)
        self.add_output_port("value_out", PortType.ANY)

    def configure(self):
        """配置组件"""
        super().configure()
        self.variable_name = self.config.get("variable_name", "global_var")
        self.mode = self.config.get("mode", "read_write")
        self.initial_value = self.config.get("initial_value", 0)

        # 初始化全局变量
        if self.variable_name not in _GLOBAL_VARIABLES:
            _GLOBAL_VARIABLES[self.variable_name] = self.initial_value
            self.logger.info(
                f"GlobalVariable '{self.variable_name}' initialized: {self.initial_value}"
            )

    def process(self):
        """处理逻辑"""
        # 写模式：将输入写入全局变量
        if self.mode in ("write", "read_write"):
            value_in = self.get_input("value_in")
            if value_in is not None:
                _GLOBAL_VARIABLES[self.variable_name] = value_in
                self.logger.debug(
                    f"GlobalVariable '{self.variable_name}' updated: {value_in}"
                )

        # 读模式：从全局变量读取
        if self.mode in ("read", "read_write"):
            value = _GLOBAL_VARIABLES.get(self.variable_name)
            self.set_output("value_out", value)

    @staticmethod
    def get_variable(name: str, default: Any = None) -> Any:
        """静态方法：获取全局变量"""
        return _GLOBAL_VARIABLES.get(name, default)

    @staticmethod
    def set_variable(name: str, value: Any) -> None:
        """静态方法：设置全局变量"""
        _GLOBAL_VARIABLES[name] = value

    @staticmethod
    def list_variables() -> Dict[str, Any]:
        """静态方法：列出所有全局变量"""
        return _GLOBAL_VARIABLES.copy()

    @staticmethod
    def clear_variables() -> None:
        """静态方法：清空所有全局变量"""
        _GLOBAL_VARIABLES.clear()

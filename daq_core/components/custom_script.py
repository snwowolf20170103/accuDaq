"""
CustomScript 组件 - 用户自定义逻辑脚本
通过 Blockly 可视化编程生成 Python 代码并执行
"""

from typing import Any, Dict
import logging

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)


@ComponentRegistry.register
class CustomScriptComponent(ComponentBase):
    """
    自定义脚本组件

    允许用户通过 Blockly 可视化编程定义数据处理逻辑。
    Blockly 生成的 Python 代码会在 process() 方法中执行。

    输入端口:
        - input1: 数值输入1
        - input2: 数值输入2

    输出端口:
        - output1: 数值输出1

    配置属性:
        - blocklyXml: Blockly 积木状态 (用于前端恢复编辑)
        - generatedCode: Blockly 生成的 Python 代码
    """

    component_type = ComponentType.LOGIC
    component_name = "CustomScript"
    component_description = "用户自定义逻辑脚本 (Blockly)"
    component_icon = "🧩"

    def _setup_ports(self):
        """设置输入输出端口"""
        # 输入端口
        self.add_input_port("input1", PortType.NUMBER, "数值输入1")
        self.add_input_port("input2", PortType.NUMBER, "数值输入2")

        # 输出端口
        self.add_output_port("output1", PortType.NUMBER, "数值输出1")

    def start(self):
        """启动组件"""
        self._is_running = True

        # 验证代码是否存在
        code = self.config.get('generatedCode', '')
        if code:
            logger.info(f"CustomScript({self.instance_id}) 已加载用户脚本")
        else:
            logger.warning(f"CustomScript({self.instance_id}) 没有用户脚本")

        logger.info(f"组件 {self.component_name}({self.instance_id}) 已启动")

    def stop(self):
        """停止组件"""
        self._is_running = False
        logger.info(f"组件 {self.component_name}({self.instance_id}) 已停止")

    def process(self):
        """
        执行用户定义的脚本逻辑

        Blockly 生成的代码可以使用:
        - get_input("port_name"): 获取输入端口的值
        - set_output("port_name", value): 设置输出端口的值
        """
        code = self.config.get('generatedCode', '')

        if not code:
            # 没有用户脚本时，默认透传 input1 到 output1
            input_val = self.get_input("input1")
            if input_val is not None:
                self.set_output("output1", input_val)
            return

        try:
            # 创建执行上下文
            # 只暴露必要的函数，限制可访问的范围
            exec_globals: Dict[str, Any] = {
                'get_input': self.get_input,
                'set_output': self.set_output,
                # 可选：添加一些安全的内置函数
                'abs': abs,
                'min': min,
                'max': max,
                'round': round,
                'int': int,
                'float': float,
                'str': str,
                'bool': bool,
            }

            exec_locals: Dict[str, Any] = {}

            # 执行用户代码
            exec(code, exec_globals, exec_locals)

        except Exception as e:
            logger.error(f"CustomScript({self.instance_id}) 执行出错: {e}")
            logger.debug(f"出错代码:\n{code}")

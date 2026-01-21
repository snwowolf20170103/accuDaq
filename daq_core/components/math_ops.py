"""
数学运算组件 - 提供基础数学运算功能
"""

import logging
from typing import Any, List, Optional
from enum import Enum

from .base import ComponentBase, ComponentType, ComponentRegistry, PortType

logger = logging.getLogger(__name__)


class MathOperation(Enum):
    """数学运算类型"""
    ADD = "add"             # 加法
    SUBTRACT = "subtract"   # 减法
    MULTIPLY = "multiply"   # 乘法
    DIVIDE = "divide"       # 除法
    SCALE = "scale"         # 缩放 (value * scale + offset)
    ABS = "abs"             # 绝对值
    MIN = "min"             # 最小值
    MAX = "max"             # 最大值
    AVERAGE = "average"     # 平均值
    THRESHOLD = "threshold" # 阈值判断


@ComponentRegistry.register
class MathOperationComponent(ComponentBase):
    """数学运算组件"""

    component_type = ComponentType.LOGIC
    component_name = "MathOperation"
    component_description = "执行数学运算：加减乘除、缩放、阈值判断等"
    component_icon = "🔢"

    def __init__(self, instance_id: Optional[str] = None):
        super().__init__(instance_id)

    def _setup_ports(self):
        self.add_input_port("input1", PortType.NUMBER, "输入值 1")
        self.add_input_port("input2", PortType.NUMBER, "输入值 2（可选）")
        self.add_output_port("result", PortType.NUMBER, "运算结果")
        self.add_output_port("exceeded", PortType.BOOLEAN, "是否超过阈值")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("operation", MathOperation.ADD.value)
        self.config.setdefault("scale", 1.0)        # 缩放系数
        self.config.setdefault("offset", 0.0)       # 偏移量
        self.config.setdefault("threshold", 100.0)  # 阈值
        self.config.setdefault("threshold_type", "greater")  # greater / less

    def start(self):
        """启动组件"""
        super().start()

    def stop(self):
        """停止组件"""
        super().stop()

    def process(self):
        """执行数学运算"""
        input1 = self.get_input("input1")
        input2 = self.get_input("input2")
        operation = self.config["operation"]

        if input1 is None:
            return None

        try:
            input1 = float(input1)
            if input2 is not None:
                input2 = float(input2)
        except (ValueError, TypeError):
            logger.warning(f"输入值无法转换为数字: {input1}, {input2}")
            return None

        result = self._calculate(operation, input1, input2)
        self.set_output("result", result)

        # 阈值检查
        threshold = self.config["threshold"]
        threshold_type = self.config["threshold_type"]
        if threshold_type == "greater":
            exceeded = result > threshold if result is not None else False
        else:
            exceeded = result < threshold if result is not None else False
        self.set_output("exceeded", exceeded)

        return result

    def _calculate(self, operation: str, val1: float, val2: Optional[float]) -> Optional[float]:
        """执行计算"""
        try:
            if operation == MathOperation.ADD.value:
                return val1 + (val2 or 0)
            elif operation == MathOperation.SUBTRACT.value:
                return val1 - (val2 or 0)
            elif operation == MathOperation.MULTIPLY.value:
                return val1 * (val2 or 1)
            elif operation == MathOperation.DIVIDE.value:
                if val2 and val2 != 0:
                    return val1 / val2
                else:
                    logger.warning("除数为 0")
                    return None
            elif operation == MathOperation.SCALE.value:
                scale = self.config["scale"]
                offset = self.config["offset"]
                return val1 * scale + offset
            elif operation == MathOperation.ABS.value:
                return abs(val1)
            elif operation == MathOperation.MIN.value:
                if val2 is not None:
                    return min(val1, val2)
                return val1
            elif operation == MathOperation.MAX.value:
                if val2 is not None:
                    return max(val1, val2)
                return val1
            elif operation == MathOperation.AVERAGE.value:
                if val2 is not None:
                    return (val1 + val2) / 2
                return val1
            elif operation == MathOperation.THRESHOLD.value:
                # 返回原值，exceeded 输出会标记是否超阈值
                return val1
            else:
                logger.warning(f"未知运算类型: {operation}")
                return val1
        except Exception as e:
            logger.error(f"计算失败: {e}")
            return None

    def calculate(self, value: float, value2: Optional[float] = None) -> Optional[float]:
        """直接调用计算（不通过端口）"""
        return self._calculate(self.config["operation"], value, value2)


@ComponentRegistry.register
class CompareComponent(ComponentBase):
    """比较组件 - 比较两个值"""

    component_type = ComponentType.LOGIC
    component_name = "Compare"
    component_description = "比较两个数值，输出比较结果"
    component_icon = "⚖️"

    def __init__(self, instance_id: Optional[str] = None):
        super().__init__(instance_id)

    def _setup_ports(self):
        self.add_input_port("input1", PortType.NUMBER, "输入值 1")
        self.add_input_port("input2", PortType.NUMBER, "输入值 2")
        self.add_output_port("result", PortType.BOOLEAN, "比较结果")
        self.add_output_port("difference", PortType.NUMBER, "差值")

    def _on_configure(self):
        self.config.setdefault("compare_type", "equal")  # equal, greater, less, greater_equal, less_equal
        self.config.setdefault("tolerance", 0.0001)  # 相等比较容差

    def start(self):
        super().start()

    def stop(self):
        super().stop()

    def process(self):
        """执行比较"""
        input1 = self.get_input("input1")
        input2 = self.get_input("input2")

        if input1 is None or input2 is None:
            return None

        try:
            val1 = float(input1)
            val2 = float(input2)
        except (ValueError, TypeError):
            return None

        compare_type = self.config["compare_type"]
        tolerance = self.config["tolerance"]

        if compare_type == "equal":
            result = abs(val1 - val2) <= tolerance
        elif compare_type == "greater":
            result = val1 > val2
        elif compare_type == "less":
            result = val1 < val2
        elif compare_type == "greater_equal":
            result = val1 >= val2
        elif compare_type == "less_equal":
            result = val1 <= val2
        else:
            result = False

        self.set_output("result", result)
        self.set_output("difference", val1 - val2)

        return result

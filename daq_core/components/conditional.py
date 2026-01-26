"""
Conditional 组件 - 条件分支组件
实现 if-else 条件判断功能
"""

import logging
from typing import Any, Dict

from .base import ComponentBase, ComponentType, PortType, ComponentRegistry

logger = logging.getLogger(__name__)


@ComponentRegistry.register
class ConditionalComponent(ComponentBase):
    """
    Conditional 组件
    
    功能：
    - 根据条件判断，将数据路由到不同的输出
    - 支持多种比较运算符
    - 支持与/或/非逻辑运算
    - 可作为 if-else 分支结构使用
    """
    
    component_type = ComponentType.LOGIC
    component_name = "Conditional"
    component_description = "条件分支组件，实现 if-else 逻辑判断"
    component_icon = "🔀"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
        self._last_condition_result = None

    def _setup_ports(self):
        """设置输入输出端口"""
        # 输入端口
        self.add_input_port("condition", PortType.BOOLEAN, "条件输入 (Boolean)")
        self.add_input_port("value1", PortType.NUMBER, "比较值1 (用于内部比较)")
        self.add_input_port("value2", PortType.NUMBER, "比较值2 (用于内部比较)")
        self.add_input_port("data_in", PortType.ANY, "输入数据")
        
        # 输出端口
        self.add_output_port("true_out", PortType.ANY, "条件为真时输出的数据")
        self.add_output_port("false_out", PortType.ANY, "条件为假时输出的数据")
        self.add_output_port("result", PortType.BOOLEAN, "条件判断结果")
        self.add_output_port("true_trigger", PortType.BOOLEAN, "条件为真的触发信号")
        self.add_output_port("false_trigger", PortType.BOOLEAN, "条件为假的触发信号")

    def _on_configure(self):
        """配置变更回调"""
        # 默认配置
        self.config.setdefault("mode", "direct")  # direct, compare, logic
        self.config.setdefault("compare_type", "greater")  # equal, greater, less, greater_equal, less_equal, not_equal
        self.config.setdefault("logic_type", "and")  # and, or, not, xor
        self.config.setdefault("threshold", 0)  # 用于阈值比较
        self.config.setdefault("invert_result", False)  # 是否反转结果
        self.config.setdefault("pass_data_through", True)  # 是否传递输入数据

    def start(self):
        """启动组件"""
        super().start()
        self._last_condition_result = None

    def stop(self):
        """停止组件"""
        super().stop()

    def _evaluate_compare(self, value1: Any, value2: Any) -> bool:
        """执行比较运算"""
        compare_type = self.config.get("compare_type", "greater")
        
        try:
            v1 = float(value1) if value1 is not None else 0
            v2 = float(value2) if value2 is not None else self.config.get("threshold", 0)
            
            if compare_type == "equal":
                return abs(v1 - v2) < 0.0001
            elif compare_type == "greater":
                return v1 > v2
            elif compare_type == "less":
                return v1 < v2
            elif compare_type == "greater_equal":
                return v1 >= v2
            elif compare_type == "less_equal":
                return v1 <= v2
            elif compare_type == "not_equal":
                return abs(v1 - v2) >= 0.0001
            else:
                return False
        except (ValueError, TypeError) as e:
            logger.warning(f"Conditional ({self.instance_id}) 比较运算失败: {e}")
            return False

    def _evaluate_logic(self, cond1: bool, cond2: bool = None) -> bool:
        """执行逻辑运算"""
        logic_type = self.config.get("logic_type", "and")
        
        if logic_type == "not":
            return not cond1
        elif logic_type == "and":
            return cond1 and (cond2 if cond2 is not None else True)
        elif logic_type == "or":
            return cond1 or (cond2 if cond2 is not None else False)
        elif logic_type == "xor":
            return cond1 ^ (cond2 if cond2 is not None else False)
        else:
            return cond1

    def process(self):
        """处理条件判断逻辑"""
        if not self._is_running:
            return
        
        mode = self.config.get("mode", "direct")
        result = False
        
        if mode == "direct":
            # 直接模式：使用 condition 输入
            condition = self.get_input("condition")
            result = bool(condition) if condition is not None else False
            
        elif mode == "compare":
            # 比较模式：比较 value1 和 value2
            value1 = self.get_input("value1")
            value2 = self.get_input("value2")
            result = self._evaluate_compare(value1, value2)
            
        elif mode == "logic":
            # 逻辑模式：对多个条件进行逻辑运算
            condition = self.get_input("condition")
            cond1 = bool(condition) if condition is not None else False
            
            # 如果有 value1/value2，用它们的比较结果作为第二个条件
            value1 = self.get_input("value1")
            value2 = self.get_input("value2")
            if value1 is not None:
                cond2 = self._evaluate_compare(value1, value2)
                result = self._evaluate_logic(cond1, cond2)
            else:
                result = self._evaluate_logic(cond1)
        
        # 是否反转结果
        if self.config.get("invert_result", False):
            result = not result
        
        # 获取输入数据
        data_in = self.get_input("data_in")
        
        # 设置输出
        self.set_output("result", result)
        
        if result:
            self.set_output("true_trigger", True)
            self.set_output("false_trigger", False)
            if self.config.get("pass_data_through", True):
                self.set_output("true_out", data_in)
                self.set_output("false_out", None)
        else:
            self.set_output("true_trigger", False)
            self.set_output("false_trigger", True)
            if self.config.get("pass_data_through", True):
                self.set_output("true_out", None)
                self.set_output("false_out", data_in)
        
        # 记录状态变化
        if self._last_condition_result != result:
            logger.debug(f"Conditional ({self.instance_id}) 条件结果: {result}")
            self._last_condition_result = result

    def destroy(self):
        """销毁组件"""
        super().destroy()

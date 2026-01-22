"""
代码生成器
将解析后的项目结构生成可执行的 Python 脚本
"""

import json
import logging
from typing import Dict, List, Any
from datetime import datetime

from .parser import DAQProject, Node, Wire, Device

logger = logging.getLogger(__name__)


# 节点类型到组件名称的映射
# 节点类型到组件名称的映射
NODE_TYPE_MAPPING = {
    # 设备组件
    "daq:mock_device": "MockDevice",
    "daq:mqtt_subscribe": "MQTTSubscriber",
    "daq:mqtt_publish": "MQTTPublisher",

    # 逻辑组件
    "daq:math": "MathOperation",
    "daq:compare": "Compare",
    "daq:scale": "MathOperation",  # scale 操作使用 MathOperation
    "daq:custom_script": "CustomScript",  # 用户自定义脚本 (Blockly)

    # 存储组件
    "daq:csv_write": "CSVStorage",
    "daq:csv_storage": "CSVStorage",
}


class CodeGenerator:
    """
    Python 代码生成器
    将 DAQ 项目编译为可执行的 Python 脚本
    """

    def __init__(self, project: DAQProject, sorted_nodes: List[Node]):
        self.project = project
        self.sorted_nodes = sorted_nodes
        self._output_lines: List[str] = []

    def generate(self) -> str:
        """生成完整的 Python 脚本"""
        self._output_lines.clear()

        self._generate_header()
        self._generate_imports()
        self._generate_engine_setup()
        self._generate_components()
        self._generate_connections()
        self._generate_callbacks()
        self._generate_main()

        return "\n".join(self._output_lines)

    def _add_line(self, line: str = "", indent: int = 0):
        """添加一行代码"""
        prefix = "    " * indent
        self._output_lines.append(prefix + line)

    def _generate_header(self):
        """生成文件头部注释"""
        meta = self.project.meta
        self._add_line('"""')
        self._add_line(f"自动生成的 DAQ 运行脚本")
        self._add_line(f"项目: {meta.name}")
        self._add_line(f"版本: {meta.version}")
        self._add_line(f"生成时间: {datetime.now().isoformat()}")
        self._add_line(f"")
        self._add_line(f"警告: 此文件由 DAQ 编译器自动生成，请勿手动修改")
        self._add_line('"""')
        self._add_line()

    def _generate_imports(self):
        """生成导入语句"""
        self._add_line("import sys")
        self._add_line("import time")
        self._add_line("import logging")
        self._add_line()
        self._add_line("# DAQ Core 导入")
        self._add_line("from daq_core.engine import DAQEngine")
        self._add_line("from daq_core.components import (")
        self._add_line("    ComponentRegistry,", 1)

        # 收集用到的组件类型
        used_components = set()
        for node in self.sorted_nodes:
            comp_name = NODE_TYPE_MAPPING.get(node.type)
            if comp_name:
                used_components.add(comp_name)

        for comp in sorted(used_components):
            self._add_line(f"{comp}Component,", 1)

        self._add_line(")")
        self._add_line()

    def _generate_engine_setup(self):
        """生成引擎初始化代码"""
        self._add_line("# 配置日志")
        self._add_line("logging.basicConfig(")
        self._add_line("level=logging.INFO,", 1)
        self._add_line('format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"', 1)
        self._add_line(")")
        self._add_line("logger = logging.getLogger(__name__)")
        self._add_line()
        self._add_line()
        self._add_line("def create_engine():")
        self._add_line('"""创建并配置 DAQ 引擎"""', 1)
        self._add_line("engine = DAQEngine()", 1)
        self._add_line()

    def _generate_components(self):
        """生成组件创建代码"""
        self._add_line("# 创建组件", 1)

        for node in self.sorted_nodes:
            comp_name = NODE_TYPE_MAPPING.get(node.type, "Unknown")
            if comp_name == "Unknown":
                logger.warning(f"未知节点类型: {node.type}")
                self._add_line(f"# 警告: 未知节点类型 {node.type}", 1)
                continue

            # 转换属性
            config = self._convert_node_properties(node)
            config_str = self._dict_to_python_code(config, indent=8)

            var_name = self._node_id_to_var(node.id)
            self._add_line(f'{var_name} = engine.add_component("{comp_name}", "{node.id}", {config_str})', 1)
            self._add_line()

    def _generate_connections(self):
        """生成连接代码"""
        self._add_line("# 建立连接", 1)

        for wire in self.project.wires:
            self._add_line(
                f'engine.connect("{wire.source.node_id}", "{wire.source.port_id}", '
                f'"{wire.target.node_id}", "{wire.target.port_id}")',
                1
            )

        self._add_line()
        self._add_line("return engine", 1)
        self._add_line()

    def _generate_callbacks(self):
        """生成回调函数"""
        # 检查是否有 MQTT 订阅节点需要回调
        mqtt_nodes = [
            n for n in self.sorted_nodes
            if n.type == "daq:mqtt_subscribe"
        ]

        if mqtt_nodes:
            self._add_line()
            self._add_line("def setup_callbacks(engine):")
            self._add_line('"""设置组件回调"""', 1)

            for node in mqtt_nodes:
                var_name = self._node_id_to_var(node.id)
                # 找到从此节点出发的连线
                outgoing = self.project.get_outgoing_wires(node.id)

                if outgoing:
                    self._add_line()
                    self._add_line(f"# {node.id} 的消息处理回调", 1)
                    self._add_line(f"def on_{var_name}_message(topic, data):", 1)
                    self._add_line(f'logger.debug(f"收到消息 [{{topic}}]: {{data}}")', 2)

                    # 生成数据传递逻辑
                    for wire in outgoing:
                        target_node = self.project.get_node(wire.target.node_id)
                        if target_node:
                            target_var = self._node_id_to_var(wire.target.node_id)
                            self._add_line(f'# 传递数据到 {wire.target.node_id}', 2)
                            self._add_line(f'{target_var} = engine.get_component("{wire.target.node_id}")', 2)
                            self._add_line(f'if {target_var} and isinstance(data, dict) and "value" in data:', 2)
                            self._add_line(f'{target_var}.input_ports["{wire.target.port_id}"].set_value(data["value"])', 3)
                            self._add_line(f'{target_var}.process()', 3)

                    self._add_line()
                    self._add_line(f'{var_name} = engine.get_component("{node.id}")', 1)
                    self._add_line(f'{var_name}.set_message_callback(on_{var_name}_message)', 1)

            self._add_line()

    def _generate_main(self):
        """生成主函数"""
        self._add_line()
        self._add_line("def main():")
        self._add_line(f'"""主函数 - 运行 {self.project.meta.name}"""', 1)
        self._add_line('print("=" * 60)', 1)
        self._add_line(f'print("DAQ 项目: {self.project.meta.name}")', 1)
        self._add_line('print("=" * 60)', 1)
        self._add_line()
        self._add_line("engine = create_engine()", 1)
        self._add_line()

        # 如果有 MQTT 节点，设置回调
        mqtt_nodes = [n for n in self.sorted_nodes if n.type == "daq:mqtt_subscribe"]
        if mqtt_nodes:
            self._add_line("setup_callbacks(engine)", 1)
            self._add_line()

        self._add_line('print("启动引擎...")', 1)
        self._add_line('print("按 Ctrl+C 停止")', 1)
        self._add_line('print("-" * 40)', 1)
        self._add_line()
        self._add_line("try:", 1)
        self._add_line("engine.start()", 2)
        self._add_line()
        self._add_line("while True:", 2)
        self._add_line("time.sleep(1)", 3)
        self._add_line()
        self._add_line("except KeyboardInterrupt:", 1)
        self._add_line('print("\\n接收到停止信号...")', 2)
        self._add_line()
        self._add_line("finally:", 1)
        self._add_line("engine.stop()", 2)
        self._add_line("engine.destroy()", 2)
        self._add_line('print("引擎已停止")', 2)
        self._add_line()
        self._add_line()
        self._add_line('if __name__ == "__main__":')
        self._add_line("main()", 1)

    def _node_id_to_var(self, node_id: str) -> str:
        """将节点 ID 转换为变量名"""
        # 替换不合法字符
        var_name = node_id.replace("-", "_").replace(":", "_").replace(".", "_")
        # 确保不以数字开头
        if var_name[0].isdigit():
            var_name = "node_" + var_name
        return var_name

    def _dict_to_python_code(self, d: Dict[str, Any], indent: int = 4) -> str:
        """将字典转换为 Python 代码格式的字符串"""
        if not d:
            return "{}"

        lines = ["{"]
        indent_str = " " * indent
        items = list(d.items())

        for i, (key, value) in enumerate(items):
            comma = "," if i < len(items) - 1 else ""
            value_str = self._value_to_python_code(value)
            lines.append(f'{indent_str}"{key}": {value_str}{comma}')

        lines.append("    }")  # 闭合花括号缩进 4 空格
        return "\n".join(lines)

    def _value_to_python_code(self, value: Any) -> str:
        """将值转换为 Python 代码"""
        if value is None:
            return "None"
        elif isinstance(value, bool):
            return "True" if value else "False"
        elif isinstance(value, str):
            return repr(value)
        elif isinstance(value, (int, float)):
            return str(value)
        elif isinstance(value, list):
            items = [self._value_to_python_code(v) for v in value]
            return "[" + ", ".join(items) + "]"
        elif isinstance(value, dict):
            items = [f'"{k}": {self._value_to_python_code(v)}' for k, v in value.items()]
            return "{" + ", ".join(items) + "}"
        else:
            return repr(value)

    def _convert_node_properties(self, node: Node) -> Dict[str, Any]:
        """转换节点属性为组件配置"""
        props = node.properties.copy()

        # 根据节点类型添加默认配置
        if node.type == "daq:mqtt_subscribe":
            props.setdefault("broker_host", "localhost")
            props.setdefault("broker_port", 1883)
            props.setdefault("topic", "sensors/#")

        elif node.type == "daq:mqtt_publish":
            props.setdefault("broker_host", "localhost")
            props.setdefault("broker_port", 1883)
            props.setdefault("topic", "output/data")

        elif node.type == "daq:mock_device":
            props.setdefault("broker_host", "localhost")
            props.setdefault("broker_port", 1883)
            props.setdefault("topic", "sensors/mock")
            props.setdefault("wave_type", "sine")
            props.setdefault("interval_ms", 1000)

        elif node.type in ["daq:math", "daq:scale"]:
            props.setdefault("operation", "scale")
            props.setdefault("scale", 1.0)
            props.setdefault("offset", 0)

        elif node.type == "daq:csv_write" or node.type == "daq:csv_storage":
            props.setdefault("file_path", "./data/output.csv")
            props.setdefault("include_timestamp", True)

        elif node.type == "daq:custom_script":
            # CustomScript 节点需要保留 generatedCode 属性
            props.setdefault("generatedCode", "")
            # blocklyXml 只用于前端，后端不需要
            props.pop("blocklyXml", None)

        return props

    def save_to_file(self, output_path: str):
        """保存生成的代码到文件"""
        code = self.generate()
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(code)
        logger.info(f"代码已保存到: {output_path}")

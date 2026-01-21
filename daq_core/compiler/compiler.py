"""
DAQ 编译器
集成解析器、拓扑排序和代码生成器的主入口
"""

import logging
from pathlib import Path
from typing import Optional, Tuple

from .parser import DAQProjectParser, DAQProject
from .topology import TopologySort
from .codegen import CodeGenerator

logger = logging.getLogger(__name__)


class DAQCompiler:
    """
    DAQ 编译器
    将 .daq 项目文件编译为可执行的 Python 脚本
    """

    def __init__(self):
        self.parser = DAQProjectParser()
        self.project: Optional[DAQProject] = None
        self._errors: list = []
        self._warnings: list = []

    def compile_file(self, input_path: str, output_path: Optional[str] = None) -> Tuple[bool, str]:
        """
        编译 .daq 文件

        Args:
            input_path: 输入的 .daq 文件路径
            output_path: 输出的 Python 文件路径，默认为 input_path 同目录下的 _generated.py

        Returns:
            (成功与否, 生成的代码或错误信息)
        """
        self._errors.clear()
        self._warnings.clear()

        # 1. 解析项目文件
        logger.info(f"解析项目文件: {input_path}")
        self.project = self.parser.parse_file(input_path)

        if not self.project:
            self._errors.extend(self.parser.get_errors())
            error_msg = "解析失败:\n" + "\n".join(self._errors)
            logger.error(error_msg)
            return False, error_msg

        self._warnings.extend(self.parser.get_warnings())

        # 2. 拓扑排序
        logger.info("执行拓扑排序...")
        topo = TopologySort(self.project)

        # 验证连接
        valid, conn_errors = topo.validate_connections()
        if not valid:
            self._errors.extend(conn_errors)
            error_msg = "连接验证失败:\n" + "\n".join(conn_errors)
            logger.error(error_msg)
            return False, error_msg

        sorted_nodes = topo.sort()

        if topo.has_cycle():
            error_msg = f"检测到循环依赖，涉及节点: {topo.get_cycle_nodes()}"
            self._errors.append(error_msg)
            logger.error(error_msg)
            return False, error_msg

        # 3. 代码生成
        logger.info("生成 Python 代码...")
        generator = CodeGenerator(self.project, sorted_nodes)
        code = generator.generate()

        # 4. 保存文件
        if output_path is None:
            input_file = Path(input_path)
            output_path = str(input_file.parent / f"{input_file.stem}_generated.py")

        generator.save_to_file(output_path)
        logger.info(f"编译完成: {output_path}")

        return True, code

    def compile_string(self, json_string: str) -> Tuple[bool, str]:
        """
        编译 JSON 字符串

        Args:
            json_string: .daq 项目的 JSON 内容

        Returns:
            (成功与否, 生成的代码或错误信息)
        """
        self._errors.clear()
        self._warnings.clear()

        # 1. 解析
        self.project = self.parser.parse_string(json_string)

        if not self.project:
            self._errors.extend(self.parser.get_errors())
            return False, "解析失败:\n" + "\n".join(self._errors)

        # 2. 拓扑排序
        topo = TopologySort(self.project)
        valid, conn_errors = topo.validate_connections()
        if not valid:
            self._errors.extend(conn_errors)
            return False, "连接验证失败:\n" + "\n".join(conn_errors)

        sorted_nodes = topo.sort()

        if topo.has_cycle():
            return False, f"检测到循环依赖: {topo.get_cycle_nodes()}"

        # 3. 代码生成
        generator = CodeGenerator(self.project, sorted_nodes)
        code = generator.generate()

        return True, code

    def get_errors(self) -> list:
        """获取编译错误"""
        return self._errors.copy()

    def get_warnings(self) -> list:
        """获取警告信息"""
        return self._warnings.copy()

    def get_project(self) -> Optional[DAQProject]:
        """获取解析后的项目"""
        return self.project

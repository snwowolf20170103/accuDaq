"""
CSV 存储组件 - 将数据写入 CSV 文件
"""

import csv
import os
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
import threading

from .base import ComponentBase, ComponentType, ComponentRegistry, PortType

logger = logging.getLogger(__name__)


@ComponentRegistry.register
class CSVStorageComponent(ComponentBase):
    """CSV 存储组件 - 将接收的数据写入 CSV 文件"""

    component_type = ComponentType.STORAGE
    component_name = "CSVStorage"
    component_description = "将数据保存到 CSV 文件"
    component_icon = "📄"

    def __init__(self, instance_id: Optional[str] = None):
        self._file = None
        self._writer = None
        self._headers_written = False
        self._write_lock = threading.Lock()
        self._row_count = 0
        super().__init__(instance_id)

    def _setup_ports(self):
        self.add_input_port("data", PortType.OBJECT, "要存储的数据（字典格式）")
        self.add_input_port("value", PortType.NUMBER, "单个数值")
        self.add_input_port("enable", PortType.BOOLEAN, "启用写入（True=写入，False=跳过）")
        self.add_output_port("row_count", PortType.NUMBER, "已写入行数")
        self.add_output_port("success", PortType.BOOLEAN, "写入是否成功")

    def _on_configure(self):
        """配置默认值"""
        self.config.setdefault("file_path", "./data/output.csv")
        self.config.setdefault("append_mode", True)  # True: 追加, False: 覆盖
        self.config.setdefault("include_timestamp", True)  # 自动添加时间戳列
        self.config.setdefault("columns", [])  # 指定列名（空则自动从数据推断）
        self.config.setdefault("max_rows", 0)  # 最大行数，0 表示无限制
        self.config.setdefault("flush_interval", 10)  # 每 N 行刷新一次

    def _ensure_dir(self, file_path: str):
        """确保目录存在"""
        dir_path = os.path.dirname(file_path)
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path)
            logger.info(f"创建目录: {dir_path}")

    def start(self):
        """打开 CSV 文件准备写入"""
        file_path = self.config["file_path"]
        self._ensure_dir(file_path)

        mode = "a" if self.config["append_mode"] else "w"
        file_exists = os.path.exists(file_path) and os.path.getsize(file_path) > 0

        try:
            self._file = open(file_path, mode, newline="", encoding="utf-8")
            self._writer = csv.writer(self._file)
            self._headers_written = file_exists and self.config["append_mode"]
            self._row_count = 0

            super().start()
            logger.info(f"CSV 文件已打开: {file_path} (模式: {mode})")

        except Exception as e:
            logger.error(f"打开 CSV 文件失败: {e}")
            raise

    def stop(self):
        """关闭 CSV 文件"""
        with self._write_lock:
            if self._file:
                self._file.flush()
                self._file.close()
                self._file = None
                self._writer = None
        super().stop()
        logger.info(f"CSV 文件已关闭，共写入 {self._row_count} 行")

    def process(self):
        """处理输入数据并写入 CSV"""
        # 检查 enable 端口：如果连接了且为 False，则跳过写入
        enable = self.get_input("enable")
        if enable is not None and not enable:
            # 过滤条件未满足，跳过写入
            self.set_output("success", False)
            self.set_output("row_count", self._row_count)
            return False

        data = self.get_input("data")
        value = self.get_input("value")

        if data is not None:
            success = self.write_row(data)
        elif value is not None:
            # 单个数值，包装成字典
            success = self.write_row({"value": value})
        else:
            success = False

        self.set_output("success", success)
        self.set_output("row_count", self._row_count)
        return success

    def write_row(self, data: Dict[str, Any]) -> bool:
        """写入一行数据"""
        if not self._writer or not self._file:
            logger.warning("CSV 文件未打开")
            return False

        # 检查最大行数限制
        max_rows = self.config["max_rows"]
        if max_rows > 0 and self._row_count >= max_rows:
            logger.warning(f"已达到最大行数限制: {max_rows}")
            return False

        with self._write_lock:
            try:
                # 添加时间戳
                row_data = data.copy() if isinstance(data, dict) else {"value": data}
                if self.config["include_timestamp"]:
                    row_data["_timestamp"] = datetime.now().isoformat()

                # 确定列顺序
                if self.config["columns"]:
                    columns = self.config["columns"]
                    if self.config["include_timestamp"] and "_timestamp" not in columns:
                        columns = ["_timestamp"] + columns
                else:
                    columns = list(row_data.keys())

                # 写入表头
                if not self._headers_written:
                    self._writer.writerow(columns)
                    self._headers_written = True

                # 写入数据行
                row = [row_data.get(col, "") for col in columns]
                self._writer.writerow(row)
                self._row_count += 1

                # 定期刷新
                if self._row_count % self.config["flush_interval"] == 0:
                    self._file.flush()

                return True

            except Exception as e:
                logger.error(f"写入 CSV 失败: {e}")
                return False

    def write_batch(self, data_list: List[Dict[str, Any]]) -> int:
        """批量写入多行数据"""
        success_count = 0
        for data in data_list:
            if self.write_row(data):
                success_count += 1
        return success_count

    def get_row_count(self) -> int:
        """获取已写入行数"""
        return self._row_count

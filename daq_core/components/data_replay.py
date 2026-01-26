"""
数据回放系统
支持历史数据加载和回放
"""

import os
import csv
import json
import time
import logging
import threading
from typing import Any, Dict, List, Optional, Callable, Iterator
from datetime import datetime
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class PlaybackState(Enum):
    """回放状态"""
    STOPPED = "stopped"
    PLAYING = "playing"
    PAUSED = "paused"


class DataSource(Enum):
    """数据源类型"""
    CSV = "csv"
    JSON = "json"
    SQLITE = "sqlite"
    MEMORY = "memory"


@dataclass
class DataPoint:
    """数据点"""
    timestamp: float
    values: Dict[str, Any]
    source: str = ""


class DataReader:
    """数据读取器基类"""
    
    def __init__(self, source_path: str = None):
        self.source_path = source_path
        self._data: List[DataPoint] = []
    
    def load(self) -> bool:
        """加载数据"""
        raise NotImplementedError
    
    def get_data(self) -> List[DataPoint]:
        """获取所有数据"""
        return self._data
    
    def get_time_range(self) -> tuple:
        """获取时间范围"""
        if not self._data:
            return (0, 0)
        return (self._data[0].timestamp, self._data[-1].timestamp)
    
    def get_channels(self) -> List[str]:
        """获取通道列表"""
        if not self._data:
            return []
        return list(self._data[0].values.keys())


class CSVDataReader(DataReader):
    """CSV 数据读取器"""
    
    def __init__(self, source_path: str, timestamp_column: str = "timestamp"):
        super().__init__(source_path)
        self.timestamp_column = timestamp_column
    
    def load(self) -> bool:
        try:
            self._data = []
            
            with open(self.source_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    # 解析时间戳
                    timestamp = None
                    if self.timestamp_column in row:
                        ts_str = row[self.timestamp_column]
                        try:
                            timestamp = float(ts_str)
                        except ValueError:
                            try:
                                dt = datetime.fromisoformat(ts_str)
                                timestamp = dt.timestamp()
                            except:
                                timestamp = time.time()
                    else:
                        timestamp = time.time()
                    
                    # 解析值
                    values = {}
                    for key, value in row.items():
                        if key != self.timestamp_column:
                            try:
                                values[key] = float(value)
                            except ValueError:
                                values[key] = value
                    
                    self._data.append(DataPoint(timestamp=timestamp, values=values))
            
            # 按时间排序
            self._data.sort(key=lambda x: x.timestamp)
            
            logger.info(f"CSV 数据已加载: {len(self._data)} 条记录")
            return True
            
        except Exception as e:
            logger.error(f"加载 CSV 数据失败: {e}")
            return False


class JSONDataReader(DataReader):
    """JSON 数据读取器"""
    
    def load(self) -> bool:
        try:
            self._data = []
            
            with open(self.source_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
            
            # 支持两种格式：
            # 1. [{"timestamp": ..., "values": {...}}, ...]
            # 2. [{"timestamp": ..., "key1": ..., "key2": ...}, ...]
            
            if isinstance(raw_data, list):
                for item in raw_data:
                    timestamp = item.get("timestamp", time.time())
                    
                    if "values" in item:
                        values = item["values"]
                    else:
                        values = {k: v for k, v in item.items() if k != "timestamp"}
                    
                    self._data.append(DataPoint(timestamp=timestamp, values=values))
            
            self._data.sort(key=lambda x: x.timestamp)
            
            logger.info(f"JSON 数据已加载: {len(self._data)} 条记录")
            return True
            
        except Exception as e:
            logger.error(f"加载 JSON 数据失败: {e}")
            return False


class SQLiteDataReader(DataReader):
    """SQLite 数据读取器"""
    
    def __init__(self, source_path: str, table_name: str = "data", timestamp_column: str = "timestamp"):
        super().__init__(source_path)
        self.table_name = table_name
        self.timestamp_column = timestamp_column
    
    def load(self) -> bool:
        try:
            import sqlite3
            
            self._data = []
            conn = sqlite3.connect(self.source_path)
            cursor = conn.cursor()
            
            # 获取列名
            cursor.execute(f"PRAGMA table_info({self.table_name})")
            columns = [row[1] for row in cursor.fetchall()]
            
            # 读取数据
            cursor.execute(f"SELECT * FROM {self.table_name} ORDER BY {self.timestamp_column}")
            
            for row in cursor.fetchall():
                row_dict = dict(zip(columns, row))
                timestamp = row_dict.pop(self.timestamp_column, time.time())
                self._data.append(DataPoint(timestamp=timestamp, values=row_dict))
            
            conn.close()
            
            logger.info(f"SQLite 数据已加载: {len(self._data)} 条记录")
            return True
            
        except Exception as e:
            logger.error(f"加载 SQLite 数据失败: {e}")
            return False


class DataPlayer:
    """
    数据回放器
    
    功能：
    - 加载历史数据
    - 按时间顺序回放
    - 支持暂停、继续、跳转
    - 支持速度控制
    """
    
    def __init__(self):
        self._reader: Optional[DataReader] = None
        self._data: List[DataPoint] = []
        self._current_index = 0
        self._state = PlaybackState.STOPPED
        self._speed = 1.0
        self._loop = False
        self._callbacks: List[Callable[[DataPoint], None]] = []
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        self._lock = threading.Lock()
    
    def load_csv(self, filepath: str, timestamp_column: str = "timestamp") -> bool:
        """加载 CSV 文件"""
        self._reader = CSVDataReader(filepath, timestamp_column)
        if self._reader.load():
            self._data = self._reader.get_data()
            self._current_index = 0
            return True
        return False
    
    def load_json(self, filepath: str) -> bool:
        """加载 JSON 文件"""
        self._reader = JSONDataReader(filepath)
        if self._reader.load():
            self._data = self._reader.get_data()
            self._current_index = 0
            return True
        return False
    
    def load_sqlite(self, filepath: str, table_name: str = "data") -> bool:
        """加载 SQLite 数据库"""
        self._reader = SQLiteDataReader(filepath, table_name)
        if self._reader.load():
            self._data = self._reader.get_data()
            self._current_index = 0
            return True
        return False
    
    def load_data(self, data: List[Dict]) -> bool:
        """加载内存数据"""
        try:
            self._data = []
            for item in data:
                timestamp = item.get("timestamp", time.time())
                values = item.get("values", {k: v for k, v in item.items() if k != "timestamp"})
                self._data.append(DataPoint(timestamp=timestamp, values=values))
            
            self._data.sort(key=lambda x: x.timestamp)
            self._current_index = 0
            
            logger.info(f"内存数据已加载: {len(self._data)} 条记录")
            return True
            
        except Exception as e:
            logger.error(f"加载内存数据失败: {e}")
            return False
    
    def add_callback(self, callback: Callable[[DataPoint], None]):
        """添加数据回调"""
        self._callbacks.append(callback)
    
    def remove_callback(self, callback: Callable[[DataPoint], None]):
        """移除数据回调"""
        if callback in self._callbacks:
            self._callbacks.remove(callback)
    
    def set_speed(self, speed: float):
        """设置回放速度（1.0 = 正常速度）"""
        self._speed = max(0.1, min(speed, 100.0))
    
    def set_loop(self, loop: bool):
        """设置是否循环回放"""
        self._loop = loop
    
    def get_state(self) -> PlaybackState:
        """获取回放状态"""
        return self._state
    
    def get_progress(self) -> float:
        """获取回放进度 (0-1)"""
        if not self._data:
            return 0
        return self._current_index / len(self._data)
    
    def get_current_time(self) -> float:
        """获取当前回放时间"""
        if not self._data or self._current_index >= len(self._data):
            return 0
        return self._data[self._current_index].timestamp
    
    def get_time_range(self) -> tuple:
        """获取数据时间范围"""
        if not self._data:
            return (0, 0)
        return (self._data[0].timestamp, self._data[-1].timestamp)
    
    def get_channels(self) -> List[str]:
        """获取通道列表"""
        if not self._data:
            return []
        return list(self._data[0].values.keys())
    
    def get_total_count(self) -> int:
        """获取数据总数"""
        return len(self._data)
    
    def play(self):
        """开始回放"""
        if self._state == PlaybackState.PLAYING:
            return
        
        if not self._data:
            logger.warning("没有数据可回放")
            return
        
        self._state = PlaybackState.PLAYING
        self._stop_event.clear()
        self._pause_event.set()
        
        if not self._thread or not self._thread.is_alive():
            self._thread = threading.Thread(target=self._playback_loop, daemon=True)
            self._thread.start()
        
        logger.info("开始回放")
    
    def pause(self):
        """暂停回放"""
        if self._state == PlaybackState.PLAYING:
            self._state = PlaybackState.PAUSED
            self._pause_event.clear()
            logger.info("暂停回放")
    
    def resume(self):
        """继续回放"""
        if self._state == PlaybackState.PAUSED:
            self._state = PlaybackState.PLAYING
            self._pause_event.set()
            logger.info("继续回放")
    
    def stop(self):
        """停止回放"""
        self._stop_event.set()
        self._pause_event.set()
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
        
        self._state = PlaybackState.STOPPED
        self._current_index = 0
        logger.info("停止回放")
    
    def seek(self, position: float):
        """跳转到指定位置 (0-1)"""
        if not self._data:
            return
        
        with self._lock:
            self._current_index = int(position * len(self._data))
            self._current_index = max(0, min(self._current_index, len(self._data) - 1))
    
    def seek_time(self, timestamp: float):
        """跳转到指定时间"""
        if not self._data:
            return
        
        with self._lock:
            for i, dp in enumerate(self._data):
                if dp.timestamp >= timestamp:
                    self._current_index = i
                    break
    
    def step_forward(self):
        """单步前进"""
        if not self._data or self._current_index >= len(self._data) - 1:
            return
        
        with self._lock:
            self._current_index += 1
            dp = self._data[self._current_index]
            self._emit_data(dp)
    
    def step_backward(self):
        """单步后退"""
        if not self._data or self._current_index <= 0:
            return
        
        with self._lock:
            self._current_index -= 1
            dp = self._data[self._current_index]
            self._emit_data(dp)
    
    def _emit_data(self, data_point: DataPoint):
        """触发数据回调"""
        for callback in self._callbacks:
            try:
                callback(data_point)
            except Exception as e:
                logger.error(f"回放回调执行失败: {e}")
    
    def _playback_loop(self):
        """回放循环"""
        while not self._stop_event.is_set():
            # 等待继续
            self._pause_event.wait()
            
            if self._stop_event.is_set():
                break
            
            with self._lock:
                if self._current_index >= len(self._data):
                    if self._loop:
                        self._current_index = 0
                    else:
                        self._state = PlaybackState.STOPPED
                        break
                
                current_dp = self._data[self._current_index]
                
                # 计算等待时间
                if self._current_index < len(self._data) - 1:
                    next_dp = self._data[self._current_index + 1]
                    wait_time = (next_dp.timestamp - current_dp.timestamp) / self._speed
                else:
                    wait_time = 0
                
                self._current_index += 1
            
            # 触发回调
            self._emit_data(current_dp)
            
            # 等待
            if wait_time > 0:
                self._stop_event.wait(min(wait_time, 1.0))


class DataRecorder:
    """
    数据记录器
    
    功能：
    - 实时记录数据
    - 支持多种输出格式
    - 支持滚动记录
    """
    
    def __init__(self, output_path: str = None, max_records: int = 100000):
        self.output_path = output_path
        self.max_records = max_records
        self._data: List[DataPoint] = []
        self._recording = False
        self._lock = threading.Lock()
        self._file_handle = None
        self._csv_writer = None
        self._headers_written = False
    
    def start(self, output_path: str = None):
        """开始记录"""
        if output_path:
            self.output_path = output_path
        
        self._recording = True
        self._headers_written = False
        
        if self.output_path:
            os.makedirs(os.path.dirname(self.output_path) or ".", exist_ok=True)
            self._file_handle = open(self.output_path, 'w', encoding='utf-8', newline='')
        
        logger.info(f"开始记录数据: {self.output_path or 'memory'}")
    
    def stop(self):
        """停止记录"""
        self._recording = False
        
        if self._file_handle:
            self._file_handle.close()
            self._file_handle = None
        
        logger.info(f"停止记录数据，共 {len(self._data)} 条")
    
    def record(self, values: Dict[str, Any], timestamp: float = None):
        """记录数据点"""
        if not self._recording:
            return
        
        if timestamp is None:
            timestamp = time.time()
        
        dp = DataPoint(timestamp=timestamp, values=values)
        
        with self._lock:
            self._data.append(dp)
            
            # 滚动删除
            if len(self._data) > self.max_records:
                self._data = self._data[-self.max_records:]
        
        # 写入文件
        if self._file_handle and self.output_path.endswith('.csv'):
            if not self._headers_written:
                self._csv_writer = csv.DictWriter(
                    self._file_handle,
                    fieldnames=['timestamp'] + list(values.keys())
                )
                self._csv_writer.writeheader()
                self._headers_written = True
            
            row = {'timestamp': timestamp, **values}
            self._csv_writer.writerow(row)
            self._file_handle.flush()
    
    def get_data(self) -> List[DataPoint]:
        """获取记录的数据"""
        with self._lock:
            return list(self._data)
    
    def clear(self):
        """清除数据"""
        with self._lock:
            self._data.clear()
    
    def export(self, filepath: str, format_type: str = "csv") -> bool:
        """导出数据"""
        try:
            data = self.get_data()
            
            if format_type == "csv":
                with open(filepath, 'w', encoding='utf-8-sig', newline='') as f:
                    if data:
                        fieldnames = ['timestamp'] + list(data[0].values.keys())
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writeheader()
                        for dp in data:
                            writer.writerow({'timestamp': dp.timestamp, **dp.values})
            
            elif format_type == "json":
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(
                        [{"timestamp": dp.timestamp, "values": dp.values} for dp in data],
                        f,
                        indent=2
                    )
            
            logger.info(f"数据已导出: {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"导出数据失败: {e}")
            return False


# 全局实例
_data_player: Optional[DataPlayer] = None
_data_recorder: Optional[DataRecorder] = None


def get_data_player() -> DataPlayer:
    """获取数据回放器"""
    global _data_player
    if _data_player is None:
        _data_player = DataPlayer()
    return _data_player


def get_data_recorder() -> DataRecorder:
    """获取数据记录器"""
    global _data_recorder
    if _data_recorder is None:
        _data_recorder = DataRecorder()
    return _data_recorder

"""
通信日志系统
记录设备通信、异常报警和历史数据
"""

import os
import json
import time
import logging
import threading
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
from enum import Enum
from collections import deque
from pathlib import Path

logger = logging.getLogger(__name__)


class LogLevel(Enum):
    """日志级别"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    ALARM = "ALARM"


class LogEntry:
    """日志条目"""
    
    def __init__(
        self,
        timestamp: float,
        level: LogLevel,
        source: str,
        message: str,
        data: Any = None,
        tags: List[str] = None,
    ):
        self.timestamp = timestamp
        self.level = level
        self.source = source
        self.message = message
        self.data = data
        self.tags = tags or []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "datetime": datetime.fromtimestamp(self.timestamp).isoformat(),
            "level": self.level.value,
            "source": self.source,
            "message": self.message,
            "data": self.data,
            "tags": self.tags,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogEntry':
        return cls(
            timestamp=data["timestamp"],
            level=LogLevel(data["level"]),
            source=data["source"],
            message=data["message"],
            data=data.get("data"),
            tags=data.get("tags", []),
        )


class CommunicationLogger:
    """
    通信日志记录器
    
    功能：
    - 记录设备通信日志
    - 记录异常报警
    - 支持日志过滤和查询
    - 支持日志导出
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._logs: deque = deque(maxlen=10000)  # 内存中最多保留 10000 条
        self._callbacks: List[Callable[[LogEntry], None]] = []
        self._lock = threading.Lock()
        self._db_path: Optional[str] = None
        self._db_conn: Optional[sqlite3.Connection] = None
        self._persist_to_db = False
    
    def configure(
        self,
        max_memory_logs: int = 10000,
        db_path: str = None,
        persist_to_db: bool = False,
    ):
        """配置日志记录器"""
        self._logs = deque(maxlen=max_memory_logs)
        self._db_path = db_path
        self._persist_to_db = persist_to_db
        
        if persist_to_db and db_path:
            self._init_database()
    
    def _init_database(self):
        """初始化数据库"""
        try:
            os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
            self._db_conn = sqlite3.connect(self._db_path, check_same_thread=False)
            
            self._db_conn.execute('''
                CREATE TABLE IF NOT EXISTS comm_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    level TEXT,
                    source TEXT,
                    message TEXT,
                    data TEXT,
                    tags TEXT
                )
            ''')
            
            self._db_conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_timestamp ON comm_logs(timestamp)
            ''')
            self._db_conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_level ON comm_logs(level)
            ''')
            self._db_conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_source ON comm_logs(source)
            ''')
            
            self._db_conn.commit()
            logger.info(f"通信日志数据库已初始化: {self._db_path}")
            
        except Exception as e:
            logger.error(f"初始化日志数据库失败: {e}")
            self._db_conn = None
    
    def log(
        self,
        level: LogLevel,
        source: str,
        message: str,
        data: Any = None,
        tags: List[str] = None,
    ):
        """记录日志"""
        entry = LogEntry(
            timestamp=time.time(),
            level=level,
            source=source,
            message=message,
            data=data,
            tags=tags,
        )
        
        with self._lock:
            self._logs.append(entry)
            
            # 持久化到数据库
            if self._persist_to_db and self._db_conn:
                try:
                    self._db_conn.execute(
                        '''INSERT INTO comm_logs (timestamp, level, source, message, data, tags)
                           VALUES (?, ?, ?, ?, ?, ?)''',
                        (
                            entry.timestamp,
                            entry.level.value,
                            entry.source,
                            entry.message,
                            json.dumps(entry.data) if entry.data else None,
                            json.dumps(entry.tags) if entry.tags else None,
                        )
                    )
                    self._db_conn.commit()
                except Exception as e:
                    logger.error(f"写入日志到数据库失败: {e}")
        
        # 触发回调
        for callback in self._callbacks:
            try:
                callback(entry)
            except Exception as e:
                logger.error(f"日志回调执行失败: {e}")
    
    def debug(self, source: str, message: str, data: Any = None, tags: List[str] = None):
        self.log(LogLevel.DEBUG, source, message, data, tags)
    
    def info(self, source: str, message: str, data: Any = None, tags: List[str] = None):
        self.log(LogLevel.INFO, source, message, data, tags)
    
    def warning(self, source: str, message: str, data: Any = None, tags: List[str] = None):
        self.log(LogLevel.WARNING, source, message, data, tags)
    
    def error(self, source: str, message: str, data: Any = None, tags: List[str] = None):
        self.log(LogLevel.ERROR, source, message, data, tags)
    
    def alarm(self, source: str, message: str, data: Any = None, tags: List[str] = None):
        self.log(LogLevel.ALARM, source, message, data, tags)
    
    def add_callback(self, callback: Callable[[LogEntry], None]):
        """添加日志回调"""
        self._callbacks.append(callback)
    
    def remove_callback(self, callback: Callable[[LogEntry], None]):
        """移除日志回调"""
        if callback in self._callbacks:
            self._callbacks.remove(callback)
    
    def get_logs(
        self,
        level: LogLevel = None,
        source: str = None,
        start_time: float = None,
        end_time: float = None,
        limit: int = 100,
        tags: List[str] = None,
    ) -> List[Dict[str, Any]]:
        """获取日志"""
        with self._lock:
            logs = list(self._logs)
        
        # 过滤
        if level:
            logs = [l for l in logs if l.level == level]
        if source:
            logs = [l for l in logs if source in l.source]
        if start_time:
            logs = [l for l in logs if l.timestamp >= start_time]
        if end_time:
            logs = [l for l in logs if l.timestamp <= end_time]
        if tags:
            logs = [l for l in logs if any(t in l.tags for t in tags)]
        
        # 按时间倒序排列，取最新的
        logs.sort(key=lambda x: x.timestamp, reverse=True)
        logs = logs[:limit]
        
        return [l.to_dict() for l in logs]
    
    def get_logs_from_db(
        self,
        level: LogLevel = None,
        source: str = None,
        start_time: float = None,
        end_time: float = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """从数据库获取历史日志"""
        if not self._db_conn:
            return []
        
        try:
            query = "SELECT timestamp, level, source, message, data, tags FROM comm_logs WHERE 1=1"
            params = []
            
            if level:
                query += " AND level = ?"
                params.append(level.value)
            if source:
                query += " AND source LIKE ?"
                params.append(f"%{source}%")
            if start_time:
                query += " AND timestamp >= ?"
                params.append(start_time)
            if end_time:
                query += " AND timestamp <= ?"
                params.append(end_time)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor = self._db_conn.execute(query, params)
            rows = cursor.fetchall()
            
            return [
                {
                    "timestamp": row[0],
                    "datetime": datetime.fromtimestamp(row[0]).isoformat(),
                    "level": row[1],
                    "source": row[2],
                    "message": row[3],
                    "data": json.loads(row[4]) if row[4] else None,
                    "tags": json.loads(row[5]) if row[5] else [],
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"查询日志数据库失败: {e}")
            return []
    
    def clear_memory_logs(self):
        """清除内存中的日志"""
        with self._lock:
            self._logs.clear()
    
    def export_logs(self, filepath: str, format: str = "json") -> bool:
        """导出日志"""
        try:
            logs = self.get_logs(limit=100000)
            
            if format == "json":
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(logs, f, indent=2, ensure_ascii=False)
            elif format == "csv":
                import csv
                with open(filepath, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=["datetime", "level", "source", "message", "data", "tags"])
                    writer.writeheader()
                    for log in logs:
                        log["data"] = json.dumps(log["data"]) if log["data"] else ""
                        log["tags"] = ",".join(log["tags"]) if log["tags"] else ""
                        writer.writerow(log)
            else:
                logger.error(f"不支持的导出格式: {format}")
                return False
            
            logger.info(f"日志已导出: {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"导出日志失败: {e}")
            return False


class HistoryDataManager:
    """
    历史数据管理器
    
    功能：
    - 存储历史数据到 SQLite
    - 支持时间范围查询
    - 支持数据聚合
    - 支持数据导出
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.path.join(os.path.expanduser("~"), ".accudaq", "history.db")
        self._conn: Optional[sqlite3.Connection] = None
        self._init_database()
    
    def _init_database(self):
        """初始化数据库"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
            
            # 创建数据表
            self._conn.execute('''
                CREATE TABLE IF NOT EXISTS time_series_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    source TEXT,
                    metric TEXT,
                    value REAL,
                    tags TEXT
                )
            ''')
            
            self._conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_ts_timestamp ON time_series_data(timestamp)
            ''')
            self._conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_ts_source ON time_series_data(source)
            ''')
            self._conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_ts_metric ON time_series_data(metric)
            ''')
            
            self._conn.commit()
            logger.info(f"历史数据数据库已初始化: {self.db_path}")
            
        except Exception as e:
            logger.error(f"初始化历史数据数据库失败: {e}")
            self._conn = None
    
    def record(self, source: str, metric: str, value: float, tags: Dict[str, str] = None):
        """记录数据点"""
        if not self._conn:
            return
        
        try:
            self._conn.execute(
                '''INSERT INTO time_series_data (timestamp, source, metric, value, tags)
                   VALUES (?, ?, ?, ?, ?)''',
                (
                    time.time(),
                    source,
                    metric,
                    value,
                    json.dumps(tags) if tags else None,
                )
            )
            self._conn.commit()
        except Exception as e:
            logger.error(f"记录历史数据失败: {e}")
    
    def query(
        self,
        source: str = None,
        metric: str = None,
        start_time: float = None,
        end_time: float = None,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """查询历史数据"""
        if not self._conn:
            return []
        
        try:
            query = "SELECT timestamp, source, metric, value, tags FROM time_series_data WHERE 1=1"
            params = []
            
            if source:
                query += " AND source = ?"
                params.append(source)
            if metric:
                query += " AND metric = ?"
                params.append(metric)
            if start_time:
                query += " AND timestamp >= ?"
                params.append(start_time)
            if end_time:
                query += " AND timestamp <= ?"
                params.append(end_time)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor = self._conn.execute(query, params)
            rows = cursor.fetchall()
            
            return [
                {
                    "timestamp": row[0],
                    "datetime": datetime.fromtimestamp(row[0]).isoformat(),
                    "source": row[1],
                    "metric": row[2],
                    "value": row[3],
                    "tags": json.loads(row[4]) if row[4] else {},
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"查询历史数据失败: {e}")
            return []
    
    def aggregate(
        self,
        source: str,
        metric: str,
        start_time: float,
        end_time: float,
        interval_seconds: int = 60,
        aggregation: str = "avg",  # avg, min, max, sum, count
    ) -> List[Dict[str, Any]]:
        """聚合历史数据"""
        if not self._conn:
            return []
        
        try:
            agg_func = {
                "avg": "AVG",
                "min": "MIN",
                "max": "MAX",
                "sum": "SUM",
                "count": "COUNT",
            }.get(aggregation, "AVG")
            
            query = f'''
                SELECT 
                    CAST((timestamp / ?) AS INTEGER) * ? as bucket,
                    {agg_func}(value) as value
                FROM time_series_data
                WHERE source = ? AND metric = ? AND timestamp >= ? AND timestamp <= ?
                GROUP BY bucket
                ORDER BY bucket
            '''
            
            cursor = self._conn.execute(
                query,
                (interval_seconds, interval_seconds, source, metric, start_time, end_time)
            )
            rows = cursor.fetchall()
            
            return [
                {
                    "timestamp": row[0],
                    "datetime": datetime.fromtimestamp(row[0]).isoformat(),
                    "value": row[1],
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"聚合历史数据失败: {e}")
            return []
    
    def get_sources(self) -> List[str]:
        """获取所有数据源"""
        if not self._conn:
            return []
        
        try:
            cursor = self._conn.execute("SELECT DISTINCT source FROM time_series_data")
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"获取数据源列表失败: {e}")
            return []
    
    def get_metrics(self, source: str = None) -> List[str]:
        """获取所有指标"""
        if not self._conn:
            return []
        
        try:
            if source:
                cursor = self._conn.execute(
                    "SELECT DISTINCT metric FROM time_series_data WHERE source = ?",
                    (source,)
                )
            else:
                cursor = self._conn.execute("SELECT DISTINCT metric FROM time_series_data")
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"获取指标列表失败: {e}")
            return []
    
    def delete_old_data(self, days: int = 30):
        """删除旧数据"""
        if not self._conn:
            return
        
        try:
            cutoff = time.time() - (days * 24 * 3600)
            self._conn.execute(
                "DELETE FROM time_series_data WHERE timestamp < ?",
                (cutoff,)
            )
            self._conn.commit()
            logger.info(f"已删除 {days} 天前的历史数据")
        except Exception as e:
            logger.error(f"删除旧数据失败: {e}")
    
    def export_to_csv(
        self,
        filepath: str,
        source: str = None,
        metric: str = None,
        start_time: float = None,
        end_time: float = None,
    ) -> bool:
        """导出数据到 CSV"""
        try:
            import csv
            
            data = self.query(source, metric, start_time, end_time, limit=1000000)
            
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=["datetime", "source", "metric", "value"])
                writer.writeheader()
                for row in data:
                    writer.writerow({
                        "datetime": row["datetime"],
                        "source": row["source"],
                        "metric": row["metric"],
                        "value": row["value"],
                    })
            
            logger.info(f"历史数据已导出: {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"导出历史数据失败: {e}")
            return False


# 全局实例
_comm_logger: Optional[CommunicationLogger] = None
_history_manager: Optional[HistoryDataManager] = None


def get_comm_logger() -> CommunicationLogger:
    """获取通信日志记录器"""
    global _comm_logger
    if _comm_logger is None:
        _comm_logger = CommunicationLogger()
    return _comm_logger


def get_history_manager() -> HistoryDataManager:
    """获取历史数据管理器"""
    global _history_manager
    if _history_manager is None:
        _history_manager = HistoryDataManager()
    return _history_manager

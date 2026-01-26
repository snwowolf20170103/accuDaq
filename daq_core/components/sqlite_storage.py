"""
SQLite Storage Component for DAQ System

Provides local SQLite database storage for sensor data.
Supports automatic table creation, batch inserts, and queries.
"""

import json
import logging
import sqlite3
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from .base import ComponentBase

logger = logging.getLogger(__name__)


class SQLiteStorageComponent(ComponentBase):
    """SQLite database storage component."""
    
    def __init__(self, node_id: str, properties: Dict[str, Any]):
        super().__init__(node_id, properties)
        self.database_path = properties.get('database_path', './data/daq_data.db')
        self.table_name = properties.get('table_name', 'sensor_data')
        self.auto_create_table = properties.get('auto_create_table', True)
        self.include_timestamp = properties.get('include_timestamp', True)
        self.batch_size = properties.get('batch_size', 100)
        self.flush_interval_ms = properties.get('flush_interval_ms', 5000)
        
        self._connection = None
        self._buffer: List[Dict[str, Any]] = []
        self._buffer_lock = threading.Lock()
        self._last_flush = time.time()
        self._row_count = 0
        self._columns: List[str] = []
        
    def initialize(self):
        """Initialize SQLite database connection."""
        try:
            # Create directory if not exists
            db_path = Path(self.database_path)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Connect to database
            self._connection = sqlite3.connect(
                self.database_path,
                check_same_thread=False,
                isolation_level=None  # Autocommit mode
            )
            self._connection.row_factory = sqlite3.Row
            
            logger.info(f"SQLite connected to {self.database_path}")
            
        except Exception as e:
            logger.error(f"SQLite connection failed: {e}")
            self._connection = None
            
    def _ensure_table(self, data: Dict[str, Any]):
        """Create table if it doesn't exist based on data structure."""
        if not self.auto_create_table or not self._connection:
            return
            
        # Build column definitions from data
        columns = []
        if self.include_timestamp:
            columns.append("timestamp TEXT")
            
        for key, value in data.items():
            col_type = "TEXT"
            if isinstance(value, int):
                col_type = "INTEGER"
            elif isinstance(value, float):
                col_type = "REAL"
            elif isinstance(value, bool):
                col_type = "INTEGER"
            columns.append(f"{key} {col_type}")
            
        # Create table
        columns_sql = ", ".join(columns)
        create_sql = f"CREATE TABLE IF NOT EXISTS {self.table_name} (id INTEGER PRIMARY KEY AUTOINCREMENT, {columns_sql})"
        
        try:
            cursor = self._connection.cursor()
            cursor.execute(create_sql)
            
            # Update column list
            cursor.execute(f"PRAGMA table_info({self.table_name})")
            self._columns = [row[1] for row in cursor.fetchall() if row[1] != 'id']
            
        except Exception as e:
            logger.error(f"Failed to create table: {e}")
            
    def _flush_buffer(self):
        """Flush buffered data to database."""
        if not self._buffer or not self._connection:
            return
            
        with self._buffer_lock:
            if not self._buffer:
                return
                
            buffer_copy = self._buffer.copy()
            self._buffer.clear()
            
        try:
            cursor = self._connection.cursor()
            
            for record in buffer_copy:
                # Prepare INSERT statement
                columns = []
                values = []
                placeholders = []
                
                if self.include_timestamp:
                    columns.append('timestamp')
                    values.append(record.get('timestamp', datetime.now().isoformat()))
                    placeholders.append('?')
                    
                for key, value in record.items():
                    if key != 'timestamp':
                        columns.append(key)
                        if isinstance(value, (dict, list)):
                            values.append(json.dumps(value))
                        else:
                            values.append(value)
                        placeholders.append('?')
                        
                columns_sql = ", ".join(columns)
                placeholders_sql = ", ".join(placeholders)
                insert_sql = f"INSERT INTO {self.table_name} ({columns_sql}) VALUES ({placeholders_sql})"
                
                cursor.execute(insert_sql, values)
                self._row_count += 1
                
            self._last_flush = time.time()
            logger.debug(f"Flushed {len(buffer_copy)} records to SQLite")
            
        except Exception as e:
            logger.error(f"SQLite flush failed: {e}")
            
    def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process SQLite operations."""
        data = inputs.get('data')
        query = inputs.get('query', '')
        
        if not self._connection:
            self.initialize()
            if not self._connection:
                return {
                    'result': [],
                    'row_count': 0,
                    'success': False
                }
        
        result = []
        success = False
        
        try:
            if query:
                # Execute custom query
                cursor = self._connection.cursor()
                cursor.execute(query)
                
                if query.strip().upper().startswith('SELECT'):
                    rows = cursor.fetchall()
                    result = [dict(row) for row in rows]
                else:
                    self._row_count += cursor.rowcount
                    
                success = True
                
            elif data:
                # Insert data
                if isinstance(data, dict):
                    # Ensure table exists
                    if not self._columns:
                        self._ensure_table(data)
                        
                    # Add timestamp
                    if self.include_timestamp and 'timestamp' not in data:
                        data['timestamp'] = datetime.now().isoformat()
                        
                    # Add to buffer
                    with self._buffer_lock:
                        self._buffer.append(data)
                        
                    # Flush if needed
                    current_time = time.time()
                    if (len(self._buffer) >= self.batch_size or 
                        (current_time - self._last_flush) * 1000 >= self.flush_interval_ms):
                        self._flush_buffer()
                        
                success = True
                
        except Exception as e:
            logger.error(f"SQLite operation failed: {e}")
            success = False
            
        return {
            'result': result,
            'row_count': self._row_count,
            'success': success
        }
        
    def cleanup(self):
        """Close SQLite connection."""
        # Flush remaining data
        self._flush_buffer()
        
        if self._connection:
            try:
                self._connection.close()
            except:
                pass
        logger.info("SQLite connection closed")

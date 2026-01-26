"""
TimescaleDB Storage Component for DAQ System

Provides time-series data storage to TimescaleDB (PostgreSQL extension).
Supports hypertables, compression, and continuous aggregates.
"""

import json
import logging
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from .base import ComponentBase

logger = logging.getLogger(__name__)


class TimescaleDBStorageComponent(ComponentBase):
    """TimescaleDB time-series database storage component."""
    
    def __init__(self, node_id: str, properties: Dict[str, Any]):
        super().__init__(node_id, properties)
        self.host = properties.get('host', 'localhost')
        self.port = properties.get('port', 5432)
        self.database = properties.get('database', 'daq_timeseries')
        self.username = properties.get('username', 'postgres')
        self.password = properties.get('password', '')
        self.table_name = properties.get('table_name', 'sensor_data')
        self.time_column = properties.get('time_column', 'timestamp')
        self.chunk_interval = properties.get('chunk_interval', '1 day')
        self.batch_size = properties.get('batch_size', 1000)
        self.auto_create_hypertable = properties.get('auto_create_hypertable', True)
        
        self._connection = None
        self._connected = False
        self._buffer: List[Dict[str, Any]] = []
        self._buffer_lock = threading.Lock()
        self._row_count = 0
        self._columns: List[str] = []
        
    def initialize(self):
        """Initialize TimescaleDB (PostgreSQL) connection."""
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            
            self._connection = psycopg2.connect(
                host=self.host,
                port=self.port,
                database=self.database,
                user=self.username,
                password=self.password,
                connect_timeout=10,
            )
            self._connection.autocommit = True
            self._connected = True
            logger.info(f"TimescaleDB connected to {self.host}:{self.port}/{self.database}")
            
        except ImportError:
            logger.error("psycopg2 package not installed. Run: pip install psycopg2-binary")
            self._connected = False
        except Exception as e:
            logger.error(f"TimescaleDB connection failed: {e}")
            self._connected = False
            
    def _ensure_hypertable(self, sample_data: Dict[str, Any]):
        """Create hypertable if it doesn't exist."""
        if not self.auto_create_hypertable or not self._connection:
            return
            
        try:
            cursor = self._connection.cursor()
            
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = %s
                )
            """, (self.table_name,))
            
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                # Build column definitions
                columns = [f"{self.time_column} TIMESTAMPTZ NOT NULL"]
                for key, value in sample_data.items():
                    if key == self.time_column:
                        continue
                    col_type = "TEXT"
                    if isinstance(value, bool):
                        col_type = "BOOLEAN"
                    elif isinstance(value, int):
                        col_type = "BIGINT"
                    elif isinstance(value, float):
                        col_type = "DOUBLE PRECISION"
                    columns.append(f"{key} {col_type}")
                    
                columns_sql = ", ".join(columns)
                
                # Create regular table
                create_sql = f"CREATE TABLE {self.table_name} ({columns_sql})"
                cursor.execute(create_sql)
                
                # Convert to hypertable
                hypertable_sql = f"""
                    SELECT create_hypertable(
                        '{self.table_name}', 
                        '{self.time_column}',
                        chunk_time_interval => INTERVAL '{self.chunk_interval}',
                        if_not_exists => TRUE
                    )
                """
                try:
                    cursor.execute(hypertable_sql)
                    logger.info(f"Created hypertable {self.table_name}")
                except Exception as e:
                    logger.warning(f"Hypertable creation failed (TimescaleDB may not be installed): {e}")
                    
                # Create index on time column
                index_sql = f"CREATE INDEX IF NOT EXISTS idx_{self.table_name}_{self.time_column} ON {self.table_name} ({self.time_column} DESC)"
                cursor.execute(index_sql)
                
            # Get column list
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s
            """, (self.table_name,))
            self._columns = [row[0] for row in cursor.fetchall()]
            
        except Exception as e:
            logger.error(f"Hypertable creation failed: {e}")
            
    def _flush_buffer(self):
        """Flush buffered data to TimescaleDB."""
        if not self._buffer or not self._connected:
            return
            
        with self._buffer_lock:
            if not self._buffer:
                return
            buffer_copy = self._buffer.copy()
            self._buffer.clear()
            
        try:
            cursor = self._connection.cursor()
            
            for record in buffer_copy:
                # Ensure timestamp
                if self.time_column not in record:
                    record[self.time_column] = datetime.now().isoformat()
                    
                # Filter columns to match table schema
                if self._columns:
                    record = {k: v for k, v in record.items() if k in self._columns}
                    
                columns = list(record.keys())
                values = []
                for v in record.values():
                    if isinstance(v, (dict, list)):
                        values.append(json.dumps(v))
                    else:
                        values.append(v)
                        
                placeholders = ', '.join(['%s'] * len(columns))
                columns_sql = ', '.join(columns)
                
                insert_sql = f"INSERT INTO {self.table_name} ({columns_sql}) VALUES ({placeholders})"
                cursor.execute(insert_sql, values)
                self._row_count += 1
                
            logger.debug(f"Flushed {len(buffer_copy)} records to TimescaleDB")
            
        except Exception as e:
            logger.error(f"TimescaleDB flush failed: {e}")
            self._connected = False
            
    def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process TimescaleDB write operations."""
        data = inputs.get('data', {})
        table = inputs.get('table', self.table_name)
        
        if table != self.table_name:
            self.table_name = table
            self._columns = []  # Reset columns for new table
            
        if not self._connected:
            self.initialize()
            if not self._connected:
                return {
                    'success': False,
                    'row_count': self._row_count,
                    'connected': False
                }
        
        success = False
        
        try:
            if data:
                # Ensure hypertable exists
                if not self._columns:
                    self._ensure_hypertable(data)
                    
                # Add to buffer
                with self._buffer_lock:
                    self._buffer.append(data.copy())
                    
                # Flush if batch size reached
                if len(self._buffer) >= self.batch_size:
                    self._flush_buffer()
                    
                success = True
                
        except Exception as e:
            logger.error(f"TimescaleDB write failed: {e}")
            success = False
            
        return {
            'success': success,
            'row_count': self._row_count,
            'connected': self._connected
        }
        
    def cleanup(self):
        """Close TimescaleDB connection."""
        # Flush remaining data
        self._flush_buffer()
        
        if self._connection:
            try:
                self._connection.close()
            except:
                pass
                
        self._connected = False
        logger.info("TimescaleDB connection closed")

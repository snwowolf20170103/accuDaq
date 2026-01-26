"""
InfluxDB Storage Component for DAQ System

Provides time-series data storage to InfluxDB.
Supports batched writes, configurable precision, and automatic reconnection.
"""

import json
import logging
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from .base import ComponentBase

logger = logging.getLogger(__name__)


class InfluxDBStorageComponent(ComponentBase):
    """InfluxDB time-series database storage component."""
    
    def __init__(self, node_id: str, properties: Dict[str, Any]):
        super().__init__(node_id, properties)
        self.url = properties.get('url', 'http://localhost:8086')
        self.token = properties.get('token', '')
        self.org = properties.get('org', 'daq_org')
        self.bucket = properties.get('bucket', 'daq_data')
        self.measurement = properties.get('measurement', 'sensor_readings')
        self.batch_size = properties.get('batch_size', 1000)
        self.flush_interval_ms = properties.get('flush_interval_ms', 1000)
        self.precision = properties.get('precision', 'ms')
        self.auto_reconnect = properties.get('auto_reconnect', True)
        
        self._client = None
        self._write_api = None
        self._connected = False
        self._buffer: List[Dict[str, Any]] = []
        self._buffer_lock = threading.Lock()
        self._last_flush = time.time()
        self._write_count = 0
        
    def initialize(self):
        """Initialize InfluxDB connection."""
        try:
            from influxdb_client import InfluxDBClient, Point, WritePrecision
            from influxdb_client.client.write_api import SYNCHRONOUS
            
            self._client = InfluxDBClient(
                url=self.url,
                token=self.token,
                org=self.org,
                timeout=10000,
            )
            
            # Test connection
            health = self._client.health()
            if health.status == "pass":
                self._write_api = self._client.write_api(write_options=SYNCHRONOUS)
                self._connected = True
                logger.info(f"InfluxDB connected to {self.url}")
            else:
                logger.error(f"InfluxDB health check failed: {health.message}")
                self._connected = False
                
        except ImportError:
            logger.error("influxdb-client package not installed. Run: pip install influxdb-client")
            self._connected = False
        except Exception as e:
            logger.error(f"InfluxDB connection failed: {e}")
            self._connected = False
            
    def _get_precision(self):
        """Get InfluxDB write precision."""
        from influxdb_client import WritePrecision
        precision_map = {
            'ns': WritePrecision.NS,
            'us': WritePrecision.US,
            'ms': WritePrecision.MS,
            's': WritePrecision.S,
        }
        return precision_map.get(self.precision, WritePrecision.MS)
        
    def _flush_buffer(self):
        """Flush buffered points to InfluxDB."""
        if not self._buffer or not self._connected:
            return
            
        with self._buffer_lock:
            if not self._buffer:
                return
            buffer_copy = self._buffer.copy()
            self._buffer.clear()
            
        try:
            from influxdb_client import Point
            
            points = []
            for record in buffer_copy:
                measurement = record.get('measurement', self.measurement)
                fields = record.get('fields', {})
                tags = record.get('tags', {})
                timestamp = record.get('timestamp')
                
                point = Point(measurement)
                
                # Add tags
                for tag_key, tag_value in tags.items():
                    point = point.tag(tag_key, str(tag_value))
                    
                # Add fields
                for field_key, field_value in fields.items():
                    if isinstance(field_value, bool):
                        point = point.field(field_key, field_value)
                    elif isinstance(field_value, int):
                        point = point.field(field_key, field_value)
                    elif isinstance(field_value, float):
                        point = point.field(field_key, field_value)
                    else:
                        point = point.field(field_key, str(field_value))
                        
                # Add timestamp
                if timestamp:
                    point = point.time(timestamp, self._get_precision())
                    
                points.append(point)
                
            # Write batch
            self._write_api.write(bucket=self.bucket, record=points)
            self._write_count += len(points)
            self._last_flush = time.time()
            logger.debug(f"Flushed {len(points)} points to InfluxDB")
            
        except Exception as e:
            logger.error(f"InfluxDB flush failed: {e}")
            self._connected = False
            
    def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process InfluxDB write operations."""
        measurement = inputs.get('measurement', self.measurement)
        fields = inputs.get('fields', {})
        tags = inputs.get('tags', {})
        timestamp = inputs.get('timestamp')
        
        if not self._connected:
            if self.auto_reconnect:
                self.initialize()
            if not self._connected:
                return {
                    'success': False,
                    'write_count': self._write_count,
                    'connected': False
                }
        
        success = False
        
        try:
            if fields:
                # Prepare data point
                record = {
                    'measurement': measurement,
                    'fields': fields,
                    'tags': tags,
                    'timestamp': timestamp or int(time.time() * 1000),  # ms precision
                }
                
                # Add to buffer
                with self._buffer_lock:
                    self._buffer.append(record)
                    
                # Flush if needed
                current_time = time.time()
                if (len(self._buffer) >= self.batch_size or 
                    (current_time - self._last_flush) * 1000 >= self.flush_interval_ms):
                    self._flush_buffer()
                    
                success = True
                
        except Exception as e:
            logger.error(f"InfluxDB write failed: {e}")
            success = False
            
        return {
            'success': success,
            'write_count': self._write_count,
            'connected': self._connected
        }
        
    def cleanup(self):
        """Close InfluxDB connection."""
        # Flush remaining data
        self._flush_buffer()
        
        if self._write_api:
            try:
                self._write_api.close()
            except:
                pass
                
        if self._client:
            try:
                self._client.close()
            except:
                pass
                
        self._connected = False
        logger.info("InfluxDB connection closed")

"""
Redis Cache Component for DAQ System

Provides Redis-based caching for real-time data storage and retrieval.
Supports various Redis operations like GET, SET, HSET, LPUSH, etc.
"""

import json
import logging
from typing import Any, Dict, Optional
from .base import ComponentBase

logger = logging.getLogger(__name__)


class RedisCacheComponent(ComponentBase):
    """Redis cache storage component."""
    
    def __init__(self, node_id: str, properties: Dict[str, Any]):
        super().__init__(node_id, properties)
        self.host = properties.get('host', 'localhost')
        self.port = properties.get('port', 6379)
        self.password = properties.get('password', '')
        self.db = properties.get('db', 0)
        self.key_prefix = properties.get('key_prefix', 'daq:')
        self.default_ttl = properties.get('default_ttl', 3600)
        self.auto_reconnect = properties.get('auto_reconnect', True)
        
        self.client = None
        self._connected = False
        
    def initialize(self):
        """Initialize Redis connection."""
        try:
            import redis
            
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                password=self.password if self.password else None,
                db=self.db,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=self.auto_reconnect,
            )
            
            # Test connection
            self.client.ping()
            self._connected = True
            logger.info(f"Redis connected to {self.host}:{self.port}")
            
        except ImportError:
            logger.error("redis-py package not installed. Run: pip install redis")
            self._connected = False
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            self._connected = False
            
    def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Process Redis operations."""
        data = inputs.get('data')
        key = inputs.get('key', '')
        operation = inputs.get('operation', 'set')
        
        if not self._connected:
            if self.auto_reconnect:
                self.initialize()
            if not self._connected:
                return {
                    'result': None,
                    'success': False,
                    'connected': False
                }
        
        full_key = f"{self.key_prefix}{key}"
        result = None
        success = False
        
        try:
            if operation == 'set':
                # Store data with optional TTL
                if isinstance(data, (dict, list)):
                    data = json.dumps(data)
                self.client.setex(full_key, self.default_ttl, str(data))
                result = True
                success = True
                
            elif operation == 'get':
                # Retrieve data
                value = self.client.get(full_key)
                if value:
                    try:
                        result = json.loads(value)
                    except json.JSONDecodeError:
                        result = value
                success = True
                
            elif operation == 'delete':
                # Delete key
                result = self.client.delete(full_key) > 0
                success = True
                
            elif operation == 'exists':
                # Check if key exists
                result = self.client.exists(full_key) > 0
                success = True
                
            elif operation == 'hset':
                # Hash set operation
                if isinstance(data, dict):
                    self.client.hset(full_key, mapping=data)
                    result = True
                success = True
                
            elif operation == 'hget':
                # Hash get all
                result = self.client.hgetall(full_key)
                success = True
                
            elif operation == 'lpush':
                # List push (for time-series data)
                if isinstance(data, (dict, list)):
                    data = json.dumps(data)
                self.client.lpush(full_key, str(data))
                # Trim list to keep last N items
                self.client.ltrim(full_key, 0, 9999)
                result = True
                success = True
                
            elif operation == 'lrange':
                # List range get
                count = inputs.get('count', 100)
                items = self.client.lrange(full_key, 0, count - 1)
                result = []
                for item in items:
                    try:
                        result.append(json.loads(item))
                    except json.JSONDecodeError:
                        result.append(item)
                success = True
                
            elif operation == 'incr':
                # Increment counter
                result = self.client.incr(full_key)
                success = True
                
            elif operation == 'publish':
                # Pub/Sub publish
                channel = inputs.get('channel', 'daq:events')
                if isinstance(data, (dict, list)):
                    data = json.dumps(data)
                result = self.client.publish(channel, str(data))
                success = True
                
            else:
                logger.warning(f"Unknown Redis operation: {operation}")
                
        except Exception as e:
            logger.error(f"Redis operation failed: {e}")
            self._connected = False
            success = False
            
        return {
            'result': result,
            'success': success,
            'connected': self._connected
        }
        
    def cleanup(self):
        """Close Redis connection."""
        if self.client:
            try:
                self.client.close()
            except:
                pass
        self._connected = False
        logger.info("Redis connection closed")

"""
变量绑定系统
支持设备变量与 UI 控件的双向绑定
"""

import logging
import threading
import time
from typing import Any, Dict, List, Optional, Callable, Set
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class BindingDirection(Enum):
    """绑定方向"""
    READ = "read"           # 从设备读取到 UI
    WRITE = "write"         # 从 UI 写入到设备
    BIDIRECTIONAL = "bidirectional"  # 双向绑定


class BindingType(Enum):
    """绑定类型"""
    DIRECT = "direct"       # 直接绑定
    TRANSFORM = "transform" # 带转换函数
    COMPUTED = "computed"   # 计算属性


@dataclass
class VariableBinding:
    """变量绑定定义"""
    id: str
    source_component: str    # 源组件 ID
    source_port: str         # 源端口名
    target_component: str    # 目标组件 ID（UI 控件）
    target_property: str     # 目标属性名
    direction: BindingDirection = BindingDirection.READ
    binding_type: BindingType = BindingType.DIRECT
    transform_func: Optional[str] = None  # 转换函数（可执行的 Python 表达式）
    update_interval_ms: int = 100         # 更新间隔
    enabled: bool = True
    last_value: Any = None
    last_update: float = 0


class VariableBindingManager:
    """
    变量绑定管理器
    
    功能：
    - 管理设备变量与 UI 控件的绑定关系
    - 支持单向/双向绑定
    - 支持值转换
    - 支持批量更新
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
        self._bindings: Dict[str, VariableBinding] = {}
        self._source_index: Dict[str, Set[str]] = {}  # source_key -> binding_ids
        self._target_index: Dict[str, Set[str]] = {}  # target_key -> binding_ids
        self._value_callbacks: Dict[str, List[Callable]] = {}
        self._update_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        
        # 组件引用（用于获取/设置值）
        self._component_registry = {}
        self._ui_registry = {}
    
    def register_component(self, component_id: str, component: Any):
        """注册组件"""
        self._component_registry[component_id] = component
    
    def unregister_component(self, component_id: str):
        """取消注册组件"""
        if component_id in self._component_registry:
            del self._component_registry[component_id]
    
    def register_ui_element(self, element_id: str, getter: Callable, setter: Callable):
        """
        注册 UI 元素
        
        Args:
            element_id: UI 元素 ID
            getter: 获取值的函数
            setter: 设置值的函数
        """
        self._ui_registry[element_id] = {"getter": getter, "setter": setter}
    
    def unregister_ui_element(self, element_id: str):
        """取消注册 UI 元素"""
        if element_id in self._ui_registry:
            del self._ui_registry[element_id]
    
    def create_binding(
        self,
        source_component: str,
        source_port: str,
        target_component: str,
        target_property: str,
        direction: BindingDirection = BindingDirection.READ,
        binding_type: BindingType = BindingType.DIRECT,
        transform_func: str = None,
        update_interval_ms: int = 100,
    ) -> str:
        """
        创建变量绑定
        
        Returns:
            绑定 ID
        """
        binding_id = f"{source_component}.{source_port}->{target_component}.{target_property}"
        
        binding = VariableBinding(
            id=binding_id,
            source_component=source_component,
            source_port=source_port,
            target_component=target_component,
            target_property=target_property,
            direction=direction,
            binding_type=binding_type,
            transform_func=transform_func,
            update_interval_ms=update_interval_ms,
        )
        
        with self._lock:
            self._bindings[binding_id] = binding
            
            # 更新索引
            source_key = f"{source_component}.{source_port}"
            if source_key not in self._source_index:
                self._source_index[source_key] = set()
            self._source_index[source_key].add(binding_id)
            
            target_key = f"{target_component}.{target_property}"
            if target_key not in self._target_index:
                self._target_index[target_key] = set()
            self._target_index[target_key].add(binding_id)
        
        logger.info(f"创建变量绑定: {binding_id}")
        return binding_id
    
    def remove_binding(self, binding_id: str):
        """移除绑定"""
        with self._lock:
            if binding_id not in self._bindings:
                return
            
            binding = self._bindings[binding_id]
            
            # 更新索引
            source_key = f"{binding.source_component}.{binding.source_port}"
            if source_key in self._source_index:
                self._source_index[source_key].discard(binding_id)
            
            target_key = f"{binding.target_component}.{binding.target_property}"
            if target_key in self._target_index:
                self._target_index[target_key].discard(binding_id)
            
            del self._bindings[binding_id]
        
        logger.info(f"移除变量绑定: {binding_id}")
    
    def enable_binding(self, binding_id: str, enabled: bool = True):
        """启用/禁用绑定"""
        with self._lock:
            if binding_id in self._bindings:
                self._bindings[binding_id].enabled = enabled
    
    def get_binding(self, binding_id: str) -> Optional[VariableBinding]:
        """获取绑定信息"""
        return self._bindings.get(binding_id)
    
    def list_bindings(self) -> List[Dict]:
        """列出所有绑定"""
        return [
            {
                "id": b.id,
                "source": f"{b.source_component}.{b.source_port}",
                "target": f"{b.target_component}.{b.target_property}",
                "direction": b.direction.value,
                "enabled": b.enabled,
                "last_value": b.last_value,
            }
            for b in self._bindings.values()
        ]
    
    def add_value_callback(self, binding_id: str, callback: Callable[[Any], None]):
        """添加值变化回调"""
        if binding_id not in self._value_callbacks:
            self._value_callbacks[binding_id] = []
        self._value_callbacks[binding_id].append(callback)
    
    def remove_value_callback(self, binding_id: str, callback: Callable[[Any], None]):
        """移除值变化回调"""
        if binding_id in self._value_callbacks:
            if callback in self._value_callbacks[binding_id]:
                self._value_callbacks[binding_id].remove(callback)
    
    def _get_source_value(self, binding: VariableBinding) -> Any:
        """获取源值"""
        component = self._component_registry.get(binding.source_component)
        if component is None:
            return None
        
        try:
            return component.get_output(binding.source_port)
        except Exception as e:
            logger.debug(f"获取源值失败: {e}")
            return None
    
    def _set_target_value(self, binding: VariableBinding, value: Any):
        """设置目标值"""
        ui_element = self._ui_registry.get(binding.target_component)
        if ui_element is None:
            return
        
        try:
            setter = ui_element.get("setter")
            if setter:
                setter(binding.target_property, value)
        except Exception as e:
            logger.debug(f"设置目标值失败: {e}")
    
    def _transform_value(self, binding: VariableBinding, value: Any) -> Any:
        """转换值"""
        if binding.binding_type != BindingType.TRANSFORM or not binding.transform_func:
            return value
        
        try:
            # 执行转换函数
            return eval(binding.transform_func, {"value": value, "math": __import__("math")})
        except Exception as e:
            logger.error(f"值转换失败: {e}")
            return value
    
    def _update_binding(self, binding: VariableBinding):
        """更新单个绑定"""
        if not binding.enabled:
            return
        
        current_time = time.time() * 1000
        if current_time - binding.last_update < binding.update_interval_ms:
            return
        
        binding.last_update = current_time
        
        # 读取方向
        if binding.direction in [BindingDirection.READ, BindingDirection.BIDIRECTIONAL]:
            value = self._get_source_value(binding)
            if value is not None and value != binding.last_value:
                transformed_value = self._transform_value(binding, value)
                self._set_target_value(binding, transformed_value)
                binding.last_value = value
                
                # 触发回调
                for callback in self._value_callbacks.get(binding.id, []):
                    try:
                        callback(transformed_value)
                    except Exception as e:
                        logger.error(f"值回调执行失败: {e}")
    
    def update_all(self):
        """更新所有绑定"""
        with self._lock:
            for binding in self._bindings.values():
                try:
                    self._update_binding(binding)
                except Exception as e:
                    logger.error(f"更新绑定失败 {binding.id}: {e}")
    
    def start(self):
        """启动自动更新"""
        if self._update_thread and self._update_thread.is_alive():
            return
        
        self._stop_event.clear()
        self._update_thread = threading.Thread(target=self._update_loop, daemon=True)
        self._update_thread.start()
        logger.info("变量绑定管理器已启动")
    
    def stop(self):
        """停止自动更新"""
        self._stop_event.set()
        if self._update_thread and self._update_thread.is_alive():
            self._update_thread.join(timeout=2)
        logger.info("变量绑定管理器已停止")
    
    def _update_loop(self):
        """更新循环"""
        while not self._stop_event.is_set():
            try:
                self.update_all()
                self._stop_event.wait(0.01)  # 10ms
            except Exception as e:
                logger.error(f"更新循环异常: {e}")
    
    def notify_source_change(self, source_component: str, source_port: str, value: Any):
        """
        通知源值变化（用于推模式）
        """
        source_key = f"{source_component}.{source_port}"
        binding_ids = self._source_index.get(source_key, set())
        
        for binding_id in binding_ids:
            binding = self._bindings.get(binding_id)
            if binding and binding.enabled:
                if binding.direction in [BindingDirection.READ, BindingDirection.BIDIRECTIONAL]:
                    transformed_value = self._transform_value(binding, value)
                    self._set_target_value(binding, transformed_value)
                    binding.last_value = value
                    binding.last_update = time.time() * 1000
                    
                    for callback in self._value_callbacks.get(binding_id, []):
                        try:
                            callback(transformed_value)
                        except Exception as e:
                            logger.error(f"值回调执行失败: {e}")


class DeviceMonitor:
    """
    设备状态监控器
    
    功能：
    - 实时监控设备连接状态
    - 监控设备变量值
    - 提供状态变化通知
    """
    
    def __init__(self):
        self._devices: Dict[str, Dict] = {}
        self._status_callbacks: List[Callable] = []
        self._lock = threading.Lock()
    
    def register_device(self, device_id: str, device_component: Any, variables: List[str] = None):
        """
        注册设备进行监控
        
        Args:
            device_id: 设备 ID
            device_component: 设备组件实例
            variables: 需要监控的变量列表
        """
        with self._lock:
            self._devices[device_id] = {
                "component": device_component,
                "variables": variables or [],
                "status": "unknown",
                "last_values": {},
                "last_check": 0,
            }
        logger.info(f"设备已注册监控: {device_id}")
    
    def unregister_device(self, device_id: str):
        """取消设备监控"""
        with self._lock:
            if device_id in self._devices:
                del self._devices[device_id]
        logger.info(f"设备监控已取消: {device_id}")
    
    def add_status_callback(self, callback: Callable[[str, str, Dict], None]):
        """
        添加状态变化回调
        
        callback(device_id, status, data)
        """
        self._status_callbacks.append(callback)
    
    def get_device_status(self, device_id: str) -> Optional[Dict]:
        """获取设备状态"""
        with self._lock:
            device = self._devices.get(device_id)
            if not device:
                return None
            
            component = device["component"]
            
            # 检查连接状态
            connected = False
            try:
                if hasattr(component, "_is_connected"):
                    connected = component._is_connected
                elif hasattr(component, "is_connected"):
                    connected = component.is_connected
                else:
                    connected = component._is_running if hasattr(component, "_is_running") else True
            except:
                pass
            
            status = "connected" if connected else "disconnected"
            
            # 获取变量值
            values = {}
            for var_name in device["variables"]:
                try:
                    values[var_name] = component.get_output(var_name)
                except:
                    values[var_name] = None
            
            return {
                "device_id": device_id,
                "status": status,
                "connected": connected,
                "variables": values,
                "last_check": time.time(),
            }
    
    def get_all_status(self) -> List[Dict]:
        """获取所有设备状态"""
        return [self.get_device_status(device_id) for device_id in self._devices.keys()]
    
    def check_all(self):
        """检查所有设备状态"""
        for device_id in list(self._devices.keys()):
            try:
                status = self.get_device_status(device_id)
                if status:
                    old_status = self._devices[device_id].get("status")
                    new_status = status["status"]
                    
                    if old_status != new_status:
                        self._devices[device_id]["status"] = new_status
                        # 触发回调
                        for callback in self._status_callbacks:
                            try:
                                callback(device_id, new_status, status)
                            except Exception as e:
                                logger.error(f"状态回调执行失败: {e}")
                    
                    self._devices[device_id]["last_values"] = status["variables"]
                    self._devices[device_id]["last_check"] = status["last_check"]
            except Exception as e:
                logger.error(f"检查设备状态失败 {device_id}: {e}")


# 全局实例
_binding_manager: Optional[VariableBindingManager] = None
_device_monitor: Optional[DeviceMonitor] = None


def get_binding_manager() -> VariableBindingManager:
    """获取变量绑定管理器"""
    global _binding_manager
    if _binding_manager is None:
        _binding_manager = VariableBindingManager()
    return _binding_manager


def get_device_monitor() -> DeviceMonitor:
    """获取设备监控器"""
    global _device_monitor
    if _device_monitor is None:
        _device_monitor = DeviceMonitor()
    return _device_monitor

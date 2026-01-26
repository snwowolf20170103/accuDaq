"""
组件基类 - 定义统一的组件接口规范
所有组件都必须继承 ComponentBase
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from enum import Enum
import uuid
import logging

logger = logging.getLogger(__name__)


class ComponentType(Enum):
    """组件类型枚举"""
    DEVICE = "device"           # 设备组件（数据源）
    COMMUNICATION = "communication"  # 通信组件
    LOGIC = "logic"             # 逻辑处理组件
    PROCESS = "process"         # 处理组件（数据处理/转换）
    STORAGE = "storage"         # 存储组件
    DISPLAY = "display"         # 显示组件
    CONTROL = "control"         # 控制组件（定时、流程控制）


class PortType(Enum):
    """端口数据类型"""
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    ANY = "any"


class Port:
    """组件端口定义"""
    def __init__(self, name: str, port_type: PortType, description: str = ""):
        self.name = name
        self.port_type = port_type
        self.description = description
        self.value: Any = None
        self.connected_to: Optional['Port'] = None

    def set_value(self, value: Any):
        self.value = value

    def get_value(self) -> Any:
        return self.value


class ComponentBase(ABC):
    """
    组件基类
    生命周期：init → configure → start → process → stop → destroy
    """

    # 类级别元信息（子类需覆盖）
    component_type: ComponentType = ComponentType.LOGIC
    component_name: str = "BaseComponent"
    component_description: str = ""
    component_icon: str = "📦"

    def __init__(self, instance_id: Optional[str] = None):
        self.instance_id = instance_id or str(uuid.uuid4())[:8]
        self.config: Dict[str, Any] = {}
        self.input_ports: Dict[str, Port] = {}
        self.output_ports: Dict[str, Port] = {}
        self._is_running = False
        self._setup_ports()
        logger.debug(f"组件 {self.component_name}({self.instance_id}) 已初始化")

    @abstractmethod
    def _setup_ports(self):
        """设置输入输出端口（子类必须实现）"""
        pass

    def configure(self, config: Dict[str, Any]):
        """配置组件参数"""
        self.config.update(config)
        self._on_configure()
        logger.debug(f"组件 {self.instance_id} 配置更新: {config}")

    def _on_configure(self):
        """配置变更回调（子类可重写）"""
        pass

    @abstractmethod
    def start(self):
        """启动组件"""
        self._is_running = True
        logger.info(f"组件 {self.component_name}({self.instance_id}) 已启动")

    @abstractmethod
    def stop(self):
        """停止组件"""
        self._is_running = False
        logger.info(f"组件 {self.component_name}({self.instance_id}) 已停止")

    @abstractmethod
    def process(self):
        """处理数据（核心逻辑）"""
        pass

    def destroy(self):
        """销毁组件，释放资源"""
        if self._is_running:
            self.stop()
        logger.debug(f"组件 {self.instance_id} 已销毁")

    def get_input(self, port_name: str) -> Any:
        """获取输入端口的值"""
        if port_name in self.input_ports:
            return self.input_ports[port_name].get_value()
        return None

    def set_output(self, port_name: str, value: Any):
        """设置输出端口的值"""
        if port_name in self.output_ports:
            self.output_ports[port_name].set_value(value)

    def add_input_port(self, name: str, port_type: PortType, description: str = ""):
        """添加输入端口"""
        self.input_ports[name] = Port(name, port_type, description)

    def add_output_port(self, name: str, port_type: PortType, description: str = ""):
        """添加输出端口"""
        self.output_ports[name] = Port(name, port_type, description)

    def get_descriptor(self) -> Dict[str, Any]:
        """获取组件描述信息（用于前端展示）"""
        return {
            "id": self.instance_id,
            "type": self.component_type.value,
            "name": self.component_name,
            "description": self.component_description,
            "icon": self.component_icon,
            "config": self.config,
            "inputs": [
                {"name": p.name, "type": p.port_type.value, "description": p.description}
                for p in self.input_ports.values()
            ],
            "outputs": [
                {"name": p.name, "type": p.port_type.value, "description": p.description}
                for p in self.output_ports.values()
            ],
        }


class ComponentRegistry:
    """组件注册表 - 管理所有可用组件"""

    _instance = None
    _registry: Dict[str, type] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def register(cls, name_or_class=None):
        """
        注册组件类
        支持两种用法：
        1. @ComponentRegistry.register          - 使用类的 component_name
        2. @ComponentRegistry.register('Name')  - 使用指定名称
        """
        def decorator(component_class: type):
            # 如果提供了名称字符串，使用它；否则使用类的 component_name
            if isinstance(name_or_class, str):
                name = name_or_class
            else:
                name = component_class.component_name
            cls._registry[name] = component_class
            logger.debug(f"注册组件: {name}")
            return component_class
        
        # 如果直接传入了类（不带参数的装饰器），直接注册
        if isinstance(name_or_class, type):
            return decorator(name_or_class)
        # 否则返回装饰器函数
        return decorator

    @classmethod
    def get(cls, name: str) -> Optional[type]:
        """获取组件类"""
        return cls._registry.get(name)

    @classmethod
    def create(cls, name: str, instance_id: Optional[str] = None, config: Optional[Dict] = None) -> Optional[ComponentBase]:
        """创建组件实例"""
        component_class = cls.get(name)
        if component_class:
            instance = component_class(instance_id)
            if config:
                instance.configure(config)
            return instance
        logger.warning(f"未找到组件: {name}")
        return None

    @classmethod
    def list_all(cls) -> List[Dict[str, Any]]:
        """列出所有已注册组件"""
        result = []
        for name, component_class in cls._registry.items():
            result.append({
                "name": name,
                "type": component_class.component_type.value,
                "description": component_class.component_description,
                "icon": component_class.component_icon,
            })
        return result

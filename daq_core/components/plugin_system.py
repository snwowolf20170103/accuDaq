"""
设备驱动插件系统
支持动态加载和管理设备驱动插件
"""

import os
import sys
import json
import importlib
import importlib.util
import logging
from typing import Any, Dict, List, Optional, Type
from pathlib import Path

from .base import ComponentBase, ComponentRegistry

logger = logging.getLogger(__name__)


class PluginMetadata:
    """插件元数据"""
    
    def __init__(
        self,
        name: str,
        version: str,
        author: str = "",
        description: str = "",
        dependencies: List[str] = None,
        components: List[str] = None,
    ):
        self.name = name
        self.version = version
        self.author = author
        self.description = description
        self.dependencies = dependencies or []
        self.components = components or []
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PluginMetadata':
        return cls(
            name=data.get("name", "Unknown"),
            version=data.get("version", "0.0.0"),
            author=data.get("author", ""),
            description=data.get("description", ""),
            dependencies=data.get("dependencies", []),
            components=data.get("components", []),
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "author": self.author,
            "description": self.description,
            "dependencies": self.dependencies,
            "components": self.components,
        }


class PluginLoader:
    """插件加载器"""
    
    def __init__(self, plugin_dirs: List[str] = None):
        self.plugin_dirs = plugin_dirs or []
        self.loaded_plugins: Dict[str, PluginMetadata] = {}
        self._plugin_modules: Dict[str, Any] = {}
    
    def add_plugin_dir(self, path: str):
        """添加插件目录"""
        if path not in self.plugin_dirs:
            self.plugin_dirs.append(path)
            # 将目录添加到 Python 路径
            if path not in sys.path:
                sys.path.insert(0, path)
    
    def discover_plugins(self) -> List[Dict[str, Any]]:
        """发现所有可用插件"""
        plugins = []
        
        for plugin_dir in self.plugin_dirs:
            if not os.path.isdir(plugin_dir):
                continue
            
            for item in os.listdir(plugin_dir):
                plugin_path = os.path.join(plugin_dir, item)
                
                # 检查是否是有效的插件目录
                if os.path.isdir(plugin_path):
                    manifest_path = os.path.join(plugin_path, "plugin.json")
                    if os.path.exists(manifest_path):
                        try:
                            with open(manifest_path, 'r', encoding='utf-8') as f:
                                manifest = json.load(f)
                            manifest["path"] = plugin_path
                            manifest["loaded"] = item in self.loaded_plugins
                            plugins.append(manifest)
                        except Exception as e:
                            logger.error(f"读取插件清单失败 {manifest_path}: {e}")
                
                # 检查单文件插件
                elif item.endswith(".py") and not item.startswith("_"):
                    plugins.append({
                        "name": item[:-3],
                        "version": "unknown",
                        "path": plugin_path,
                        "type": "single_file",
                        "loaded": item[:-3] in self.loaded_plugins,
                    })
        
        return plugins
    
    def load_plugin(self, plugin_name_or_path: str) -> Optional[PluginMetadata]:
        """加载插件"""
        # 确定插件路径
        plugin_path = None
        manifest = None
        
        if os.path.exists(plugin_name_or_path):
            plugin_path = plugin_name_or_path
        else:
            # 在已注册目录中查找
            for plugin_dir in self.plugin_dirs:
                candidate = os.path.join(plugin_dir, plugin_name_or_path)
                if os.path.exists(candidate):
                    plugin_path = candidate
                    break
        
        if not plugin_path:
            logger.error(f"插件未找到: {plugin_name_or_path}")
            return None
        
        try:
            if os.path.isdir(plugin_path):
                # 目录型插件
                manifest_path = os.path.join(plugin_path, "plugin.json")
                if os.path.exists(manifest_path):
                    with open(manifest_path, 'r', encoding='utf-8') as f:
                        manifest = json.load(f)
                else:
                    manifest = {"name": os.path.basename(plugin_path), "version": "0.0.0"}
                
                # 加载主模块
                init_path = os.path.join(plugin_path, "__init__.py")
                if os.path.exists(init_path):
                    spec = importlib.util.spec_from_file_location(manifest["name"], init_path)
                    module = importlib.util.module_from_spec(spec)
                    sys.modules[manifest["name"]] = module
                    spec.loader.exec_module(module)
                    self._plugin_modules[manifest["name"]] = module
            else:
                # 单文件插件
                plugin_name = os.path.splitext(os.path.basename(plugin_path))[0]
                manifest = {"name": plugin_name, "version": "0.0.0"}
                
                spec = importlib.util.spec_from_file_location(plugin_name, plugin_path)
                module = importlib.util.module_from_spec(spec)
                sys.modules[plugin_name] = module
                spec.loader.exec_module(module)
                self._plugin_modules[plugin_name] = module
            
            # 创建元数据
            metadata = PluginMetadata.from_dict(manifest)
            
            # 收集组件信息
            if manifest["name"] in self._plugin_modules:
                module = self._plugin_modules[manifest["name"]]
                # 查找所有 ComponentBase 子类
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, type) and issubclass(attr, ComponentBase) and attr is not ComponentBase:
                        if attr.component_name not in metadata.components:
                            metadata.components.append(attr.component_name)
            
            self.loaded_plugins[manifest["name"]] = metadata
            logger.info(f"插件加载成功: {metadata.name} v{metadata.version}, 组件: {metadata.components}")
            
            return metadata
            
        except Exception as e:
            logger.error(f"加载插件失败 {plugin_name_or_path}: {e}")
            return None
    
    def unload_plugin(self, plugin_name: str) -> bool:
        """卸载插件"""
        if plugin_name not in self.loaded_plugins:
            logger.warning(f"插件未加载: {plugin_name}")
            return False
        
        try:
            # 移除模块
            if plugin_name in self._plugin_modules:
                del self._plugin_modules[plugin_name]
            if plugin_name in sys.modules:
                del sys.modules[plugin_name]
            
            # 移除元数据
            del self.loaded_plugins[plugin_name]
            
            logger.info(f"插件已卸载: {plugin_name}")
            return True
            
        except Exception as e:
            logger.error(f"卸载插件失败 {plugin_name}: {e}")
            return False
    
    def reload_plugin(self, plugin_name: str) -> Optional[PluginMetadata]:
        """重新加载插件"""
        if plugin_name in self.loaded_plugins:
            # 获取原路径
            for plugin_dir in self.plugin_dirs:
                candidate = os.path.join(plugin_dir, plugin_name)
                if os.path.exists(candidate):
                    self.unload_plugin(plugin_name)
                    return self.load_plugin(candidate)
        
        logger.warning(f"无法重新加载未找到的插件: {plugin_name}")
        return None
    
    def get_plugin_info(self, plugin_name: str) -> Optional[Dict[str, Any]]:
        """获取插件信息"""
        if plugin_name in self.loaded_plugins:
            return self.loaded_plugins[plugin_name].to_dict()
        return None
    
    def list_loaded_plugins(self) -> List[Dict[str, Any]]:
        """列出所有已加载的插件"""
        return [meta.to_dict() for meta in self.loaded_plugins.values()]


# 全局插件加载器实例
_plugin_loader: Optional[PluginLoader] = None


def get_plugin_loader() -> PluginLoader:
    """获取全局插件加载器"""
    global _plugin_loader
    if _plugin_loader is None:
        _plugin_loader = PluginLoader()
    return _plugin_loader


def init_plugin_system(plugin_dirs: List[str] = None, auto_load: bool = True):
    """
    初始化插件系统
    
    Args:
        plugin_dirs: 插件目录列表
        auto_load: 是否自动加载插件目录中的所有插件
    """
    global _plugin_loader
    
    # 默认插件目录
    default_dirs = [
        os.path.join(os.path.dirname(__file__), "..", "..", "plugins"),
        os.path.expanduser("~/.accudaq/plugins"),
    ]
    
    all_dirs = (plugin_dirs or []) + default_dirs
    
    _plugin_loader = PluginLoader([d for d in all_dirs if os.path.isdir(d)])
    
    if auto_load:
        for plugin_info in _plugin_loader.discover_plugins():
            if not plugin_info.get("loaded", False):
                _plugin_loader.load_plugin(plugin_info.get("path", plugin_info.get("name")))
    
    logger.info(f"插件系统已初始化，已加载 {len(_plugin_loader.loaded_plugins)} 个插件")


def create_plugin_template(plugin_dir: str, plugin_name: str, author: str = ""):
    """
    创建插件模板
    
    Args:
        plugin_dir: 插件目录
        plugin_name: 插件名称
        author: 作者
    """
    plugin_path = os.path.join(plugin_dir, plugin_name)
    os.makedirs(plugin_path, exist_ok=True)
    
    # 创建 plugin.json
    manifest = {
        "name": plugin_name,
        "version": "1.0.0",
        "author": author,
        "description": f"{plugin_name} plugin",
        "dependencies": [],
        "components": [],
    }
    
    with open(os.path.join(plugin_path, "plugin.json"), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=4, ensure_ascii=False)
    
    # 创建 __init__.py
    init_content = f'''"""
{plugin_name} 插件
"""

from daq_core.components.base import ComponentBase, ComponentType, PortType, ComponentRegistry


@ComponentRegistry.register
class {plugin_name.title().replace("_", "")}Component(ComponentBase):
    """
    {plugin_name} 组件
    """
    
    component_type = ComponentType.DEVICE
    component_name = "{plugin_name.title().replace("_", "")}"
    component_description = "{plugin_name} 组件描述"
    component_icon = "🔌"

    def _setup_ports(self):
        self.add_input_port("input", PortType.ANY, "输入")
        self.add_output_port("output", PortType.ANY, "输出")

    def start(self):
        super().start()

    def stop(self):
        super().stop()

    def process(self):
        value = self.get_input("input")
        if value is not None:
            self.set_output("output", value)
'''
    
    with open(os.path.join(plugin_path, "__init__.py"), 'w', encoding='utf-8') as f:
        f.write(init_content)
    
    logger.info(f"插件模板已创建: {plugin_path}")
    return plugin_path

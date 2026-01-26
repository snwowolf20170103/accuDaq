"""
国际化 (i18n) 支持模块
支持多国语言切换
"""

import os
import json
import logging
from typing import Dict, Optional, List
from enum import Enum

logger = logging.getLogger(__name__)


class Language(Enum):
    """支持的语言"""
    ZH_CN = "zh-CN"     # 简体中文
    EN_US = "en-US"     # 英语
    DE_DE = "de-DE"     # 德语
    FR_FR = "fr-FR"     # 法语
    RU_RU = "ru-RU"     # 俄语
    JA_JP = "ja-JP"     # 日语
    IT_IT = "it-IT"     # 意大利语
    ES_ES = "es-ES"     # 西班牙语
    PT_BR = "pt-BR"     # 葡萄牙语


# 默认翻译字典
DEFAULT_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "zh-CN": {
        # 通用
        "app.title": "DAQ 集成开发环境",
        "app.version": "版本",
        "common.ok": "确定",
        "common.cancel": "取消",
        "common.save": "保存",
        "common.load": "加载",
        "common.export": "导出",
        "common.import": "导入",
        "common.delete": "删除",
        "common.edit": "编辑",
        "common.add": "添加",
        "common.remove": "移除",
        "common.start": "启动",
        "common.stop": "停止",
        "common.pause": "暂停",
        "common.resume": "继续",
        "common.refresh": "刷新",
        "common.search": "搜索",
        "common.filter": "筛选",
        "common.settings": "设置",
        "common.help": "帮助",
        "common.about": "关于",
        "common.close": "关闭",
        "common.loading": "加载中...",
        "common.error": "错误",
        "common.warning": "警告",
        "common.success": "成功",
        "common.info": "信息",
        
        # 项目
        "project.new": "新建项目",
        "project.open": "打开项目",
        "project.save": "保存项目",
        "project.saveAs": "另存为",
        "project.export": "导出项目",
        "project.import": "导入项目",
        "project.recent": "最近项目",
        "project.name": "项目名称",
        "project.description": "项目描述",
        "project.author": "作者",
        
        # 组件
        "component.library": "组件库",
        "component.device": "设备组件",
        "component.logic": "逻辑组件",
        "component.storage": "存储组件",
        "component.comm": "通信组件",
        "component.algorithm": "算法组件",
        "component.protocol": "协议组件",
        "component.control": "控制组件",
        "component.properties": "组件属性",
        
        # 设备
        "device.connect": "连接设备",
        "device.disconnect": "断开连接",
        "device.scan": "扫描设备",
        "device.status": "设备状态",
        "device.online": "在线",
        "device.offline": "离线",
        "device.error": "错误",
        
        # 运行
        "run.start": "运行",
        "run.stop": "停止",
        "run.pause": "暂停",
        "run.step": "单步执行",
        "run.debug": "调试",
        "run.compile": "编译",
        
        # 日志
        "log.title": "通信日志",
        "log.level": "级别",
        "log.source": "来源",
        "log.message": "消息",
        "log.timestamp": "时间戳",
        "log.clear": "清除日志",
        "log.export": "导出日志",
        
        # 任务
        "task.scheduler": "任务调度器",
        "task.create": "创建任务",
        "task.name": "任务名称",
        "task.status": "任务状态",
        "task.pending": "待执行",
        "task.running": "执行中",
        "task.completed": "已完成",
        "task.failed": "失败",
        
        # 数据
        "data.replay": "数据回放",
        "data.record": "数据记录",  
        "data.export": "数据导出",
        "data.history": "历史数据",
        
        # 报告
        "report.generate": "生成报告",
        "report.title": "报告标题",
        "report.format": "报告格式",
    },
    
    "en-US": {
        # Common
        "app.title": "DAQ Integrated Development Environment",
        "app.version": "Version",
        "common.ok": "OK",
        "common.cancel": "Cancel",
        "common.save": "Save",
        "common.load": "Load",
        "common.export": "Export",
        "common.import": "Import",
        "common.delete": "Delete",
        "common.edit": "Edit",
        "common.add": "Add",
        "common.remove": "Remove",
        "common.start": "Start",
        "common.stop": "Stop",
        "common.pause": "Pause",
        "common.resume": "Resume",
        "common.refresh": "Refresh",
        "common.search": "Search",
        "common.filter": "Filter",
        "common.settings": "Settings",
        "common.help": "Help",
        "common.about": "About",
        "common.close": "Close",
        "common.loading": "Loading...",
        "common.error": "Error",
        "common.warning": "Warning",
        "common.success": "Success",
        "common.info": "Info",
        
        # Project
        "project.new": "New Project",
        "project.open": "Open Project",
        "project.save": "Save Project",
        "project.saveAs": "Save As",
        "project.export": "Export Project",
        "project.import": "Import Project",
        "project.recent": "Recent Projects",
        "project.name": "Project Name",
        "project.description": "Project Description",
        "project.author": "Author",
        
        # Components
        "component.library": "Component Library",
        "component.device": "Device Components",
        "component.logic": "Logic Components",
        "component.storage": "Storage Components",
        "component.comm": "Communication Components",
        "component.algorithm": "Algorithm Components",
        "component.protocol": "Protocol Components",
        "component.control": "Control Components",
        "component.properties": "Component Properties",
        
        # Device
        "device.connect": "Connect Device",
        "device.disconnect": "Disconnect",
        "device.scan": "Scan Devices",
        "device.status": "Device Status",
        "device.online": "Online",
        "device.offline": "Offline",
        "device.error": "Error",
        
        # Run
        "run.start": "Run",
        "run.stop": "Stop",
        "run.pause": "Pause",
        "run.step": "Step",
        "run.debug": "Debug",
        "run.compile": "Compile",
        
        # Log
        "log.title": "Communication Log",
        "log.level": "Level",
        "log.source": "Source",
        "log.message": "Message",
        "log.timestamp": "Timestamp",
        "log.clear": "Clear Log",
        "log.export": "Export Log",
        
        # Task
        "task.scheduler": "Task Scheduler",
        "task.create": "Create Task",
        "task.name": "Task Name",
        "task.status": "Task Status",
        "task.pending": "Pending",
        "task.running": "Running",
        "task.completed": "Completed",
        "task.failed": "Failed",
        
        # Data
        "data.replay": "Data Replay",
        "data.record": "Data Recording",
        "data.export": "Data Export",
        "data.history": "History Data",
        
        # Report
        "report.generate": "Generate Report",
        "report.title": "Report Title",
        "report.format": "Report Format",
    },
    
    "ja-JP": {
        "app.title": "DAQ 統合開発環境",
        "common.ok": "OK",
        "common.cancel": "キャンセル",
        "common.save": "保存",
        "common.start": "開始",
        "common.stop": "停止",
        "component.library": "コンポーネントライブラリ",
        "device.connect": "デバイス接続",
        "run.start": "実行",
    },
    
    "de-DE": {
        "app.title": "DAQ Integrierte Entwicklungsumgebung",
        "common.ok": "OK",
        "common.cancel": "Abbrechen",
        "common.save": "Speichern",
        "common.start": "Start",
        "common.stop": "Stoppen",
        "component.library": "Komponentenbibliothek",
        "device.connect": "Gerät verbinden",
        "run.start": "Ausführen",
    },
}


class I18n:
    """
    国际化管理器
    
    功能：
    - 多语言翻译
    - 语言切换
    - 自定义翻译加载
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._current_language = Language.ZH_CN.value
        self._translations: Dict[str, Dict[str, str]] = DEFAULT_TRANSLATIONS.copy()
        self._fallback_language = Language.EN_US.value
    
    @property
    def current_language(self) -> str:
        return self._current_language
    
    @current_language.setter
    def current_language(self, lang: str):
        if lang in [l.value for l in Language]:
            self._current_language = lang
            logger.info(f"语言已切换至: {lang}")
        else:
            logger.warning(f"不支持的语言: {lang}")
    
    def set_language(self, lang: str):
        """设置当前语言"""
        self.current_language = lang
    
    def get_supported_languages(self) -> List[Dict[str, str]]:
        """获取支持的语言列表"""
        return [
            {"code": Language.ZH_CN.value, "name": "简体中文"},
            {"code": Language.EN_US.value, "name": "English"},
            {"code": Language.DE_DE.value, "name": "Deutsch"},
            {"code": Language.FR_FR.value, "name": "Français"},
            {"code": Language.RU_RU.value, "name": "Русский"},
            {"code": Language.JA_JP.value, "name": "日本語"},
            {"code": Language.IT_IT.value, "name": "Italiano"},
            {"code": Language.ES_ES.value, "name": "Español"},
            {"code": Language.PT_BR.value, "name": "Português"},
        ]
    
    def t(self, key: str, **kwargs) -> str:
        """
        翻译文本
        
        Args:
            key: 翻译键
            **kwargs: 插值参数
        
        Returns:
            翻译后的文本
        """
        # 尝试当前语言
        text = self._translations.get(self._current_language, {}).get(key)
        
        # 回退到默认语言
        if text is None:
            text = self._translations.get(self._fallback_language, {}).get(key)
        
        # 如果都没找到，返回 key
        if text is None:
            return key
        
        # 处理插值
        if kwargs:
            try:
                text = text.format(**kwargs)
            except (KeyError, IndexError):
                pass
        
        return text
    
    def __call__(self, key: str, **kwargs) -> str:
        """快捷调用方式"""
        return self.t(key, **kwargs)
    
    def load_translations(self, filepath: str) -> bool:
        """
        从文件加载翻译
        
        Args:
            filepath: JSON 翻译文件路径
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for lang, translations in data.items():
                if lang not in self._translations:
                    self._translations[lang] = {}
                self._translations[lang].update(translations)
            
            logger.info(f"已加载翻译文件: {filepath}")
            return True
        except Exception as e:
            logger.error(f"加载翻译文件失败: {e}")
            return False
    
    def add_translations(self, lang: str, translations: Dict[str, str]):
        """添加翻译"""
        if lang not in self._translations:
            self._translations[lang] = {}
        self._translations[lang].update(translations)
    
    def export_translations(self, filepath: str, lang: str = None) -> bool:
        """导出翻译到文件"""
        try:
            if lang:
                data = {lang: self._translations.get(lang, {})}
            else:
                data = self._translations
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"导出翻译失败: {e}")
            return False


# 全局实例
_i18n: Optional[I18n] = None


def get_i18n() -> I18n:
    """获取国际化管理器"""
    global _i18n
    if _i18n is None:
        _i18n = I18n()
    return _i18n


def t(key: str, **kwargs) -> str:
    """快捷翻译函数"""
    return get_i18n().t(key, **kwargs)


def set_language(lang: str):
    """设置语言"""
    get_i18n().set_language(lang)

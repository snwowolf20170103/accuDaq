import React, { createContext, useContext, useState, useCallback } from 'react'

// 支持的语言
export type Language = 'zh-CN' | 'en-US' | 'de-DE' | 'fr-FR' | 'ja-JP' | 'ru-RU' | 'it-IT' | 'es-ES' | 'pt-BR'

// 语言信息
export const SUPPORTED_LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
    { code: 'ru-RU', name: 'Русский', flag: '🇷🇺' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' },
]

// 翻译类型
type Translations = Record<string, string>

// 所有翻译
const translations: Record<Language, Translations> = {
    'zh-CN': {
        // 通用
        'app.title': 'DAQ 集成开发环境',
        'common.ok': '确定',
        'common.cancel': '取消',
        'common.save': '保存',
        'common.load': '加载',
        'common.export': '导出',
        'common.import': '导入',
        'common.delete': '删除',
        'common.edit': '编辑',
        'common.add': '添加',
        'common.start': '启动',
        'common.stop': '停止',
        'common.pause': '暂停',
        'common.resume': '继续',
        'common.refresh': '刷新',
        'common.search': '搜索',
        'common.settings': '设置',
        'common.close': '关闭',
        'common.loading': '加载中...',
        'common.error': '错误',
        'common.success': '成功',

        // 工具栏
        'toolbar.run': '运行',
        'toolbar.stop': '停止',
        'toolbar.compile': '编译',
        'toolbar.debug': '调试',
        'toolbar.newProject': '新建项目',
        'toolbar.saveProject': '保存项目',
        'toolbar.loadProject': '加载项目',
        'toolbar.exportCSV': '下载 CSV',
        'toolbar.dashboard': '仪表盘',
        'toolbar.logs': '日志',
        'toolbar.tasks': '任务',
        'toolbar.replay': '回放',
        'toolbar.settings': '设置',

        // 组件库
        'componentLib.title': '组件库',
        'componentLib.device': '设备',
        'componentLib.logic': '逻辑',
        'componentLib.storage': '存储',
        'componentLib.comm': '通信',
        'componentLib.algorithm': '算法',
        'componentLib.protocol': '协议',
        'componentLib.control': '控制',
        'componentLib.search': '搜索组件...',

        // 属性面板
        'properties.title': '属性',
        'properties.noSelect': '请选择一个组件',

        // 画布
        'canvas.empty': '拖拽组件到此处',
        'canvas.dropHere': '释放以添加组件',

        // 项目
        'project.unsavedChanges': '有未保存的更改',
        'project.saveConfirm': '是否保存当前项目？',

        // 调试
        'debug.console': '调试控制台',
        'debug.variables': '变量监视',
        'debug.breakpoints': '断点',

        // 日志
        'log.title': '通信日志',
        'log.level': '级别',
        'log.source': '来源',
        'log.message': '消息',
        'log.clear': '清除',
        'log.export': '导出',
        'log.autoScroll': '自动滚动',

        // 任务
        'task.scheduler': '任务调度器',
        'task.create': '新建任务',
        'task.name': '任务名称',
        'task.type': '触发类型',
        'task.status': '状态',
        'task.priority': '优先级',
        'task.delete': '删除',

        // 数据回放
        'replay.title': '数据回放',
        'replay.loadFile': '选择数据文件',
        'replay.play': '播放',
        'replay.pause': '暂停',
        'replay.stop': '停止',
        'replay.speed': '速度',
        'replay.channels': '通道数据',

        // 设置
        'settings.title': '设置',
        'settings.language': '语言',
        'settings.theme': '主题',
        'settings.theme.dark': '深色',
        'settings.theme.light': '浅色',
        'settings.autoSave': '自动保存',
        'settings.interval': '采集间隔',
    },

    'en-US': {
        'app.title': 'DAQ Integrated Development Environment',
        'common.ok': 'OK',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.load': 'Load',
        'common.export': 'Export',
        'common.import': 'Import',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.add': 'Add',
        'common.start': 'Start',
        'common.stop': 'Stop',
        'common.pause': 'Pause',
        'common.resume': 'Resume',
        'common.refresh': 'Refresh',
        'common.search': 'Search',
        'common.settings': 'Settings',
        'common.close': 'Close',
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',

        'toolbar.run': 'Run',
        'toolbar.stop': 'Stop',
        'toolbar.compile': 'Compile',
        'toolbar.debug': 'Debug',
        'toolbar.newProject': 'New Project',
        'toolbar.saveProject': 'Save Project',
        'toolbar.loadProject': 'Load Project',
        'toolbar.exportCSV': 'Download CSV',
        'toolbar.dashboard': 'Dashboard',
        'toolbar.logs': 'Logs',
        'toolbar.tasks': 'Tasks',
        'toolbar.replay': 'Replay',
        'toolbar.settings': 'Settings',

        'componentLib.title': 'Component Library',
        'componentLib.device': 'Device',
        'componentLib.logic': 'Logic',
        'componentLib.storage': 'Storage',
        'componentLib.comm': 'Communication',
        'componentLib.algorithm': 'Algorithm',
        'componentLib.protocol': 'Protocol',
        'componentLib.control': 'Control',
        'componentLib.search': 'Search components...',

        'properties.title': 'Properties',
        'properties.noSelect': 'Select a component',

        'canvas.empty': 'Drag components here',
        'canvas.dropHere': 'Release to add component',

        'project.unsavedChanges': 'Unsaved changes',
        'project.saveConfirm': 'Save current project?',

        'debug.console': 'Debug Console',
        'debug.variables': 'Watch Variables',
        'debug.breakpoints': 'Breakpoints',

        'log.title': 'Communication Log',
        'log.level': 'Level',
        'log.source': 'Source',
        'log.message': 'Message',
        'log.clear': 'Clear',
        'log.export': 'Export',
        'log.autoScroll': 'Auto Scroll',

        'task.scheduler': 'Task Scheduler',
        'task.create': 'Create Task',
        'task.name': 'Task Name',
        'task.type': 'Trigger Type',
        'task.status': 'Status',
        'task.priority': 'Priority',
        'task.delete': 'Delete',

        'replay.title': 'Data Replay',
        'replay.loadFile': 'Select Data File',
        'replay.play': 'Play',
        'replay.pause': 'Pause',
        'replay.stop': 'Stop',
        'replay.speed': 'Speed',
        'replay.channels': 'Channel Data',

        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.theme': 'Theme',
        'settings.theme.dark': 'Dark',
        'settings.theme.light': 'Light',
        'settings.autoSave': 'Auto Save',
        'settings.interval': 'Sample Interval',
    },

    'ja-JP': {
        'app.title': 'DAQ 統合開発環境',
        'common.ok': 'OK',
        'common.cancel': 'キャンセル',
        'common.save': '保存',
        'common.start': '開始',
        'common.stop': '停止',
        'toolbar.run': '実行',
        'componentLib.title': 'コンポーネントライブラリ',
    },

    'de-DE': {
        'app.title': 'DAQ Integrierte Entwicklungsumgebung',
        'common.ok': 'OK',
        'common.cancel': 'Abbrechen',
        'common.save': 'Speichern',
        'common.start': 'Start',
        'common.stop': 'Stoppen',
        'toolbar.run': 'Ausführen',
        'componentLib.title': 'Komponentenbibliothek',
    },

    'fr-FR': {
        'app.title': 'Environnement de Développement Intégré DAQ',
        'common.ok': 'OK',
        'common.cancel': 'Annuler',
        'common.save': 'Enregistrer',
        'common.start': 'Démarrer',
        'common.stop': 'Arrêter',
        'toolbar.run': 'Exécuter',
        'componentLib.title': 'Bibliothèque de Composants',
    },

    'ru-RU': {
        'app.title': 'Интегрированная среда разработки DAQ',
        'common.ok': 'ОК',
        'common.cancel': 'Отмена',
        'common.save': 'Сохранить',
        'toolbar.run': 'Запуск',
        'componentLib.title': 'Библиотека Компонентов',
    },

    'it-IT': {
        'app.title': 'Ambiente di Sviluppo Integrato DAQ',
        'common.ok': 'OK',
        'common.cancel': 'Annulla',
        'common.save': 'Salva',
        'toolbar.run': 'Esegui',
        'componentLib.title': 'Libreria Componenti',
    },

    'es-ES': {
        'app.title': 'Entorno de Desarrollo Integrado DAQ',
        'common.ok': 'Aceptar',
        'common.cancel': 'Cancelar',
        'common.save': 'Guardar',
        'toolbar.run': 'Ejecutar',
        'componentLib.title': 'Biblioteca de Componentes',
    },

    'pt-BR': {
        'app.title': 'Ambiente de Desenvolvimento Integrado DAQ',
        'common.ok': 'OK',
        'common.cancel': 'Cancelar',
        'common.save': 'Salvar',
        'toolbar.run': 'Executar',
        'componentLib.title': 'Biblioteca de Componentes',
    },
}

// i18n Context
interface I18nContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

// Provider
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        // 从 localStorage 读取或检测系统语言
        const stored = localStorage.getItem('daq-language')
        if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
            return stored as Language
        }
        // 检测浏览器语言
        const browserLang = navigator.language
        const supported = SUPPORTED_LANGUAGES.find(l => browserLang.startsWith(l.code.split('-')[0]))
        return supported?.code || 'en-US'
    })

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem('daq-language', lang)
    }, [])

    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        let text = translations[language]?.[key]

        // 回退到英语
        if (!text) {
            text = translations['en-US']?.[key]
        }

        // 如果还没找到，返回 key
        if (!text) {
            return key
        }

        // 处理参数替换
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text!.replace(`{${k}}`, String(v))
            })
        }

        return text
    }, [language])

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    )
}

// Hook
export const useI18n = () => {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error('useI18n must be used within I18nProvider')
    }
    return context
}

// 导出简便函数
export const useTranslation = () => {
    const { t, language, setLanguage } = useI18n()
    return { t, language, setLanguage, languages: SUPPORTED_LANGUAGES }
}

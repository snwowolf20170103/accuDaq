import React, { useState } from 'react'
import { useTranslation, Language } from '../i18n'
import './SettingsPanel.css'

interface SettingsPanelProps {
    isOpen?: boolean
    onClose?: () => void
    onSettingsChange?: (settings: AppSettings) => void
}

export interface AppSettings {
    language: Language
    theme: 'dark' | 'light'
    autoSave: boolean
    sampleInterval: number
    debugMode: boolean
}

const defaultSettings: AppSettings = {
    language: 'zh-CN',
    theme: 'dark',
    autoSave: true,
    sampleInterval: 1000,
    debugMode: false,
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    isOpen = true,
    onClose = () => { },
    onSettingsChange
}) => {
    const { t, language, setLanguage, languages } = useTranslation()
    const [settings, setSettings] = useState<AppSettings>(() => {
        const stored = localStorage.getItem('daq-settings')
        return stored ? { ...defaultSettings, ...JSON.parse(stored) } : { ...defaultSettings, language }
    })

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang)
        const newSettings = { ...settings, language: lang }
        setSettings(newSettings)
        saveSettings(newSettings)
    }

    const handleThemeChange = (theme: 'dark' | 'light') => {
        const newSettings = { ...settings, theme }
        setSettings(newSettings)
        saveSettings(newSettings)
        document.body.classList.toggle('light-theme', theme === 'light')
    }

    const handleSettingChange = (key: keyof AppSettings, value: any) => {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        saveSettings(newSettings)
    }

    const saveSettings = (newSettings: AppSettings) => {
        localStorage.setItem('daq-settings', JSON.stringify(newSettings))
        onSettingsChange?.(newSettings)
    }

    if (!isOpen) return null

    return (
        <div className="settings-panel-overlay">
            <div className="settings-panel">
                <div className="settings-header">
                    <h2>⚙️ {t('settings.title')}</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="settings-content">
                    {/* 语言设置 */}
                    <div className="settings-section">
                        <h3>🌐 {t('settings.language')}</h3>
                        <div className="language-grid">
                            {languages.map(lang => (
                                <button
                                    key={lang.code}
                                    className={`language-btn ${language === lang.code ? 'active' : ''}`}
                                    onClick={() => handleLanguageChange(lang.code)}
                                >
                                    <span className="lang-flag">{lang.flag}</span>
                                    <span className="lang-name">{lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 主题设置 */}
                    <div className="settings-section">
                        <h3>🎨 {t('settings.theme')}</h3>
                        <div className="theme-buttons">
                            <button
                                className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('dark')}
                            >
                                🌙 {t('settings.theme.dark')}
                            </button>
                            <button
                                className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                                onClick={() => handleThemeChange('light')}
                            >
                                ☀️ {t('settings.theme.light')}
                            </button>
                        </div>
                    </div>

                    {/* 自动保存 */}
                    <div className="settings-section">
                        <h3>💾 {t('settings.autoSave')}</h3>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.autoSave}
                                onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    {/* 采集间隔 */}
                    <div className="settings-section">
                        <h3>⏱️ {t('settings.interval')}</h3>
                        <div className="interval-input">
                            <input
                                type="number"
                                value={settings.sampleInterval}
                                onChange={(e) => handleSettingChange('sampleInterval', parseInt(e.target.value))}
                                min={10}
                                max={60000}
                            />
                            <span>ms</span>
                        </div>
                    </div>

                    {/* 调试模式 */}
                    <div className="settings-section">
                        <h3>🐛 Debug Mode</h3>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.debugMode}
                                onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>

                <div className="settings-footer">
                    <button className="reset-btn" onClick={() => {
                        setSettings(defaultSettings)
                        saveSettings(defaultSettings)
                    }}>
                        🔄 Reset to Default
                    </button>
                </div>
            </div>
        </div>
    )
}

// 语言选择器下拉组件
export const LanguageSelector: React.FC = () => {
    const { language, setLanguage, languages } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    const currentLang = languages.find(l => l.code === language)

    return (
        <div className="language-selector">
            <button
                className="lang-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{currentLang?.flag}</span>
                <span>{currentLang?.code}</span>
            </button>
            {isOpen && (
                <div className="lang-dropdown">
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            className={`lang-option ${language === lang.code ? 'active' : ''}`}
                            onClick={() => {
                                setLanguage(lang.code)
                                setIsOpen(false)
                            }}
                        >
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default SettingsPanel

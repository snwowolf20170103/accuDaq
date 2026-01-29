/**
 * TopNavBar - LabVIEW-style navigation bar
 * Uses "前面板" (Front Panel) and "程序框图" (Block Diagram) as primary tabs
 * Ctrl+E to toggle between panels (LabVIEW shortcut)
 */
import React, { memo } from 'react'
import { EditorMode } from '../../types'

// LabVIEW-style color palette
const lvColors = {
    menuBarBg: '#e8e8e8',           // Light gray menu bar
    menuBarBorder: '#c0c0c0',       // Border color
    tabActive: '#ffffff',           // Active tab background
    tabInactive: '#d0d0d0',         // Inactive tab background
    tabHover: '#f0f0f0',            // Hover state
    accent: '#0066cc',              // LabVIEW blue accent
    textPrimary: '#1a1a1a',         // Primary text
    textSecondary: '#666666',       // Secondary text
    runGreen: '#00aa00',            // Run button green
    stopRed: '#cc0000',             // Stop button red
    toolbarBg: '#f5f5f5',           // Toolbar background
}

// LabVIEW-style navbar
const navBarStyle: React.CSSProperties = {
    height: 32,
    background: lvColors.menuBarBg,
    borderBottom: `1px solid ${lvColors.menuBarBorder}`,
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    justifyContent: 'space-between',
    fontFamily: 'Segoe UI, Tahoma, sans-serif',
    fontSize: 12,
}

// Panel tabs container (LabVIEW-style)
const panelTabsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    marginLeft: 8,
}

// Individual panel tab style
const getPanelTabStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? lvColors.tabActive : lvColors.tabInactive,
    border: `1px solid ${lvColors.menuBarBorder}`,
    borderBottom: isActive ? 'none' : `1px solid ${lvColors.menuBarBorder}`,
    borderRadius: '4px 4px 0 0',
    padding: '6px 20px',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? lvColors.textPrimary : lvColors.textSecondary,
    fontSize: 13,
    marginBottom: isActive ? -1 : 0,
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
})

const logoSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
}

const projectNameStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px',
    background: '#fff',
    border: `1px solid ${lvColors.menuBarBorder}`,
    borderRadius: 3,
    fontSize: 12,
}

const menuButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: lvColors.textPrimary,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 400,
    borderRadius: 2,
}

const toolSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
}

const toolButtonStyle: React.CSSProperties = {
    background: lvColors.toolbarBg,
    color: lvColors.textPrimary,
    border: `1px solid ${lvColors.menuBarBorder}`,
    padding: '4px 8px',
    borderRadius: 3,
    cursor: 'pointer',
    fontWeight: 400,
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
}

const runButtonStyle = (isRunning: boolean): React.CSSProperties => ({
    background: isRunning ? lvColors.stopRed : lvColors.runGreen,
    color: '#fff',
    border: 'none',
    padding: '4px 16px',
    borderRadius: 3,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
})

type ViewType = 'editor' | 'dashboard' | 'flowdesigner' | 'industry' | 'blockly' | 'commlog' | 'replay' | 'history' | 'scheduler'

interface TopNavBarProps {
    projectName: string
    view: ViewType
    editorMode: EditorMode
    isRunning: boolean
    debugMode: boolean
    dashboardEditMode: boolean
    showDevicePanel: boolean
    showAIAssistant: boolean
    showDebugger: boolean
    showGitPanel: boolean
    // Callbacks
    onNewProject: () => void
    onSaveProject: () => void
    onOpenProject: () => void
    onSetView: (view: ViewType) => void
    onSetEditorMode: (mode: EditorMode) => void
    onToggleRun: () => void
    onToggleDebugMode: () => void
    onToggleDashboardEditMode: () => void
    onToggleDevicePanel: () => void
    onToggleAIAssistant: () => void
    onToggleDebugger: () => void
    onToggleGitPanel: () => void
    onShowCICD: () => void
    onShowSettings: () => void
}

function TopNavBarComponent({
    projectName,
    view,
    editorMode,
    isRunning,
    debugMode,
    dashboardEditMode: _dashboardEditMode,  // Reserved for future menu dropdown
    showDevicePanel: _showDevicePanel,      // Reserved for future menu dropdown
    showAIAssistant,
    showDebugger: _showDebugger,            // Reserved for future menu dropdown
    showGitPanel: _showGitPanel,            // Reserved for future menu dropdown
    onNewProject,
    onSaveProject,
    onOpenProject,
    onSetView,
    onSetEditorMode,
    onToggleRun,
    onToggleDebugMode,
    onToggleDashboardEditMode: _onToggleDashboardEditMode, // Reserved for future menu dropdown
    onToggleDevicePanel: _onToggleDevicePanel,             // Reserved for future menu dropdown
    onToggleAIAssistant,
    onToggleDebugger: _onToggleDebugger,    // Reserved for future menu dropdown
    onToggleGitPanel: _onToggleGitPanel,    // Reserved for future menu dropdown
    onShowCICD: _onShowCICD,                // Reserved for future menu dropdown
    onShowSettings,
}: TopNavBarProps) {

    // Determine if we're in Front Panel (dashboard) or Block Diagram (editor) mode
    const isFrontPanel = view === 'dashboard'
    const isBlockDiagram = view === 'editor' && editorMode === 'visual'

    return (
        <div style={navBarStyle}>
            {/* Left: Logo + File Menu + Panel Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Logo */}
                <div style={logoSectionStyle}>
                    <span style={{ fontSize: 16 }}>⚡</span>
                    <span style={{ fontWeight: 700, color: lvColors.textPrimary, fontSize: 13 }}>DAQ IDE</span>
                </div>

                {/* File menu buttons */}
                <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={onNewProject} style={menuButtonStyle}>文件(F)</button>
                    <button onClick={onOpenProject} style={menuButtonStyle}>编辑(E)</button>
                    <button style={menuButtonStyle}>查看(V)</button>
                    <button style={menuButtonStyle}>项目(P)</button>
                    <button style={menuButtonStyle}>操作(O)</button>
                    <button style={menuButtonStyle}>工具(T)</button>
                    <button style={menuButtonStyle}>帮助(H)</button>
                </div>

                {/* LabVIEW-style Panel Tabs */}
                <div style={panelTabsStyle}>
                    <div
                        style={getPanelTabStyle(isFrontPanel)}
                        onClick={() => onSetView('dashboard')}
                        title="前面板 - UI设计器 (Ctrl+E 切换)"
                    >
                        <span>📊</span>
                        <span>前面板</span>
                    </div>
                    <div
                        style={getPanelTabStyle(isBlockDiagram)}
                        onClick={() => { onSetView('editor'); onSetEditorMode('visual') }}
                        title="程序框图 - 逻辑设计器 (Ctrl+E 切换)"
                    >
                        <span>🔧</span>
                        <span>程序框图</span>
                    </div>
                    <div
                        style={getPanelTabStyle(view === 'editor' && editorMode === 'code')}
                        onClick={() => { onSetView('editor'); onSetEditorMode('code') }}
                        title="代码视图"
                    >
                        <span>💻</span>
                        <span>代码</span>
                    </div>
                </div>

                {/* Project name */}
                <div style={projectNameStyle}>
                    <span style={{ color: lvColors.textSecondary }}>项目:</span>
                    <span style={{ color: lvColors.textPrimary, fontWeight: 500 }}>{projectName}</span>
                </div>
            </div>

            {/* Right: Tool buttons */}
            <div style={toolSectionStyle}>
                {/* Quick access buttons */}
                <button onClick={onNewProject} style={toolButtonStyle} title="新建项目 (Ctrl+N)">
                    📄 新建
                </button>
                <button onClick={onSaveProject} style={toolButtonStyle} title="保存 (Ctrl+S)">
                    💾 保存
                </button>
                <button onClick={onOpenProject} style={toolButtonStyle} title="打开 (Ctrl+O)">
                    📂 打开
                </button>

                <span style={{ width: 1, height: 20, background: lvColors.menuBarBorder, margin: '0 4px' }} />

                {/* Debug toggle */}
                <button
                    onClick={onToggleDebugMode}
                    style={{
                        ...toolButtonStyle,
                        background: debugMode ? '#fff3cd' : lvColors.toolbarBg,
                        borderColor: debugMode ? '#ffc107' : lvColors.menuBarBorder,
                    }}
                    title={debugMode ? '关闭调试模式' : '开启调试模式'}
                >
                    🐛 {debugMode ? '调试中' : '调试'}
                </button>

                {/* AI Assistant */}
                <button
                    onClick={onToggleAIAssistant}
                    style={{
                        ...toolButtonStyle,
                        background: showAIAssistant ? '#e3f2fd' : lvColors.toolbarBg,
                        borderColor: showAIAssistant ? '#2196f3' : lvColors.menuBarBorder,
                    }}
                    title="AI 助手"
                >
                    🤖 AI
                </button>

                {/* Settings */}
                <button onClick={onShowSettings} style={toolButtonStyle} title="设置">
                    ⚙️
                </button>

                <span style={{ width: 1, height: 20, background: lvColors.menuBarBorder, margin: '0 4px' }} />

                {/* Run/Stop button - LabVIEW style */}
                <button onClick={onToggleRun} style={runButtonStyle(isRunning)}>
                    {isRunning ? '■ 停止' : '▶ 运行'}
                </button>
            </div>
        </div>
    )
}

// Memoize to prevent re-renders when parent state changes that don't affect navbar
export const TopNavBar = memo(TopNavBarComponent)
export default TopNavBar

/**
 * TopNavBar - Extracted navigation bar component
 * Manages project name display, view switching, and tool panel toggles
 * Isolates navbar state updates from main App re-renders
 */
import React, { memo } from 'react'
import { EditorMode } from '../../types'

// Hoisted static styles for better performance (Vercel: rendering-hoist-jsx)
const navBarStyle: React.CSSProperties = {
    height: 50,
    background: '#16213e',
    borderBottom: '1px solid #2a2a4a',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    justifyContent: 'space-between'
}

const logoSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 16
}

const viewSwitcherStyle: React.CSSProperties = {
    display: 'flex',
    background: '#0f0f1a',
    borderRadius: 6,
    padding: 4
}

const toolSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10
}

const baseButtonStyle: React.CSSProperties = {
    background: '#2a2a4a',
    border: 'none',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
}

const viewButtonStyle: React.CSSProperties = {
    border: 'none',
    padding: '6px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s'
}

const toolButtonStyle: React.CSSProperties = {
    background: '#2a2a4a',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: 12,
}

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
    dashboardEditMode,
    showDevicePanel,
    showAIAssistant,
    showDebugger,
    showGitPanel,
    onNewProject,
    onSaveProject,
    onOpenProject,
    onSetView,
    onSetEditorMode,
    onToggleRun,
    onToggleDebugMode,
    onToggleDashboardEditMode,
    onToggleDevicePanel,
    onToggleAIAssistant,
    onToggleDebugger,
    onToggleGitPanel,
    onShowCICD,
    onShowSettings,
}: TopNavBarProps) {

    const getViewButtonStyle = (isActive: boolean): React.CSSProperties => ({
        ...viewButtonStyle,
        background: isActive ? '#2a2a4a' : 'transparent',
        color: isActive ? '#fff' : '#888',
    })

    return (
        <div style={navBarStyle}>
            {/* Logo and Project Section */}
            <div style={logoSectionStyle}>
                <span style={{ fontSize: 20 }}>🚀</span>
                <span style={{ fontWeight: 700, color: '#fff' }}>DAQ IDE</span>
                <span style={{ color: '#888', fontSize: 13 }}>|</span>
                <span style={{ color: '#4a90d9', fontSize: 14, fontWeight: 500 }}>{projectName}</span>
                <button onClick={onNewProject} style={baseButtonStyle}>+ New</button>
                <button onClick={onSaveProject} title="保存项目到文件" style={baseButtonStyle}>💾 Save</button>
                <button onClick={onOpenProject} title="打开已保存的项目" style={baseButtonStyle}>📂 Open</button>
            </div>

            {/* View Switcher */}
            <div style={viewSwitcherStyle}>
                <button
                    onClick={() => { onSetView('editor'); onSetEditorMode('visual') }}
                    style={getViewButtonStyle(view === 'editor' && editorMode === 'visual')}
                >
                    📊 Visual
                </button>
                <button
                    onClick={() => { onSetView('editor'); onSetEditorMode('code') }}
                    style={getViewButtonStyle(view === 'editor' && editorMode === 'code')}
                >
                    💻 Code
                </button>
                <button onClick={() => onSetView('dashboard')} style={getViewButtonStyle(view === 'dashboard')}>
                    Dashboard
                </button>
                <button onClick={() => onSetView('flowdesigner')} style={getViewButtonStyle(view === 'flowdesigner')}>
                    🔧 流程
                </button>
                <button onClick={() => onSetView('industry')} style={getViewButtonStyle(view === 'industry')}>
                    🏭 工业控件
                </button>
                <button onClick={() => onSetView('blockly')} style={getViewButtonStyle(view === 'blockly')}>
                    🧩 Blockly
                </button>
                <button onClick={() => onSetView('commlog')} style={getViewButtonStyle(view === 'commlog')}>
                    📡 通信日志
                </button>
                <button onClick={() => onSetView('replay')} style={getViewButtonStyle(view === 'replay')}>
                    ⏪ 数据回放
                </button>
                <button onClick={() => onSetView('history')} style={getViewButtonStyle(view === 'history')}>
                    📊 历史数据
                </button>
                <button onClick={() => onSetView('scheduler')} style={getViewButtonStyle(view === 'scheduler')}>
                    ⏰ 任务调度
                </button>
                {view === 'dashboard' && (
                    <button
                        onClick={onToggleDashboardEditMode}
                        style={{
                            background: dashboardEditMode ? '#4fc3f7' : '#3c3c3c',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 12,
                            marginLeft: 8,
                        }}
                    >
                        {dashboardEditMode ? '🔓 编辑中' : '🔒 已锁定'}
                    </button>
                )}
            </div>

            {/* Tool Buttons */}
            <div style={toolSectionStyle}>
                {view === 'editor' && editorMode === 'visual' && (
                    <button
                        onClick={onToggleDevicePanel}
                        style={{
                            ...toolButtonStyle,
                            background: showDevicePanel ? '#9b59b6' : '#2a2a4a',
                        }}
                    >
                        📡 {showDevicePanel ? '组件库' : '设备'}
                    </button>
                )}
                <button
                    onClick={onToggleAIAssistant}
                    style={{
                        ...toolButtonStyle,
                        background: showAIAssistant ? '#9b59b6' : '#2a2a4a',
                    }}
                >
                    🤖 AI 助手
                </button>
                <button
                    onClick={onToggleDebugger}
                    style={{
                        ...toolButtonStyle,
                        background: showDebugger ? '#3498db' : '#2a2a4a',
                    }}
                    title="数据流调试器"
                >
                    🔍 调试器
                </button>
                <button
                    onClick={onToggleDebugMode}
                    style={{
                        ...toolButtonStyle,
                        background: debugMode ? '#e67e22' : '#2a2a4a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                    title={debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
                >
                    🐛 {debugMode ? 'Debug ON' : 'Debug'}
                </button>
                <button onClick={onShowCICD} style={toolButtonStyle}>
                    🔧 CI/CD
                </button>
                <button
                    onClick={onToggleGitPanel}
                    style={{
                        ...toolButtonStyle,
                        background: showGitPanel ? '#f1502f' : '#2a2a4a',
                    }}
                >
                    📦 Git
                </button>
                <button onClick={onShowSettings} style={toolButtonStyle}>
                    ⚙️ 设置
                </button>

                <button
                    onClick={onToggleRun}
                    style={{
                        background: isRunning ? '#e74c3c' : '#2ecc71',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 16px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 0 10px ' + (isRunning ? 'rgba(231, 76, 60, 0.4)' : 'rgba(46, 204, 113, 0.4)')
                    }}
                >
                    {isRunning ? '🛑 STOP' : '▶️ RUN'}
                </button>
            </div>
        </div>
    )
}

// Memoize to prevent re-renders when parent state changes that don't affect navbar
export const TopNavBar = memo(TopNavBarComponent)
export default TopNavBar

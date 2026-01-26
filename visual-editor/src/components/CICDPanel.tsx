import React, { useState, useEffect, useCallback } from 'react'
import './CICDPanel.css'

// 类型定义
interface BuildStep {
    id: string
    name: string
    command: string
    stage: string
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
    output: string
    duration: number
    started_at: string | null
    finished_at: string | null
}

interface Pipeline {
    id: string
    name: string
    description: string
    steps: BuildStep[]
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
    trigger: string
    branch: string
}

interface BuildHistory {
    id: string
    name: string
    status: string
    timestamp: string
}

interface CICDPanelProps {
    isOpen: boolean
    onClose: () => void
}

const API_BASE = 'http://localhost:5000/api'

export const CICDPanel: React.FC<CICDPanelProps> = ({ isOpen, onClose }) => {
    const [pipelines, setPipelines] = useState<Pipeline[]>([])
    const [history, setHistory] = useState<BuildHistory[]>([])
    const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
    const [activeTab, setActiveTab] = useState<'pipelines' | 'history' | 'new'>('pipelines')
    const [isRunning, setIsRunning] = useState(false)
    const [output, setOutput] = useState<string>('')

    // 加载流水线
    const loadPipelines = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/cicd/pipelines`)
            const data = await res.json()
            setPipelines(data.pipelines || [])
        } catch (error) {
            console.error('加载流水线失败:', error)
        }
    }, [])

    // 加载历史
    const loadHistory = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/cicd/history`)
            const data = await res.json()
            setHistory(data.history || [])
        } catch (error) {
            console.error('加载历史失败:', error)
        }
    }, [])

    useEffect(() => {
        if (isOpen) {
            loadPipelines()
            loadHistory()
        }
    }, [isOpen, loadPipelines, loadHistory])

    // 运行流水线
    const runPipeline = async (pipelineId: string) => {
        setIsRunning(true)
        setOutput('')

        try {
            const res = await fetch(`${API_BASE}/cicd/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipeline_id: pipelineId }),
            })

            const data = await res.json()

            if (data.status === 'ok') {
                // 开始轮询状态
                pollStatus(pipelineId)
            }
        } catch (error) {
            console.error('运行流水线失败:', error)
            setIsRunning(false)
        }
    }

    // 轮询状态
    const pollStatus = async (pipelineId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/cicd/status/${pipelineId}`)
                const data = await res.json()

                if (data.pipeline) {
                    setSelectedPipeline(data.pipeline)

                    // 收集输出
                    const allOutput = data.pipeline.steps
                        .filter((s: BuildStep) => s.output)
                        .map((s: BuildStep) => `=== ${s.name} ===\n${s.output}`)
                        .join('\n\n')
                    setOutput(allOutput)

                    // 检查是否完成
                    if (data.pipeline.status !== 'running') {
                        setIsRunning(false)
                        clearInterval(interval)
                        loadHistory()
                    }
                }
            } catch (error) {
                console.error('获取状态失败:', error)
                clearInterval(interval)
                setIsRunning(false)
            }
        }, 1000)
    }

    // 取消运行
    const cancelPipeline = async () => {
        try {
            await fetch(`${API_BASE}/cicd/cancel`, { method: 'POST' })
            setIsRunning(false)
        } catch (error) {
            console.error('取消失败:', error)
        }
    }

    // 创建流水线模板
    const createFromTemplate = async (template: string) => {
        try {
            const res = await fetch(`${API_BASE}/cicd/template`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template, project_name: 'My Project' }),
            })

            const data = await res.json()
            if (data.pipeline) {
                setPipelines(prev => [...prev, data.pipeline])
                setActiveTab('pipelines')
            }
        } catch (error) {
            console.error('创建流水线失败:', error)
        }
    }

    // 导出配置
    const exportConfig = async (pipelineId: string, format: string) => {
        try {
            const res = await fetch(`${API_BASE}/cicd/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipeline_id: pipelineId, format }),
            })

            const data = await res.json()
            if (data.config) {
                // 下载配置
                const blob = new Blob([data.config], { type: 'text/yaml' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${format}.yml`
                a.click()
            }
        } catch (error) {
            console.error('导出失败:', error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="cicd-panel-overlay">
            <div className="cicd-panel">
                <div className="cicd-header">
                    <h2>🔧 CI/CD 自动化工具链</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="cicd-tabs">
                    <button
                        className={activeTab === 'pipelines' ? 'active' : ''}
                        onClick={() => setActiveTab('pipelines')}
                    >
                        📋 流水线
                    </button>
                    <button
                        className={activeTab === 'history' ? 'active' : ''}
                        onClick={() => setActiveTab('history')}
                    >
                        📊 历史记录
                    </button>
                    <button
                        className={activeTab === 'new' ? 'active' : ''}
                        onClick={() => setActiveTab('new')}
                    >
                        ➕ 新建
                    </button>
                </div>

                <div className="cicd-content">
                    {activeTab === 'pipelines' && (
                        <div className="pipelines-view">
                            <div className="pipeline-list">
                                {pipelines.length === 0 ? (
                                    <div className="empty-state">
                                        <span>暂无流水线</span>
                                        <button onClick={() => setActiveTab('new')}>创建流水线</button>
                                    </div>
                                ) : (
                                    pipelines.map(pipeline => (
                                        <div
                                            key={pipeline.id}
                                            className={`pipeline-card ${selectedPipeline?.id === pipeline.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedPipeline(pipeline)}
                                        >
                                            <div className="pipeline-info">
                                                <span className="pipeline-name">{pipeline.name}</span>
                                                <span className={`pipeline-status status-${pipeline.status}`}>
                                                    {getStatusIcon(pipeline.status)} {pipeline.status}
                                                </span>
                                            </div>
                                            <div className="pipeline-meta">
                                                <span>🌿 {pipeline.branch}</span>
                                                <span>📍 {pipeline.trigger}</span>
                                            </div>
                                            <div className="pipeline-actions">
                                                <button
                                                    className="run-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        runPipeline(pipeline.id)
                                                    }}
                                                    disabled={isRunning}
                                                >
                                                    ▶️ 运行
                                                </button>
                                                <button
                                                    className="export-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        exportConfig(pipeline.id, 'github')
                                                    }}
                                                >
                                                    📤 导出
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {selectedPipeline && (
                                <div className="pipeline-detail">
                                    <h3>{selectedPipeline.name}</h3>
                                    <p className="pipeline-desc">{selectedPipeline.description}</p>

                                    <div className="step-list">
                                        {selectedPipeline.steps.map((step, index) => (
                                            <div key={step.id} className={`step-item status-${step.status}`}>
                                                <div className="step-header">
                                                    <span className="step-number">{index + 1}</span>
                                                    <span className="step-name">{step.name}</span>
                                                    <span className="step-status">
                                                        {getStatusIcon(step.status)}
                                                    </span>
                                                    {step.duration > 0 && (
                                                        <span className="step-duration">
                                                            {step.duration.toFixed(1)}s
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="step-command">
                                                    <code>{step.command}</code>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {isRunning && (
                                        <button className="cancel-btn" onClick={cancelPipeline}>
                                            ⏹️ 取消
                                        </button>
                                    )}

                                    {output && (
                                        <div className="output-section">
                                            <h4>输出</h4>
                                            <pre className="output-content">{output}</pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="history-view">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>流水线</th>
                                        <th>状态</th>
                                        <th>时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td className={`status-${item.status}`}>
                                                {getStatusIcon(item.status)} {item.status}
                                            </td>
                                            <td>{new Date(item.timestamp).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'new' && (
                        <div className="new-pipeline-view">
                            <h3>选择模板</h3>
                            <div className="template-grid">
                                <div className="template-card" onClick={() => createFromTemplate('python')}>
                                    <span className="template-icon">🐍</span>
                                    <span className="template-name">Python 项目</span>
                                    <span className="template-desc">Lint、测试、打包</span>
                                </div>
                                <div className="template-card" onClick={() => createFromTemplate('nodejs')}>
                                    <span className="template-icon">📦</span>
                                    <span className="template-name">Node.js 项目</span>
                                    <span className="template-desc">构建、测试</span>
                                </div>
                                <div className="template-card" onClick={() => createFromTemplate('embedded')}>
                                    <span className="template-icon">🔧</span>
                                    <span className="template-name">嵌入式项目</span>
                                    <span className="template-desc">CMake 交叉编译</span>
                                </div>
                                <div className="template-card" onClick={() => createFromTemplate('daq')}>
                                    <span className="template-icon">📊</span>
                                    <span className="template-name">DAQ 项目</span>
                                    <span className="template-desc">完整 CI/CD</span>
                                </div>
                            </div>

                            <h3>导出配置格式</h3>
                            <div className="export-options">
                                <button onClick={() => selectedPipeline && exportConfig(selectedPipeline.id, 'github')}>
                                    🐙 GitHub Actions
                                </button>
                                <button onClick={() => selectedPipeline && exportConfig(selectedPipeline.id, 'gitlab')}>
                                    🦊 GitLab CI
                                </button>
                                <button onClick={() => selectedPipeline && exportConfig(selectedPipeline.id, 'jenkins')}>
                                    🔵 Jenkins
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// 辅助函数
function getStatusIcon(status: string): string {
    switch (status) {
        case 'pending': return '⏳'
        case 'running': return '🔄'
        case 'success': return '✅'
        case 'failed': return '❌'
        case 'cancelled': return '⏹️'
        default: return '❓'
    }
}

export default CICDPanel

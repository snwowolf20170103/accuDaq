import React, { useState, useEffect, useCallback } from 'react'
import './TaskSchedulerPanel.css'

interface Task {
    id: string
    name: string
    trigger_type: string
    state: string
    priority: number
    enabled: boolean
    last_run: number
    next_run: number
    retry_count: number
    results_count: number
}

interface TaskSchedulerPanelProps {
    isOpen?: boolean
    onClose?: () => void
    apiUrl?: string
}

const triggerTypeLabels: Record<string, string> = {
    immediate: '🚀 立即执行',
    scheduled: '📅 定时执行',
    interval: '🔄 周期执行',
    cron: '⏰ Cron 表达式',
    condition: '🎯 条件触发',
    event: '📡 事件触发',
}

const stateLabels: Record<string, { text: string; color: string }> = {
    pending: { text: '待执行', color: '#f59e0b' },
    running: { text: '执行中', color: '#3b82f6' },
    completed: { text: '已完成', color: '#10b981' },
    failed: { text: '失败', color: '#ef4444' },
    cancelled: { text: '已取消', color: '#6b7280' },
    paused: { text: '已暂停', color: '#8b5cf6' },
}

export const TaskSchedulerPanel: React.FC<TaskSchedulerPanelProps> = ({
    isOpen = true,
    onClose = () => { },
    apiUrl = 'http://localhost:5000/api/tasks'
}) => {
    const [tasks, setTasks] = useState<Task[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [newTask, setNewTask] = useState({
        name: '',
        trigger_type: 'interval',
        interval_ms: 1000,
        priority: 5,
    })

    const fetchTasks = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await fetch(apiUrl)
            if (response.ok) {
                const data = await response.json()
                setTasks(data.tasks || [])
            }
        } catch (e) {
            setError('Failed to fetch tasks')
        } finally {
            setIsLoading(false)
        }
    }, [apiUrl])

    useEffect(() => {
        if (isOpen) {
            fetchTasks()
            const interval = setInterval(fetchTasks, 2000)
            return () => clearInterval(interval)
        }
    }, [isOpen, fetchTasks])

    const handlePauseResume = async (taskId: string, currentState: string) => {
        const action = currentState === 'paused' ? 'resume' : 'pause'
        try {
            await fetch(`${apiUrl}/${taskId}/${action}`, { method: 'POST' })
            fetchTasks()
        } catch (e) {
            setError(`Failed to ${action} task`)
        }
    }

    const handleCancel = async (taskId: string) => {
        try {
            await fetch(`${apiUrl}/${taskId}/cancel`, { method: 'POST' })
            fetchTasks()
        } catch (e) {
            setError('Failed to cancel task')
        }
    }

    const handleDelete = async (taskId: string) => {
        if (!confirm('确定要删除此任务吗？')) return
        try {
            await fetch(`${apiUrl}/${taskId}`, { method: 'DELETE' })
            fetchTasks()
        } catch (e) {
            setError('Failed to delete task')
        }
    }

    const formatTime = (timestamp: number) => {
        if (!timestamp) return '-'
        return new Date(timestamp * 1000).toLocaleString()
    }

    if (!isOpen) return null

    return (
        <div className="task-scheduler-overlay">
            <div className="task-scheduler-panel">
                <div className="panel-header">
                    <h2>⏰ 任务调度器</h2>
                    <div className="header-actions">
                        <button className="create-btn" onClick={() => setShowCreateDialog(true)}>
                            ➕ 新建任务
                        </button>
                        <button className="refresh-btn" onClick={fetchTasks}>
                            🔄 刷新
                        </button>
                        <button className="close-btn" onClick={onClose}>✕</button>
                    </div>
                </div>

                {error && (
                    <div className="error-banner">
                        ❌ {error}
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                <div className="task-stats">
                    <div className="stat-item">
                        <span className="stat-value">{tasks.length}</span>
                        <span className="stat-label">总任务数</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{tasks.filter(t => t.state === 'running').length}</span>
                        <span className="stat-label">执行中</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{tasks.filter(t => t.state === 'completed').length}</span>
                        <span className="stat-label">已完成</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{tasks.filter(t => t.state === 'failed').length}</span>
                        <span className="stat-label">失败</span>
                    </div>
                </div>

                <div className="task-list">
                    {isLoading && tasks.length === 0 ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>加载中...</p>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="empty-state">
                            <span>📭</span>
                            <p>暂无任务</p>
                            <button onClick={() => setShowCreateDialog(true)}>创建第一个任务</button>
                        </div>
                    ) : (
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th>任务名称</th>
                                    <th>触发类型</th>
                                    <th>状态</th>
                                    <th>优先级</th>
                                    <th>上次执行</th>
                                    <th>下次执行</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map(task => {
                                    const stateInfo = stateLabels[task.state] || { text: task.state, color: '#6b7280' }
                                    return (
                                        <tr key={task.id} className={!task.enabled ? 'disabled' : ''}>
                                            <td className="task-name">
                                                <span className="task-id">{task.id}</span>
                                                {task.name}
                                            </td>
                                            <td>{triggerTypeLabels[task.trigger_type] || task.trigger_type}</td>
                                            <td>
                                                <span
                                                    className="state-badge"
                                                    style={{ backgroundColor: `${stateInfo.color}20`, color: stateInfo.color }}
                                                >
                                                    {stateInfo.text}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="priority-badge">P{task.priority}</span>
                                            </td>
                                            <td className="time-cell">{formatTime(task.last_run)}</td>
                                            <td className="time-cell">{formatTime(task.next_run)}</td>
                                            <td className="actions-cell">
                                                <button
                                                    className="action-btn"
                                                    onClick={() => handlePauseResume(task.id, task.state)}
                                                    title={task.state === 'paused' ? '继续' : '暂停'}
                                                >
                                                    {task.state === 'paused' ? '▶️' : '⏸️'}
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    onClick={() => handleCancel(task.id)}
                                                    title="取消"
                                                >
                                                    ⏹️
                                                </button>
                                                <button
                                                    className="action-btn danger"
                                                    onClick={() => handleDelete(task.id)}
                                                    title="删除"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 创建任务对话框 */}
                {showCreateDialog && (
                    <div className="dialog-overlay">
                        <div className="create-dialog">
                            <h3>➕ 新建任务</h3>
                            <div className="form-group">
                                <label>任务名称</label>
                                <input
                                    type="text"
                                    value={newTask.name}
                                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                                    placeholder="输入任务名称"
                                />
                            </div>
                            <div className="form-group">
                                <label>触发类型</label>
                                <select
                                    value={newTask.trigger_type}
                                    onChange={(e) => setNewTask({ ...newTask, trigger_type: e.target.value })}
                                >
                                    <option value="immediate">立即执行</option>
                                    <option value="interval">周期执行</option>
                                    <option value="scheduled">定时执行</option>
                                    <option value="condition">条件触发</option>
                                </select>
                            </div>
                            {newTask.trigger_type === 'interval' && (
                                <div className="form-group">
                                    <label>执行间隔 (ms)</label>
                                    <input
                                        type="number"
                                        value={newTask.interval_ms}
                                        onChange={(e) => setNewTask({ ...newTask, interval_ms: parseInt(e.target.value) })}
                                        min={100}
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>优先级 (1-10)</label>
                                <input
                                    type="number"
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                                    min={1}
                                    max={10}
                                />
                            </div>
                            <div className="dialog-actions">
                                <button className="cancel-btn" onClick={() => setShowCreateDialog(false)}>取消</button>
                                <button className="submit-btn" onClick={() => {
                                    // TODO: Submit to API
                                    setShowCreateDialog(false)
                                }}>创建</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TaskSchedulerPanel

/**
 * DataFlowDebugger - Real-time data flow debugging panel
 * 
 * Features:
 * - Live execution monitoring
 * - Data probes on wires
 * - Execution history
 * - Step-by-step execution control
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import './DataFlowDebugger.css'

interface ExecutionEvent {
    id: string
    timestamp: number
    nodeId: string
    nodeName: string
    event: 'start' | 'end' | 'error' | 'data'
    data?: any
    duration?: number
    error?: string
}

interface DataProbe {
    id: string
    edgeId: string
    sourceNode: string
    targetNode: string
    portName: string
    enabled: boolean
    values: { timestamp: number; value: any }[]
}

interface DataFlowDebuggerProps {
    isOpen: boolean
    onClose: () => void
    isRunning: boolean
    nodes: any[]
    edges: any[]
    executingNodeId: string | null
    breakpoints: string[]
    onToggleBreakpoint: (nodeId: string) => void
    onStepOver: () => void
    onContinue: () => void
    onPause: () => void
}

const DataFlowDebugger = ({
    isOpen,
    onClose,
    isRunning,
    nodes,
    edges: _edges,
    executingNodeId,
    breakpoints,
    onToggleBreakpoint,
    onStepOver,
    onContinue,
    onPause,
}: DataFlowDebuggerProps) => {
    const [activeTab, setActiveTab] = useState<'execution' | 'probes' | 'watch'>('execution')
    const [executionHistory, setExecutionHistory] = useState<ExecutionEvent[]>([])
    const [dataProbes, setDataProbes] = useState<DataProbe[]>([])
    const [watchVariables, setWatchVariables] = useState<{ name: string; value: any }[]>([])
    const [isPaused, setIsPaused] = useState(false)
    const [autoScroll, setAutoScroll] = useState(true)
    const historyRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WebSocket | null>(null)

    // Connect to debug WebSocket
    useEffect(() => {
        if (!isOpen || !isRunning) return

        const connectWs = () => {
            try {
                const ws = new WebSocket('ws://localhost:5000/ws/debug')
                wsRef.current = ws

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data)

                        if (message.type === 'execution') {
                            const execEvent: ExecutionEvent = {
                                id: `${Date.now()}-${Math.random()}`,
                                timestamp: Date.now(),
                                nodeId: message.nodeId,
                                nodeName: message.nodeName || message.nodeId,
                                event: message.event,
                                data: message.data,
                                duration: message.duration,
                                error: message.error,
                            }

                            setExecutionHistory(prev => {
                                const newHistory = [...prev, execEvent]
                                // Keep last 500 events
                                return newHistory.slice(-500)
                            })
                        } else if (message.type === 'probe_data') {
                            setDataProbes(prev => {
                                return prev.map(probe => {
                                    if (probe.edgeId === message.edgeId) {
                                        const newValues = [...probe.values, {
                                            timestamp: Date.now(),
                                            value: message.value
                                        }].slice(-100) // Keep last 100 values
                                        return { ...probe, values: newValues }
                                    }
                                    return probe
                                })
                            })
                        } else if (message.type === 'watch_update') {
                            setWatchVariables(message.variables || [])
                        }
                    } catch (e) {
                        console.error('Failed to parse debug message:', e)
                    }
                }

                ws.onerror = (error) => {
                    console.error('Debug WebSocket error:', error)
                }

                ws.onclose = () => {
                    wsRef.current = null
                }
            } catch (e) {
                console.error('Failed to connect debug WebSocket:', e)
            }
        }

        connectWs()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
        }
    }, [isOpen, isRunning])

    // Auto-scroll execution history
    useEffect(() => {
        if (autoScroll && historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight
        }
    }, [executionHistory, autoScroll])

    // Remove data probe
    const removeProbe = useCallback((probeId: string) => {
        const probe = dataProbes.find(p => p.id === probeId)
        if (probe && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'remove_probe',
                edgeId: probe.edgeId,
            }))
        }
        setDataProbes(prev => prev.filter(p => p.id !== probeId))
    }, [dataProbes])

    // Clear execution history
    const clearHistory = useCallback(() => {
        setExecutionHistory([])
    }, [])

    // Format value for display
    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'null'
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2)
            } catch {
                return String(value)
            }
        }
        if (typeof value === 'number') {
            return value.toFixed(4)
        }
        return String(value)
    }

    // Get event color
    const getEventColor = (event: string): string => {
        switch (event) {
            case 'start': return '#3498db'
            case 'end': return '#27ae60'
            case 'error': return '#e74c3c'
            case 'data': return '#9b59b6'
            default: return '#888'
        }
    }

    if (!isOpen) return null

    return (
        <div className="data-flow-debugger">
            <div className="debugger-header">
                <h3>🔍 数据流调试器</h3>
                <div className="debugger-controls">
                    {isRunning && (
                        <>
                            <button
                                className={`control-btn ${isPaused ? 'active' : ''}`}
                                onClick={() => { setIsPaused(!isPaused); isPaused ? onContinue() : onPause() }}
                                title={isPaused ? '继续' : '暂停'}
                            >
                                {isPaused ? '▶️' : '⏸️'}
                            </button>
                            <button
                                className="control-btn"
                                onClick={onStepOver}
                                disabled={!isPaused}
                                title="单步执行"
                            >
                                ⏭️
                            </button>
                        </>
                    )}
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
            </div>

            <div className="debugger-tabs">
                <button
                    className={`tab ${activeTab === 'execution' ? 'active' : ''}`}
                    onClick={() => setActiveTab('execution')}
                >
                    📜 执行历史
                </button>
                <button
                    className={`tab ${activeTab === 'probes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('probes')}
                >
                    📊 数据探针 ({dataProbes.length})
                </button>
                <button
                    className={`tab ${activeTab === 'watch' ? 'active' : ''}`}
                    onClick={() => setActiveTab('watch')}
                >
                    👁️ 监视变量
                </button>
            </div>

            <div className="debugger-content">
                {activeTab === 'execution' && (
                    <div className="execution-panel">
                        <div className="execution-toolbar">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={autoScroll}
                                    onChange={e => setAutoScroll(e.target.checked)}
                                />
                                自动滚动
                            </label>
                            <button onClick={clearHistory}>清空</button>
                        </div>
                        <div className="execution-history" ref={historyRef}>
                            {executionHistory.length === 0 ? (
                                <div className="empty-state">
                                    {isRunning ? '等待执行事件...' : '运行项目以查看执行历史'}
                                </div>
                            ) : (
                                executionHistory.map(event => (
                                    <div
                                        key={event.id}
                                        className={`execution-event ${event.event}`}
                                        style={{ borderLeftColor: getEventColor(event.event) }}
                                    >
                                        <div className="event-header">
                                            <span className="event-time">
                                                {new Date(event.timestamp).toLocaleTimeString()}
                                            </span>
                                            <span className="event-node">{event.nodeName}</span>
                                            <span
                                                className="event-type"
                                                style={{ color: getEventColor(event.event) }}
                                            >
                                                {event.event === 'start' && '▶ 开始'}
                                                {event.event === 'end' && `✓ 完成 (${event.duration}ms)`}
                                                {event.event === 'error' && '✗ 错误'}
                                                {event.event === 'data' && '📦 数据'}
                                            </span>
                                        </div>
                                        {event.data && (
                                            <div className="event-data">
                                                <code>{formatValue(event.data)}</code>
                                            </div>
                                        )}
                                        {event.error && (
                                            <div className="event-error">{event.error}</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'probes' && (
                    <div className="probes-panel">
                        <div className="probes-info">
                            点击画布上的连线来添加数据探针
                        </div>
                        {dataProbes.length === 0 ? (
                            <div className="empty-state">暂无数据探针</div>
                        ) : (
                            dataProbes.map(probe => (
                                <div key={probe.id} className="probe-item">
                                    <div className="probe-header">
                                        <span className="probe-route">
                                            {probe.sourceNode} → {probe.targetNode}
                                        </span>
                                        <span className="probe-port">[{probe.portName}]</span>
                                        <button
                                            className="remove-probe"
                                            onClick={() => removeProbe(probe.id)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="probe-values">
                                        {probe.values.length === 0 ? (
                                            <span className="no-data">等待数据...</span>
                                        ) : (
                                            <div className="value-list">
                                                {probe.values.slice(-5).map((v, i) => (
                                                    <div key={i} className="value-item">
                                                        <span className="value-time">
                                                            {new Date(v.timestamp).toLocaleTimeString()}
                                                        </span>
                                                        <span className="value-data">
                                                            {formatValue(v.value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'watch' && (
                    <div className="watch-panel">
                        <div className="watch-header">
                            <span>全局变量监视</span>
                        </div>
                        {watchVariables.length === 0 ? (
                            <div className="empty-state">暂无监视变量</div>
                        ) : (
                            <div className="watch-list">
                                {watchVariables.map((v, i) => (
                                    <div key={i} className="watch-item">
                                        <span className="watch-name">{v.name}</span>
                                        <span className="watch-value">{formatValue(v.value)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Breakpoints section */}
            <div className="breakpoints-section">
                <div className="section-title">🔴 断点 ({breakpoints.length})</div>
                <div className="breakpoints-list">
                    {breakpoints.length === 0 ? (
                        <div className="empty-state">暂无断点 - 点击节点左侧添加</div>
                    ) : (
                        breakpoints.map(bp => {
                            const node = nodes.find(n => n.id === bp)
                            return (
                                <div key={bp} className="breakpoint-item">
                                    <span>{node?.data?.label || bp}</span>
                                    <button onClick={() => onToggleBreakpoint(bp)}>移除</button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Current execution indicator */}
            {executingNodeId && (
                <div className="current-execution">
                    <span className="pulse-dot"></span>
                    正在执行: {nodes.find(n => n.id === executingNodeId)?.data?.label || executingNodeId}
                </div>
            )}
        </div>
    )
}

export default DataFlowDebugger

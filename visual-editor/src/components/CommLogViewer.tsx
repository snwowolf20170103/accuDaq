import React, { useState, useEffect, useCallback, useRef } from 'react'
import './CommLogViewer.css'

interface LogEntry {
    timestamp: number
    datetime: string
    level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'ALARM'
    source: string
    message: string
    data?: any
    tags?: string[]
}

interface CommLogViewerProps {
    isOpen?: boolean
    onClose?: () => void
    wsUrl?: string
}

const levelColors: Record<string, string> = {
    DEBUG: '#6b7280',
    INFO: '#3b82f6',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    ALARM: '#dc2626',
}

const levelIcons: Record<string, string> = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARNING: '⚠️',
    ERROR: '❌',
    ALARM: '🚨',
}

export const CommLogViewer: React.FC<CommLogViewerProps> = ({
    isOpen = true,
    onClose = () => { },
    wsUrl = 'ws://localhost:8765/logs'
}) => {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [filter, setFilter] = useState<{
        level: string | null
        source: string
        search: string
    }>({
        level: null,
        source: '',
        search: ''
    })
    const [isPaused, setIsPaused] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const [autoScroll, setAutoScroll] = useState(true)

    const logContainerRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WebSocket | null>(null)

    // WebSocket connection
    useEffect(() => {
        if (!isOpen) return

        const connect = () => {
            try {
                const ws = new WebSocket(wsUrl)
                wsRef.current = ws

                ws.onopen = () => {
                    setIsConnected(true)
                    console.log('Log WebSocket connected')
                }

                ws.onmessage = (event) => {
                    if (isPaused) return
                    try {
                        const logEntry = JSON.parse(event.data) as LogEntry
                        setLogs(prev => [...prev.slice(-999), logEntry])
                    } catch (e) {
                        console.error('Failed to parse log entry:', e)
                    }
                }

                ws.onclose = () => {
                    setIsConnected(false)
                    // Reconnect after 3 seconds
                    setTimeout(connect, 3000)
                }

                ws.onerror = (error) => {
                    console.error('Log WebSocket error:', error)
                }
            } catch (e) {
                console.error('Failed to connect to log WebSocket:', e)
            }
        }

        connect()

        return () => {
            if (wsRef.current) {
                wsRef.current.close()
            }
        }
    }, [isOpen, wsUrl, isPaused])

    // Auto scroll
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
        }
    }, [logs, autoScroll])

    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (filter.level && log.level !== filter.level) return false
        if (filter.source && !log.source.toLowerCase().includes(filter.source.toLowerCase())) return false
        if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false
        return true
    })

    const clearLogs = useCallback(() => {
        setLogs([])
    }, [])

    const exportLogs = useCallback(() => {
        const content = JSON.stringify(filteredLogs, null, 2)
        const blob = new Blob([content], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `comm_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        a.click()
        URL.revokeObjectURL(url)
    }, [filteredLogs])

    if (!isOpen) return null

    return (
        <div className="comm-log-viewer-overlay">
            <div className="comm-log-viewer">
                <div className="log-header">
                    <h2>📋 Communication Logs</h2>
                    <div className="log-status">
                        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                        </span>
                        <span className="log-count">{filteredLogs.length} logs</span>
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="log-toolbar">
                    <div className="filter-group">
                        <select
                            value={filter.level || ''}
                            onChange={(e) => setFilter(f => ({ ...f, level: e.target.value || null }))}
                        >
                            <option value="">All Levels</option>
                            <option value="DEBUG">🔍 Debug</option>
                            <option value="INFO">ℹ️ Info</option>
                            <option value="WARNING">⚠️ Warning</option>
                            <option value="ERROR">❌ Error</option>
                            <option value="ALARM">🚨 Alarm</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Filter by source..."
                            value={filter.source}
                            onChange={(e) => setFilter(f => ({ ...f, source: e.target.value }))}
                        />

                        <input
                            type="text"
                            placeholder="Search message..."
                            value={filter.search}
                            onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
                        />
                    </div>

                    <div className="action-group">
                        <button
                            className={`action-btn ${isPaused ? 'paused' : ''}`}
                            onClick={() => setIsPaused(!isPaused)}
                        >
                            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                        </button>
                        <button
                            className={`action-btn ${autoScroll ? 'active' : ''}`}
                            onClick={() => setAutoScroll(!autoScroll)}
                        >
                            📜 Auto Scroll
                        </button>
                        <button className="action-btn" onClick={clearLogs}>
                            🗑️ Clear
                        </button>
                        <button className="action-btn" onClick={exportLogs}>
                            💾 Export
                        </button>
                    </div>
                </div>

                <div className="log-container" ref={logContainerRef}>
                    {filteredLogs.length === 0 ? (
                        <div className="no-logs">
                            <span>📭</span>
                            <p>No logs to display</p>
                        </div>
                    ) : (
                        filteredLogs.map((log, index) => (
                            <div
                                key={`${log.timestamp}-${index}`}
                                className={`log-entry log-${log.level.toLowerCase()}`}
                            >
                                <span className="log-time">
                                    {new Date(log.timestamp * 1000).toLocaleTimeString()}
                                </span>
                                <span
                                    className="log-level"
                                    style={{ color: levelColors[log.level] }}
                                >
                                    {levelIcons[log.level]} {log.level}
                                </span>
                                <span className="log-source">[{log.source}]</span>
                                <span className="log-message">{log.message}</span>
                                {log.data && (
                                    <details className="log-data">
                                        <summary>📦 Data</summary>
                                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                    </details>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default CommLogViewer

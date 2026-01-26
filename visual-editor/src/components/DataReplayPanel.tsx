import React, { useState, useEffect, useRef } from 'react'
import './DataReplayPanel.css'

interface DataReplayPanelProps {
    isOpen?: boolean
    onClose?: () => void
    apiUrl?: string
    onDataPoint?: (data: any) => void
}

interface ReplayState {
    state: 'stopped' | 'playing' | 'paused'
    progress: number
    currentTime: number
    totalCount: number
    speed: number
    channels: string[]
    timeRange: [number, number]
}

export const DataReplayPanel: React.FC<DataReplayPanelProps> = ({
    isOpen = true,
    onClose = () => { },
    apiUrl = 'http://localhost:5000/api/replay',
    onDataPoint
}) => {
    const [replayState, setReplayState] = useState<ReplayState>({
        state: 'stopped',
        progress: 0,
        currentTime: 0,
        totalCount: 0,
        speed: 1.0,
        channels: [],
        timeRange: [0, 0]
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentData, setCurrentData] = useState<Record<string, number>>({})

    const fileInputRef = useRef<HTMLInputElement>(null)
    const wsRef = useRef<WebSocket | null>(null)

    // WebSocket for real-time data
    useEffect(() => {
        if (!isOpen) return

        const connectWs = () => {
            try {
                const ws = new WebSocket(`ws://localhost:8765/replay`)
                wsRef.current = ws

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        if (data.type === 'state') {
                            setReplayState(prev => ({ ...prev, ...data.state }))
                        } else if (data.type === 'data') {
                            setCurrentData(data.values)
                            onDataPoint?.(data)
                        }
                    } catch (e) {
                        console.error('Failed to parse replay data:', e)
                    }
                }

                ws.onclose = () => {
                    setTimeout(connectWs, 3000)
                }
            } catch (e) {
                console.error('Failed to connect replay WebSocket:', e)
            }
        }

        connectWs()

        return () => {
            wsRef.current?.close()
        }
    }, [isOpen, onDataPoint])

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setSelectedFile(file)
        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`${apiUrl}/load`, {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('Failed to load file')
            }

            const data = await response.json()
            setReplayState(prev => ({
                ...prev,
                state: 'stopped',
                totalCount: data.total_count,
                channels: data.channels,
                timeRange: data.time_range,
                progress: 0
            }))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load file')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePlay = async () => {
        try {
            await fetch(`${apiUrl}/play`, { method: 'POST' })
            setReplayState(prev => ({ ...prev, state: 'playing' }))
        } catch (e) {
            setError('Failed to start playback')
        }
    }

    const handlePause = async () => {
        try {
            await fetch(`${apiUrl}/pause`, { method: 'POST' })
            setReplayState(prev => ({ ...prev, state: 'paused' }))
        } catch (e) {
            setError('Failed to pause playback')
        }
    }

    const handleStop = async () => {
        try {
            await fetch(`${apiUrl}/stop`, { method: 'POST' })
            setReplayState(prev => ({ ...prev, state: 'stopped', progress: 0 }))
        } catch (e) {
            setError('Failed to stop playback')
        }
    }

    const handleSeek = async (position: number) => {
        try {
            await fetch(`${apiUrl}/seek?position=${position}`, { method: 'POST' })
            setReplayState(prev => ({ ...prev, progress: position }))
        } catch (e) {
            setError('Failed to seek')
        }
    }

    const handleSpeedChange = async (speed: number) => {
        try {
            await fetch(`${apiUrl}/speed?value=${speed}`, { method: 'POST' })
            setReplayState(prev => ({ ...prev, speed }))
        } catch (e) {
            setError('Failed to change speed')
        }
    }

    const handleStepForward = async () => {
        try {
            await fetch(`${apiUrl}/step/forward`, { method: 'POST' })
        } catch (e) {
            setError('Failed to step forward')
        }
    }

    const handleStepBackward = async () => {
        try {
            await fetch(`${apiUrl}/step/backward`, { method: 'POST' })
        } catch (e) {
            setError('Failed to step backward')
        }
    }

    const formatTime = (timestamp: number) => {
        if (!timestamp) return '00:00:00'
        return new Date(timestamp * 1000).toLocaleTimeString()
    }

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        const s = Math.floor(seconds % 60)
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    if (!isOpen) return null

    return (
        <div className="replay-panel-overlay">
            <div className="replay-panel">
                <div className="panel-header">
                    <h2>📼 数据回放</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {error && (
                    <div className="error-banner">
                        ❌ {error}
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                <div className="replay-content">
                    {/* 文件选择区域 */}
                    <div className="file-section">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.json"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                        <button
                            className="file-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                        >
                            📂 {selectedFile ? selectedFile.name : '选择数据文件'}
                        </button>
                        {selectedFile && (
                            <span className="file-info">
                                {replayState.totalCount} 条记录 | {replayState.channels.length} 个通道
                            </span>
                        )}
                    </div>

                    {/* 播放控制 */}
                    <div className="playback-controls">
                        <div className="control-buttons">
                            <button
                                className="control-btn"
                                onClick={handleStepBackward}
                                disabled={replayState.state === 'playing'}
                                title="后退一步"
                            >
                                ⏮️
                            </button>
                            {replayState.state === 'playing' ? (
                                <button className="control-btn primary" onClick={handlePause} title="暂停">
                                    ⏸️
                                </button>
                            ) : (
                                <button
                                    className="control-btn primary"
                                    onClick={handlePlay}
                                    disabled={replayState.totalCount === 0}
                                    title="播放"
                                >
                                    ▶️
                                </button>
                            )}
                            <button
                                className="control-btn"
                                onClick={handleStop}
                                disabled={replayState.state === 'stopped'}
                                title="停止"
                            >
                                ⏹️
                            </button>
                            <button
                                className="control-btn"
                                onClick={handleStepForward}
                                disabled={replayState.state === 'playing'}
                                title="前进一步"
                            >
                                ⏭️
                            </button>
                        </div>

                        {/* 进度条 */}
                        <div className="progress-section">
                            <span className="time-label">{formatTime(replayState.currentTime)}</span>
                            <input
                                type="range"
                                className="progress-slider"
                                min={0}
                                max={1}
                                step={0.001}
                                value={replayState.progress}
                                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                            />
                            <span className="time-label">
                                {formatDuration(replayState.timeRange[1] - replayState.timeRange[0])}
                            </span>
                        </div>

                        {/* 速度控制 */}
                        <div className="speed-controls">
                            <span className="speed-label">速度:</span>
                            {[0.5, 1, 2, 5, 10].map(speed => (
                                <button
                                    key={speed}
                                    className={`speed-btn ${replayState.speed === speed ? 'active' : ''}`}
                                    onClick={() => handleSpeedChange(speed)}
                                >
                                    {speed}x
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 通道数据显示 */}
                    <div className="channels-section">
                        <h3>📊 通道数据</h3>
                        <div className="channel-grid">
                            {replayState.channels.map(channel => (
                                <div key={channel} className="channel-card">
                                    <span className="channel-name">{channel}</span>
                                    <span className="channel-value">
                                        {currentData[channel] !== undefined
                                            ? currentData[channel].toFixed(4)
                                            : '-'}
                                    </span>
                                </div>
                            ))}
                            {replayState.channels.length === 0 && (
                                <div className="no-channels">
                                    <span>📭</span>
                                    <p>请先加载数据文件</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 状态信息 */}
                    <div className="status-bar">
                        <div className="status-item">
                            <span className="status-label">状态</span>
                            <span className={`status-value state-${replayState.state}`}>
                                {replayState.state === 'playing' ? '▶️ 播放中' :
                                    replayState.state === 'paused' ? '⏸️ 已暂停' : '⏹️ 已停止'}
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">进度</span>
                            <span className="status-value">
                                {Math.round(replayState.progress * 100)}%
                            </span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">速度</span>
                            <span className="status-value">{replayState.speed}x</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DataReplayPanel

import React, { useState, useEffect, useCallback } from 'react'
import './HistoryDataViewer.css'

interface DataPoint {
    timestamp: number
    datetime: string
    source: string
    metric: string
    value: number
}

interface HistoryDataViewerProps {
    isOpen?: boolean
    onClose?: () => void
    apiUrl?: string
}

export const HistoryDataViewer: React.FC<HistoryDataViewerProps> = ({
    isOpen = true,
    onClose = () => { },
    apiUrl = 'http://localhost:5001/api/history'
}) => {
    const [sources, setSources] = useState<string[]>([])
    const [metrics, setMetrics] = useState<string[]>([])
    const [data, setData] = useState<DataPoint[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [filter, setFilter] = useState({
        source: '',
        metric: '',
        startDate: '',
        endDate: '',
        aggregation: 'none',
        interval: 60,
    })

    // Fetch sources on mount
    useEffect(() => {
        if (!isOpen) return

        const fetchSources = async () => {
            try {
                const response = await fetch(`${apiUrl}/sources`)
                if (response.ok) {
                    const data = await response.json()
                    setSources(data.sources || [])
                }
            } catch (e) {
                console.error('Failed to fetch sources:', e)
            }
        }

        fetchSources()
    }, [isOpen, apiUrl])

    // Fetch metrics when source changes
    useEffect(() => {
        if (!filter.source) {
            setMetrics([])
            return
        }

        const fetchMetrics = async () => {
            try {
                const response = await fetch(`${apiUrl}/metrics?source=${encodeURIComponent(filter.source)}`)
                if (response.ok) {
                    const data = await response.json()
                    setMetrics(data.metrics || [])
                }
            } catch (e) {
                console.error('Failed to fetch metrics:', e)
            }
        }

        fetchMetrics()
    }, [filter.source, apiUrl])

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            if (filter.source) params.set('source', filter.source)
            if (filter.metric) params.set('metric', filter.metric)
            if (filter.startDate) params.set('start_time', (new Date(filter.startDate).getTime() / 1000).toString())
            if (filter.endDate) params.set('end_time', (new Date(filter.endDate).getTime() / 1000).toString())
            params.set('limit', '1000')

            let endpoint = `${apiUrl}/query`
            if (filter.aggregation !== 'none' && filter.source && filter.metric) {
                endpoint = `${apiUrl}/aggregate`
                params.set('aggregation', filter.aggregation)
                params.set('interval', filter.interval.toString())
            }

            const response = await fetch(`${endpoint}?${params.toString()}`)
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const result = await response.json()
            setData(result.data || [])
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch data')
            setData([])
        } finally {
            setIsLoading(false)
        }
    }, [filter, apiUrl])

    const exportData = useCallback(() => {
        if (data.length === 0) return

        const csvContent = [
            ['Datetime', 'Source', 'Metric', 'Value'].join(','),
            ...data.map(d => [d.datetime, d.source || '', d.metric || '', d.value].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `history_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [data])

    if (!isOpen) return null

    return (
        <div className="history-viewer-overlay">
            <div className="history-viewer">
                <div className="history-header">
                    <h2>📊 History Data</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="history-toolbar">
                    <div className="filter-row">
                        <div className="filter-item">
                            <label>Source</label>
                            <select
                                value={filter.source}
                                onChange={(e) => setFilter(f => ({ ...f, source: e.target.value, metric: '' }))}
                            >
                                <option value="">All Sources</option>
                                {sources.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-item">
                            <label>Metric</label>
                            <select
                                value={filter.metric}
                                onChange={(e) => setFilter(f => ({ ...f, metric: e.target.value }))}
                                disabled={!filter.source}
                            >
                                <option value="">All Metrics</option>
                                {metrics.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-item">
                            <label>Start Date</label>
                            <input
                                type="datetime-local"
                                value={filter.startDate}
                                onChange={(e) => setFilter(f => ({ ...f, startDate: e.target.value }))}
                            />
                        </div>

                        <div className="filter-item">
                            <label>End Date</label>
                            <input
                                type="datetime-local"
                                value={filter.endDate}
                                onChange={(e) => setFilter(f => ({ ...f, endDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="filter-row">
                        <div className="filter-item">
                            <label>Aggregation</label>
                            <select
                                value={filter.aggregation}
                                onChange={(e) => setFilter(f => ({ ...f, aggregation: e.target.value }))}
                            >
                                <option value="none">None (Raw)</option>
                                <option value="avg">Average</option>
                                <option value="min">Minimum</option>
                                <option value="max">Maximum</option>
                                <option value="sum">Sum</option>
                                <option value="count">Count</option>
                            </select>
                        </div>

                        <div className="filter-item">
                            <label>Interval (sec)</label>
                            <input
                                type="number"
                                value={filter.interval}
                                onChange={(e) => setFilter(f => ({ ...f, interval: parseInt(e.target.value) || 60 }))}
                                disabled={filter.aggregation === 'none'}
                                min={1}
                            />
                        </div>

                        <div className="action-buttons">
                            <button className="primary-btn" onClick={fetchData} disabled={isLoading}>
                                {isLoading ? '⏳ Loading...' : '🔍 Query'}
                            </button>
                            <button className="secondary-btn" onClick={exportData} disabled={data.length === 0}>
                                💾 Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="error-banner">
                        ❌ {error}
                    </div>
                )}

                <div className="data-container">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading data...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="empty-state">
                            <span>📭</span>
                            <p>No data to display</p>
                            <p className="hint">Select filters and click Query to load data</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Datetime</th>
                                    <th>Source</th>
                                    <th>Metric</th>
                                    <th>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, index) => (
                                    <tr key={`${row.timestamp}-${index}`}>
                                        <td>{row.datetime}</td>
                                        <td>{row.source || '-'}</td>
                                        <td>{row.metric || '-'}</td>
                                        <td className="value-cell">
                                            {typeof row.value === 'number' ? row.value.toFixed(4) : row.value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="history-footer">
                    <span>{data.length} records</span>
                </div>
            </div>
        </div>
    )
}

export default HistoryDataViewer

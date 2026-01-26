import { useEffect } from 'react'
import { useMqtt } from '../hooks/useMqtt'
import { LineChartWidget } from './widgets/LineChartWidget'
import { GaugeWidget } from './widgets/GaugeWidget'
import { DAQWidget } from '../types'

interface DashboardProps {
    nodes: any[]
    isRunning: boolean
    widgets?: DAQWidget[]
}

const Dashboard = ({ nodes, isRunning, widgets = [] }: DashboardProps) => {
    // Extract MQTT config from nodes
    const mqttNode = nodes.find(n => n.data.properties.broker_host && n.data.properties.topic)
    const brokerHost = mqttNode?.data.properties.broker_host
    const mainTopic = mqttNode?.data.properties.topic

    const { isConnected, messages, history, subscribe } = useMqtt({
        brokerUrl: isRunning && brokerHost ? `ws://${brokerHost}:8083/mqtt` : ''
    })

    useEffect(() => {
        if (isConnected && isRunning) {
            if (mainTopic) {
                subscribe(mainTopic)
                // Also subscribe to the processed version of the topic
                subscribe(`${mainTopic}/processed`)
            }
            // Subscribe widget-defined topics (supports both topic + dataSource)
            widgets.forEach((w) => {
                const t = w.config?.topic || w.config?.dataSource
                if (typeof t === 'string' && t.length > 0) {
                    subscribe(t)
                }
            })
            subscribe('accudaq/#')
            subscribe('sensors/temperature')
        }
    }, [isConnected, isRunning, subscribe, mainTopic, widgets])

    if (!isRunning) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#888' }}>
                <span style={{ fontSize: 60, marginBottom: 20 }}>⏸️</span>
                <h3>System is not running</h3>
                <p>Configure your nodes in the Editor and click RUN to see real-time data.</p>
            </div>
        )
    }

    return (
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', background: '#0f0f1a' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
                borderBottom: '1px solid #2a2a4a',
                paddingBottom: 20
            }}>
                <h2 style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>Dashboard</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <button
                        onClick={() => window.open(window.location.origin + '/api/download-csv', '_blank')}
                        style={{
                            background: '#27ae60',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(39, 174, 96, 0.2)'
                        }}
                    >
                        📥 Download CSV
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: isConnected ? '#27ae60' : '#e74c3c'
                        }} />
                        <span style={{ color: isConnected ? '#27ae60' : '#e74c3c', fontSize: 14 }}>
                            {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>

                {/* Render project-configured widgets first */}
                {widgets.map(widget => {
                    const topic = widget.config?.topic || widget.config?.dataSource || mainTopic || 'sensors/temperature'
                    const label = widget.config?.label || widget.config?.title
                    
                    if (widget.type === 'ui:chart' || widget.type === 'chart' || widget.type === 'line_chart') {
                        return (
                            <div key={widget.id} className="widget-card" style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4a', height: 300 }}>
                                <LineChartWidget
                                    label={label || 'Chart'}
                                    data={history[topic] || []}
                                    dataKey="value"
                                    color={widget.config?.color || '#4a90d9'}
                                />
                            </div>
                        )
                    }
                    
                    if (widget.type === 'ui:gauge' || widget.type === 'gauge') {
                        return (
                            <div key={widget.id} className="widget-card" style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4a', height: 300 }}>
                                <GaugeWidget
                                    label={label || 'Gauge'}
                                    value={messages[topic]?.payload || 0}
                                    unit={widget.config?.unit || ''}
                                    min={widget.config?.min || 0}
                                    max={widget.config?.max || 100}
                                    color={widget.config?.color || '#27ae60'}
                                />
                            </div>
                        )
                    }
                    
                    if (widget.type === 'ui:led' || widget.type === 'led') {
                        const isOn = !!messages[topic]?.payload
                        const colorOn = widget.config?.color || widget.config?.colorOn || '#e74c3c'
                        const colorOff = widget.config?.colorOff || '#333'
                        return (
                            <div key={widget.id} className="widget-card" style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4a', height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ fontSize: 14, color: '#888', marginBottom: 10 }}>{label || 'LED'}</div>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: isOn ? colorOn : colorOff,
                                    boxShadow: isOn ? `0 0 20px ${colorOn}` : 'none',
                                    transition: 'all 0.3s'
                                }} />
                            </div>
                        )
                    }
                    
                    return null
                })}

                {/* Default widgets (shown when no project widgets configured) */}
                {widgets.length === 0 && (
                    <>
                        {/* Temperature Chart */}
                        <div className="widget-card" style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4a', height: 300 }}>
                            <LineChartWidget
                                label="Temperature History (Sine)"
                                data={history['sensors/temperature'] || []}
                                dataKey="value"
                                color="#4a90d9"
                            />
                        </div>

                        {/* Current Temperature Gauge */}
                        <div className="widget-card" style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4a', height: 300 }}>
                            <GaugeWidget
                                label="Current Temperature"
                                value={messages['sensors/temperature']?.payload || 0}
                                unit="°C"
                                min={15}
                                max={35}
                                color="#4a90d9"
                            />
                        </div>

                        {/* Live Sensor Chart */}
                        <div className="widget-card" style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4a', height: 300 }}>
                            <LineChartWidget
                                label={`Live Data: ${mainTopic}${history[`${mainTopic}/processed`] ? ' (Processed)' : ''}`}
                                data={history[`${mainTopic}/processed`] || history[mainTopic] || []}
                                dataKey="value"
                                color="#2ecc71"
                            />
                        </div>

                        {/* Output Data Gauge */}
                        <div className="widget-card" style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a4a', height: 300 }}>
                            <GaugeWidget
                                label={`Current Value${messages[`${mainTopic}/processed`] ? ' (Processed)' : ''}`}
                                value={messages[`${mainTopic}/processed`]?.payload || messages[mainTopic]?.payload || 0}
                                unit="Units"
                                min={0}
                                max={1000}
                                color="#27ae60"
                            />
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}

export default Dashboard

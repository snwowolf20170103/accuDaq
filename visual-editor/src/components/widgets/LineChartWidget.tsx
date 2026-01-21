import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface LineChartWidgetProps {
    data: any[]
    dataKey: string
    label: string
    color?: string
}

export const LineChartWidget = ({ data, dataKey, label, color = '#4a90d9' }: LineChartWidgetProps) => {
    // Format data for Recharts
    // Assuming data is array of { timestamp, payload: { value: 123 } } or MqttMessage

    const formattedData = data.map(d => {
        let value = 0
        if (typeof d.payload === 'object' && d.payload !== null) {
            // Try to find the specific key, or use 'value' as default
            value = d.payload[dataKey] ?? d.payload.value ?? 0
        } else if (typeof d.payload === 'number') {
            value = d.payload
        } else {
            value = parseFloat(d.payload) || 0
        }

        return {
            time: new Date(d.timestamp).toLocaleTimeString(),
            value: value,
            raw: d
        }
    })

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 600, color: '#e0e0e0' }}>
                {label}
            </div>
            <div style={{ flex: 1, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formattedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                        <XAxis dataKey="time" stroke="#888" fontSize={10} tick={{ fill: '#888' }} />
                        <YAxis stroke="#888" fontSize={10} tick={{ fill: '#888' }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#16213e', borderColor: '#2a2a4a', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            animationDuration={300}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

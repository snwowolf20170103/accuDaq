interface GaugeWidgetProps {
    value: any
    label: string
    min?: number
    max?: number
    unit?: string
    color?: string
}

export const GaugeWidget = ({ value, label, min = 0, max = 100, unit = '', color = '#27ae60' }: GaugeWidgetProps) => {
    let numValue = 0
    if (typeof value === 'object' && value !== null) {
        numValue = value.value ?? 0
    } else if (typeof value === 'number') {
        numValue = value
    } else {
        numValue = parseFloat(value) || 0
    }

    // Calculate percentage for bar
    const percentage = Math.min(Math.max((numValue - min) / (max - min) * 100, 0), 100)

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#888', marginBottom: 8 }}>
                {label}
            </div>

            <div style={{ fontSize: 36, fontWeight: 700, color: color }}>
                {numValue.toFixed(2)} <span style={{ fontSize: 16 }}>{unit}</span>
            </div>

            <div style={{ width: '100%', height: 8, background: '#2a2a4a', borderRadius: 4, marginTop: 16, overflow: 'hidden' }}>
                <div
                    style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: color,
                        transition: 'width 0.3s ease'
                    }}
                />
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', marginTop: 4 }}>
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    )
}

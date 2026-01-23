/**
 * LED 指示灯控件
 * 功能：显示布尔值状态，支持红/绿指示灯和发光效果
 */

interface LEDWidgetProps {
    value: any
    label: string
    colorOn?: string      // 激活时的颜色（默认绿色）
    colorOff?: string     // 未激活时的颜色（默认红色）
    size?: number         // LED 大小（默认 40）
    blinking?: boolean    // 是否闪烁
}

export const LEDWidget = ({
    value,
    label,
    colorOn = '#27ae60',   // 绿色
    colorOff = '#e74c3c',  // 红色
    size = 40,
    blinking = false
}: LEDWidgetProps) => {
    // 解析布尔值
    let isOn = false
    if (typeof value === 'boolean') {
        isOn = value
    } else if (typeof value === 'object' && value !== null) {
        isOn = Boolean(value.value ?? value.alarm ?? false)
    } else if (typeof value === 'number') {
        isOn = value !== 0
    } else if (typeof value === 'string') {
        isOn = value.toLowerCase() === 'true' || value === '1'
    }

    const currentColor = isOn ? colorOn : colorOff

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
        }}>
            {/* LED 指示灯 */}
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: currentColor,
                    border: `3px solid ${currentColor}40`,
                    boxShadow: isOn
                        ? `0 0 20px ${currentColor}, 0 0 40px ${currentColor}80, inset 0 0 10px ${currentColor}`
                        : `inset 0 2px 5px rgba(0,0,0,0.5)`,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    animation: blinking && isOn ? 'ledBlink 1s infinite' : 'none',
                }}
            >
                {/* 高光效果 */}
                {isOn && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '20%',
                            left: '30%',
                            width: '30%',
                            height: '30%',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.6)',
                            filter: 'blur(2px)',
                        }}
                    />
                )}
            </div>

            {/* 标签 */}
            <div style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#ccc',
                textAlign: 'center'
            }}>
                {label}
            </div>

            {/* 状态文本 */}
            <div style={{
                fontSize: 12,
                color: currentColor,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                {isOn ? 'ON' : 'OFF'}
            </div>

            {/* CSS 动画 */}
            <style>{`
                @keyframes ledBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    )
}

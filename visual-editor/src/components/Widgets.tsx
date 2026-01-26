import React from 'react'
import './Widgets.css'

// ============ Gauge Widget ============
interface GaugeProps {
    value: number
    min?: number
    max?: number
    unit?: string
    label?: string
    size?: 'small' | 'medium' | 'large'
    color?: string
    warningThreshold?: number
    dangerThreshold?: number
}

export const Gauge: React.FC<GaugeProps> = ({
    value,
    min = 0,
    max = 100,
    unit = '',
    label = '',
    size = 'medium',
    color = '#3b82f6',
    warningThreshold,
    dangerThreshold,
}) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    const rotation = -135 + (percentage * 270) / 100

    // 根据阈值确定颜色
    let fillColor = color
    if (dangerThreshold && value >= dangerThreshold) {
        fillColor = '#ef4444'
    } else if (warningThreshold && value >= warningThreshold) {
        fillColor = '#f59e0b'
    }

    const sizeClass = `gauge-${size}`

    return (
        <div className={`gauge-widget ${sizeClass}`}>
            <div className="gauge-body">
                <div className="gauge-track"></div>
                <div
                    className="gauge-fill"
                    style={{
                        background: `conic-gradient(${fillColor} 0deg, ${fillColor} ${percentage * 2.7}deg, transparent ${percentage * 2.7}deg)`,
                    }}
                ></div>
                <div className="gauge-center">
                    <span className="gauge-value">{value.toFixed(1)}</span>
                    <span className="gauge-unit">{unit}</span>
                </div>
                <div
                    className="gauge-needle"
                    style={{ transform: `rotate(${rotation}deg)` }}
                ></div>
            </div>
            {label && <div className="gauge-label">{label}</div>}
        </div>
    )
}


// ============ LED Indicator ============
interface LEDIndicatorProps {
    on: boolean
    color?: 'green' | 'red' | 'yellow' | 'blue' | 'orange'
    size?: 'small' | 'medium' | 'large'
    label?: string
    blink?: boolean
}

export const LEDIndicator: React.FC<LEDIndicatorProps> = ({
    on,
    color = 'green',
    size = 'medium',
    label,
    blink = false,
}) => {
    return (
        <div className={`led-indicator led-${size}`}>
            <div className={`led led-${color} ${on ? 'on' : 'off'} ${blink && on ? 'blink' : ''}`}></div>
            {label && <span className="led-label">{label}</span>}
        </div>
    )
}


// ============ Seven Segment Display ============
interface SevenSegmentProps {
    value: number | string
    digits?: number
    decimals?: number
    color?: string
    size?: 'small' | 'medium' | 'large'
}

export const SevenSegment: React.FC<SevenSegmentProps> = ({
    value,
    digits = 4,
    decimals = 1,
    color = '#10b981',
    size = 'medium',
}) => {
    const displayValue = typeof value === 'number'
        ? value.toFixed(decimals).padStart(digits + decimals + 1, ' ')
        : String(value).padStart(digits, ' ')

    return (
        <div className={`seven-segment seven-segment-${size}`}>
            <div className="segment-display" style={{ color }}>
                {displayValue.split('').map((char, i) => (
                    <span key={i} className={`segment-char ${char === '.' ? 'decimal' : ''}`}>
                        {char}
                    </span>
                ))}
            </div>
        </div>
    )
}


// ============ Progress Bar ============  
interface ProgressBarProps {
    value: number
    max?: number
    label?: string
    showPercentage?: boolean
    color?: string
    striped?: boolean
    animated?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    label,
    showPercentage = true,
    color = '#3b82f6',
    striped = false,
    animated = false,
}) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
        <div className="progress-widget">
            {label && <div className="progress-label">{label}</div>}
            <div className="progress-track">
                <div
                    className={`progress-fill ${striped ? 'striped' : ''} ${animated ? 'animated' : ''}`}
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                ></div>
            </div>
            {showPercentage && <div className="progress-text">{percentage.toFixed(1)}%</div>}
        </div>
    )
}


// ============ Status Card ============
interface StatusCardProps {
    title: string
    value: string | number
    icon?: string
    status?: 'normal' | 'warning' | 'error' | 'success'
    unit?: string
    trend?: 'up' | 'down' | 'stable'
    trendValue?: string
}

export const StatusCard: React.FC<StatusCardProps> = ({
    title,
    value,
    icon = '📊',
    status = 'normal',
    unit = '',
    trend,
    trendValue,
}) => {
    return (
        <div className={`status-card status-${status}`}>
            <div className="card-header">
                <span className="card-icon">{icon}</span>
                <span className="card-title">{title}</span>
            </div>
            <div className="card-value">
                <span className="value">{value}</span>
                {unit && <span className="unit">{unit}</span>}
            </div>
            {trend && (
                <div className={`card-trend trend-${trend}`}>
                    <span className="trend-arrow">
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                    </span>
                    {trendValue && <span className="trend-value">{trendValue}</span>}
                </div>
            )}
        </div>
    )
}


// ============ Sparkline Chart ============
interface SparklineProps {
    data: number[]
    width?: number
    height?: number
    color?: string
    fillColor?: string
    showDots?: boolean
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    width = 120,
    height = 40,
    color = '#3b82f6',
    fillColor,
    showDots = false,
}) => {
    if (data.length < 2) return null

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v - min) / range) * height
        return `${x},${y}`
    }).join(' ')

    const fillPoints = `0,${height} ${points} ${width},${height}`

    return (
        <svg className="sparkline" width={width} height={height}>
            {fillColor && (
                <polygon points={fillPoints} fill={fillColor} opacity="0.3" />
            )}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {showDots && data.map((v, i) => {
                const x = (i / (data.length - 1)) * width
                const y = height - ((v - min) / range) * height
                return <circle key={i} cx={x} cy={y} r="3" fill={color} />
            })}
        </svg>
    )
}


// ============ Toggle Switch ============
interface ToggleSwitchProps {
    value: boolean
    onChange: (value: boolean) => void
    label?: string
    disabled?: boolean
    size?: 'small' | 'medium' | 'large'
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    value,
    onChange,
    label,
    disabled = false,
    size = 'medium',
}) => {
    return (
        <label className={`toggle-widget toggle-${size} ${disabled ? 'disabled' : ''}`}>
            {label && <span className="toggle-label">{label}</span>}
            <input
                type="checkbox"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
            />
            <span className="toggle-slider"></span>
        </label>
    )
}


// ============ Knob Control ============
interface KnobProps {
    value: number
    min?: number
    max?: number
    step?: number
    onChange?: (value: number) => void
    size?: number
    color?: string
    label?: string
}

export const Knob: React.FC<KnobProps> = ({
    value,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    size = 80,
    color = '#3b82f6',
    label,
}) => {
    const percentage = ((value - min) / (max - min)) * 100
    const rotation = -135 + (percentage * 270) / 100

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -step : step
        const newValue = Math.min(max, Math.max(min, value + delta))
        onChange?.(newValue)
    }

    return (
        <div className="knob-widget" style={{ width: size, height: size + 20 }}>
            <div
                className="knob-body"
                style={{ width: size, height: size }}
                onWheel={handleWheel}
            >
                <div
                    className="knob-indicator"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        borderColor: color,
                    }}
                ></div>
                <div className="knob-value">{value}</div>
            </div>
            {label && <div className="knob-label">{label}</div>}
        </div>
    )
}


// ============ Alarm Banner ============
interface AlarmBannerProps {
    message: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    timestamp?: string
    onDismiss?: () => void
}

export const AlarmBanner: React.FC<AlarmBannerProps> = ({
    message,
    severity,
    timestamp,
    onDismiss,
}) => {
    const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        critical: '🚨',
    }

    return (
        <div className={`alarm-banner alarm-${severity}`}>
            <span className="alarm-icon">{icons[severity]}</span>
            <div className="alarm-content">
                <span className="alarm-message">{message}</span>
                {timestamp && <span className="alarm-time">{timestamp}</span>}
            </div>
            {onDismiss && (
                <button className="alarm-dismiss" onClick={onDismiss}>✕</button>
            )}
        </div>
    )
}

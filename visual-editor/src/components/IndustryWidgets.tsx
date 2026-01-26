import React from 'react'
import './IndustryWidgets.css'

// ============ 电力行业控件 ============

// 电量监测仪表
interface PowerMeterProps {
    voltage: number     // 电压 V
    current: number     // 电流 A
    power: number       // 功率 W
    frequency?: number  // 频率 Hz
    powerFactor?: number // 功率因数
    unit?: 'single' | 'three' // 单相/三相
}

export const PowerMeter: React.FC<PowerMeterProps> = ({
    voltage,
    current,
    power,
    frequency = 50,
    powerFactor = 0.95,
    unit = 'single',
}) => {
    return (
        <div className="power-meter">
            <div className="meter-header">
                <span className="meter-icon">⚡</span>
                <span className="meter-title">{unit === 'single' ? '单相电表' : '三相电表'}</span>
            </div>
            <div className="meter-grid">
                <div className="meter-item">
                    <span className="item-label">电压</span>
                    <span className="item-value">{voltage.toFixed(1)}</span>
                    <span className="item-unit">V</span>
                </div>
                <div className="meter-item">
                    <span className="item-label">电流</span>
                    <span className="item-value">{current.toFixed(2)}</span>
                    <span className="item-unit">A</span>
                </div>
                <div className="meter-item highlight">
                    <span className="item-label">功率</span>
                    <span className="item-value">{power.toFixed(1)}</span>
                    <span className="item-unit">W</span>
                </div>
                <div className="meter-item">
                    <span className="item-label">频率</span>
                    <span className="item-value">{frequency.toFixed(1)}</span>
                    <span className="item-unit">Hz</span>
                </div>
                <div className="meter-item">
                    <span className="item-label">功率因数</span>
                    <span className="item-value">{powerFactor.toFixed(2)}</span>
                    <span className="item-unit">PF</span>
                </div>
            </div>
        </div>
    )
}


// 谐波分析图表
interface HarmonicChartProps {
    harmonics: number[] // 各次谐波幅值 (1-31次)
    thd?: number        // 总谐波失真 %
}

export const HarmonicChart: React.FC<HarmonicChartProps> = ({
    harmonics,
    thd = 0,
}) => {
    const maxValue = Math.max(...harmonics, 1)

    return (
        <div className="harmonic-chart">
            <div className="chart-header">
                <span>📊 谐波分析</span>
                <span className="thd-value">THD: {thd.toFixed(2)}%</span>
            </div>
            <div className="harmonic-bars">
                {harmonics.slice(0, 15).map((value, index) => (
                    <div key={index} className="bar-container">
                        <div
                            className="bar"
                            style={{
                                height: `${(value / maxValue) * 100}%`,
                                backgroundColor: index === 0 ? '#10b981' :
                                    value > 5 ? '#ef4444' : '#3b82f6'
                            }}
                        ></div>
                        <span className="bar-label">{index + 1}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}


// 电力系统单线图节点
interface PowerSystemNodeProps {
    type: 'bus' | 'transformer' | 'breaker' | 'generator' | 'load' | 'capacitor'
    name: string
    status: 'normal' | 'warning' | 'fault' | 'offline'
    value?: number
    unit?: string
}

export const PowerSystemNode: React.FC<PowerSystemNodeProps> = ({
    type,
    name,
    status,
    value,
    unit,
}) => {
    const icons = {
        bus: '═══',
        transformer: '⏣',
        breaker: '◯',
        generator: '⌭',
        load: '⏚',
        capacitor: '⟍⟋',
    }

    return (
        <div className={`power-node power-node-${type} status-${status}`}>
            <div className="node-symbol">{icons[type]}</div>
            <div className="node-info">
                <span className="node-name">{name}</span>
                {value !== undefined && (
                    <span className="node-value">{value} {unit}</span>
                )}
            </div>
        </div>
    )
}


// ============ 工业控制控件 ============

// PLC 状态显示
interface PLCStatusProps {
    name: string
    mode: 'run' | 'stop' | 'program' | 'fault'
    cpuLoad?: number
    memoryUsage?: number
    scanTime?: number  // ms
    inputs: boolean[]
    outputs: boolean[]
}

export const PLCStatus: React.FC<PLCStatusProps> = ({
    name,
    mode,
    cpuLoad = 0,
    memoryUsage = 0,
    scanTime = 0,
    inputs,
    outputs,
}) => {
    const modeColors = {
        run: '#10b981',
        stop: '#6b7280',
        program: '#3b82f6',
        fault: '#ef4444',
    }

    return (
        <div className="plc-status">
            <div className="plc-header">
                <span className="plc-name">🖥️ {name}</span>
                <span
                    className="plc-mode"
                    style={{ backgroundColor: modeColors[mode] }}
                >
                    {mode.toUpperCase()}
                </span>
            </div>
            <div className="plc-stats">
                <div className="stat">
                    <span>CPU</span>
                    <div className="stat-bar">
                        <div style={{ width: `${cpuLoad}%` }}></div>
                    </div>
                    <span>{cpuLoad}%</span>
                </div>
                <div className="stat">
                    <span>MEM</span>
                    <div className="stat-bar">
                        <div style={{ width: `${memoryUsage}%` }}></div>
                    </div>
                    <span>{memoryUsage}%</span>
                </div>
                <div className="stat">
                    <span>Scan</span>
                    <span>{scanTime}ms</span>
                </div>
            </div>
            <div className="plc-io">
                <div className="io-group">
                    <span className="io-label">I</span>
                    {inputs.map((on, i) => (
                        <span key={i} className={`io-led ${on ? 'on' : ''}`}></span>
                    ))}
                </div>
                <div className="io-group">
                    <span className="io-label">O</span>
                    {outputs.map((on, i) => (
                        <span key={i} className={`io-led output ${on ? 'on' : ''}`}></span>
                    ))}
                </div>
            </div>
        </div>
    )
}


// 工业仪表盘
interface IndustrialGaugeProps {
    value: number
    min?: number
    max?: number
    unit: string
    label: string
    zones?: { from: number; to: number; color: string }[]
}

export const IndustrialGauge: React.FC<IndustrialGaugeProps> = ({
    value,
    min = 0,
    max = 100,
    unit,
    label,
    zones = [],
}) => {
    const percentage = ((value - min) / (max - min)) * 100
    const angle = -135 + (percentage * 270 / 100)

    return (
        <div className="industrial-gauge">
            <svg viewBox="0 0 200 150" className="gauge-svg">
                {/* 背景弧 */}
                <path
                    d="M 20 130 A 80 80 0 0 1 180 130"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="12"
                />
                {/* 值范围区域 */}
                {zones.map((zone, i) => {
                    const startAngle = -135 + ((zone.from - min) / (max - min)) * 270
                    const endAngle = -135 + ((zone.to - min) / (max - min)) * 270
                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180
                    const x1 = 100 + 80 * Math.cos(startRad)
                    const y1 = 130 + 80 * Math.sin(startRad)
                    const x2 = 100 + 80 * Math.cos(endRad)
                    const y2 = 130 + 80 * Math.sin(endRad)
                    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0

                    return (
                        <path
                            key={i}
                            d={`M ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2}`}
                            fill="none"
                            stroke={zone.color}
                            strokeWidth="12"
                            opacity="0.6"
                        />
                    )
                })}
                {/* 指针 */}
                <g transform={`rotate(${angle}, 100, 130)`}>
                    <line x1="100" y1="130" x2="100" y2="60" stroke="#ef4444" strokeWidth="4" />
                    <circle cx="100" cy="130" r="8" fill="#ef4444" />
                </g>
                {/* 数值 */}
                <text x="100" y="115" textAnchor="middle" fill="#cdd6f4" fontSize="24" fontWeight="bold">
                    {value.toFixed(1)}
                </text>
                <text x="100" y="135" textAnchor="middle" fill="#6b7280" fontSize="12">
                    {unit}
                </text>
            </svg>
            <div className="gauge-label">{label}</div>
        </div>
    )
}


// 流程监控图
interface ProcessFlowProps {
    stages: {
        name: string
        status: 'idle' | 'running' | 'complete' | 'error'
        progress?: number
    }[]
}

export const ProcessFlow: React.FC<ProcessFlowProps> = ({ stages }) => {
    return (
        <div className="process-flow">
            {stages.map((stage, index) => (
                <React.Fragment key={index}>
                    <div className={`process-stage stage-${stage.status}`}>
                        <div className="stage-icon">
                            {stage.status === 'running' ? '⏳' :
                                stage.status === 'complete' ? '✓' :
                                    stage.status === 'error' ? '✗' : '○'}
                        </div>
                        <div className="stage-name">{stage.name}</div>
                        {stage.progress !== undefined && (
                            <div className="stage-progress">
                                <div style={{ width: `${stage.progress}%` }}></div>
                            </div>
                        )}
                    </div>
                    {index < stages.length - 1 && (
                        <div className={`process-arrow ${stage.status === 'complete' ? 'active' : ''}`}>
                            →
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}


// ============ 医疗行业控件 ============

// 生物信号波形
interface BioSignalWaveformProps {
    data: number[]
    type: 'ecg' | 'eeg' | 'emg' | 'spo2' | 'resp'
    sampleRate: number
    gain?: number
}

export const BioSignalWaveform: React.FC<BioSignalWaveformProps> = ({
    data,
    type,
    sampleRate,
    gain = 1,
}) => {
    const colors = {
        ecg: '#10b981',   // 心电 - 绿色
        eeg: '#8b5cf6',   // 脑电 - 紫色
        emg: '#f59e0b',   // 肌电 - 黄色
        spo2: '#3b82f6',  // 血氧 - 蓝色
        resp: '#06b6d4',  // 呼吸 - 青色
    }

    const labels = {
        ecg: 'ECG',
        eeg: 'EEG',
        emg: 'EMG',
        spo2: 'SpO₂',
        resp: 'Resp',
    }

    const width = 300
    const height = 80
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = (max - min) || 1

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v * gain - min) / range) * (height - 10)
        return `${x},${y}`
    }).join(' ')

    return (
        <div className="bio-waveform">
            <div className="waveform-header" style={{ color: colors[type] }}>
                <span>{labels[type]}</span>
                <span>{sampleRate}Hz</span>
            </div>
            <svg width={width} height={height} className="waveform-svg">
                {/* 网格 */}
                <defs>
                    <pattern id={`grid-${type}`} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-${type})`} />
                {/* 波形 */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={colors[type]}
                    strokeWidth="1.5"
                />
            </svg>
        </div>
    )
}


// 医疗参数监控面板
interface VitalSignsProps {
    heartRate: number
    spo2: number
    bloodPressure: { systolic: number; diastolic: number }
    temperature: number
    respRate: number
}

export const VitalSigns: React.FC<VitalSignsProps> = ({
    heartRate,
    spo2,
    bloodPressure,
    temperature,
    respRate,
}) => {
    return (
        <div className="vital-signs">
            <div className="vital-item hr">
                <span className="vital-icon">❤️</span>
                <div className="vital-data">
                    <span className="vital-value">{heartRate}</span>
                    <span className="vital-unit">bpm</span>
                </div>
                <span className="vital-label">Heart Rate</span>
            </div>
            <div className="vital-item spo2">
                <span className="vital-icon">💧</span>
                <div className="vital-data">
                    <span className="vital-value">{spo2}</span>
                    <span className="vital-unit">%</span>
                </div>
                <span className="vital-label">SpO₂</span>
            </div>
            <div className="vital-item bp">
                <span className="vital-icon">🩺</span>
                <div className="vital-data">
                    <span className="vital-value">{bloodPressure.systolic}/{bloodPressure.diastolic}</span>
                    <span className="vital-unit">mmHg</span>
                </div>
                <span className="vital-label">Blood Pressure</span>
            </div>
            <div className="vital-item temp">
                <span className="vital-icon">🌡️</span>
                <div className="vital-data">
                    <span className="vital-value">{temperature.toFixed(1)}</span>
                    <span className="vital-unit">°C</span>
                </div>
                <span className="vital-label">Temperature</span>
            </div>
            <div className="vital-item resp">
                <span className="vital-icon">🌬️</span>
                <div className="vital-data">
                    <span className="vital-value">{respRate}</span>
                    <span className="vital-unit">/min</span>
                </div>
                <span className="vital-label">Resp Rate</span>
            </div>
        </div>
    )
}


// ============ 汽车电子控件 ============

// 车载仪表盘
interface CarDashboardProps {
    speed: number           // km/h
    rpm: number            // 转速
    fuel: number           // 油量 %
    temperature: number    // 水温 °C
    odometer: number       // 里程
    gear: string           // 档位
    indicators: {
        engine: boolean
        battery: boolean
        oil: boolean
        brake: boolean
        door: boolean
    }
}

export const CarDashboard: React.FC<CarDashboardProps> = ({
    speed,
    rpm,
    fuel,
    temperature,
    odometer,
    gear,
    indicators,
}) => {
    return (
        <div className="car-dashboard">
            <div className="dash-main">
                <div className="speedometer">
                    <div className="speed-value">{speed}</div>
                    <div className="speed-unit">km/h</div>
                    <div className="speed-arc"></div>
                </div>
                <div className="tachometer">
                    <div className="rpm-value">{rpm}</div>
                    <div className="rpm-unit">×1000 rpm</div>
                </div>
            </div>

            <div className="dash-center">
                <div className="gear-display">{gear}</div>
                <div className="odometer">{odometer.toLocaleString()} km</div>
            </div>

            <div className="dash-gauges">
                <div className="mini-gauge fuel">
                    <div className="gauge-fill" style={{ width: `${fuel}%` }}></div>
                    <span>⛽ {fuel}%</span>
                </div>
                <div className="mini-gauge temp">
                    <div className="gauge-fill" style={{
                        width: `${Math.min(100, (temperature / 120) * 100)}%`,
                        backgroundColor: temperature > 100 ? '#ef4444' : '#3b82f6'
                    }}></div>
                    <span>🌡️ {temperature}°C</span>
                </div>
            </div>

            <div className="dash-indicators">
                <span className={`indicator ${indicators.engine ? 'on warning' : ''}`}>⚙️</span>
                <span className={`indicator ${indicators.battery ? 'on warning' : ''}`}>🔋</span>
                <span className={`indicator ${indicators.oil ? 'on warning' : ''}`}>🛢️</span>
                <span className={`indicator ${indicators.brake ? 'on error' : ''}`}>🛑</span>
                <span className={`indicator ${indicators.door ? 'on warning' : ''}`}>🚪</span>
            </div>
        </div>
    )
}


// OBD 故障诊断界面
interface OBDDiagnosticsProps {
    dtcCodes: { code: string; description: string; severity: 'info' | 'warning' | 'error' }[]
    vehicleInfo: {
        vin: string
        make: string
        model: string
        year: number
    }
    liveData: {
        name: string
        value: number
        unit: string
    }[]
}

export const OBDDiagnostics: React.FC<OBDDiagnosticsProps> = ({
    dtcCodes,
    vehicleInfo,
    liveData,
}) => {
    return (
        <div className="obd-diagnostics">
            <div className="obd-header">
                <h3>🚗 OBD-II 诊断</h3>
                <div className="vehicle-info">
                    <span>{vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}</span>
                    <span className="vin">VIN: {vehicleInfo.vin}</span>
                </div>
            </div>

            <div className="obd-section">
                <h4>故障码 ({dtcCodes.length})</h4>
                <div className="dtc-list">
                    {dtcCodes.length === 0 ? (
                        <div className="no-dtc">✓ 无故障码</div>
                    ) : (
                        dtcCodes.map((dtc, index) => (
                            <div key={index} className={`dtc-item dtc-${dtc.severity}`}>
                                <span className="dtc-code">{dtc.code}</span>
                                <span className="dtc-desc">{dtc.description}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="obd-section">
                <h4>实时数据</h4>
                <div className="live-data-grid">
                    {liveData.map((item, index) => (
                        <div key={index} className="data-item">
                            <span className="data-name">{item.name}</span>
                            <span className="data-value">{item.value} {item.unit}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}


// ============ 工业控件展示页面 ============
const IndustryWidgetsShowcase: React.FC = () => {
    // Demo data
    const [demoData, setDemoData] = React.useState({
        voltage: 220,
        current: 5.5,
        power: 1210,
        speed: 80,
        rpm: 3500,
        heartRate: 72,
    })

    // Animate demo data
    React.useEffect(() => {
        const interval = setInterval(() => {
            setDemoData(() => ({
                voltage: 218 + Math.random() * 4,
                current: 5 + Math.random() * 1,
                power: 1100 + Math.random() * 200,
                speed: 75 + Math.random() * 10,
                rpm: 3000 + Math.random() * 1000,
                heartRate: 68 + Math.floor(Math.random() * 10),
            }))
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="industry-widgets-showcase">
            <div className="showcase-header">
                <h1>🏭 工业控件库</h1>
                <p>专业的行业可视化组件集合，支持电力、工业控制、医疗和汽车电子等领域</p>
            </div>

            <div className="showcase-section">
                <h2>⚡ 电力行业</h2>
                <div className="showcase-grid">
                    <PowerMeter
                        voltage={demoData.voltage}
                        current={demoData.current}
                        power={demoData.power}
                        frequency={50.02}
                        powerFactor={0.95}
                    />
                    <HarmonicChart
                        harmonics={[100, 2.5, 1.2, 0.8, 0.5, 0.3, 0.2, 0.15, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02]}
                        thd={3.2}
                    />
                    <div className="power-nodes-demo">
                        <PowerSystemNode type="generator" name="发电机 G1" status="normal" value={500} unit="MW" />
                        <PowerSystemNode type="transformer" name="变压器 T1" status="normal" value={110} unit="kV" />
                        <PowerSystemNode type="breaker" name="断路器 CB1" status="normal" />
                        <PowerSystemNode type="load" name="负载 L1" status="warning" value={450} unit="kW" />
                    </div>
                </div>
            </div>

            <div className="showcase-section">
                <h2>🖥️ 工业控制</h2>
                <div className="showcase-grid">
                    <PLCStatus
                        name="PLC-001"
                        mode="run"
                        cpuLoad={45}
                        memoryUsage={62}
                        scanTime={8}
                        inputs={[true, false, true, true, false, false, true, false]}
                        outputs={[true, true, false, true, false, false, true, true]}
                    />
                    <IndustrialGauge
                        value={demoData.power / 20}
                        min={0}
                        max={100}
                        unit="%"
                        label="负载率"
                        zones={[
                            { from: 0, to: 60, color: '#10b981' },
                            { from: 60, to: 80, color: '#f59e0b' },
                            { from: 80, to: 100, color: '#ef4444' },
                        ]}
                    />
                    <ProcessFlow
                        stages={[
                            { name: '原料准备', status: 'complete', progress: 100 },
                            { name: '加工处理', status: 'running', progress: 65 },
                            { name: '质量检测', status: 'idle' },
                            { name: '包装出库', status: 'idle' },
                        ]}
                    />
                </div>
            </div>

            <div className="showcase-section">
                <h2>🏥 医疗行业</h2>
                <div className="showcase-grid">
                    <VitalSigns
                        heartRate={demoData.heartRate}
                        spo2={98}
                        bloodPressure={{ systolic: 120, diastolic: 80 }}
                        temperature={36.5}
                        respRate={16}
                    />
                    <BioSignalWaveform
                        data={Array.from({ length: 100 }, (_, i) =>
                            Math.sin(i * 0.1) * 30 + Math.sin(i * 0.3) * 10 + Math.random() * 5
                        )}
                        type="ecg"
                        sampleRate={250}
                    />
                    <BioSignalWaveform
                        data={Array.from({ length: 100 }, (_, i) =>
                            Math.sin(i * 0.05) * 20 + Math.random() * 10
                        )}
                        type="resp"
                        sampleRate={50}
                    />
                </div>
            </div>

            <div className="showcase-section">
                <h2>🚗 汽车电子</h2>
                <div className="showcase-grid">
                    <CarDashboard
                        speed={demoData.speed}
                        rpm={demoData.rpm}
                        fuel={75}
                        temperature={85}
                        odometer={12580}
                        gear="D"
                        indicators={{
                            engine: false,
                            battery: false,
                            oil: false,
                            brake: false,
                            door: false,
                        }}
                    />
                    <OBDDiagnostics
                        vehicleInfo={{
                            vin: 'WVWZZZ3CZWE123456',
                            make: 'Volkswagen',
                            model: 'Golf',
                            year: 2023,
                        }}
                        dtcCodes={[
                            { code: 'P0300', description: '随机/多缸失火', severity: 'warning' },
                        ]}
                        liveData={[
                            { name: '发动机转速', value: demoData.rpm, unit: 'rpm' },
                            { name: '车速', value: demoData.speed, unit: 'km/h' },
                            { name: '冷却液温度', value: 85, unit: '°C' },
                            { name: '节气门位置', value: 25, unit: '%' },
                        ]}
                    />
                </div>
            </div>
        </div>
    )
}

export default IndustryWidgetsShowcase

/**
 * BindingWizard - 变量绑定向导弹窗
 * 当用户添加新控件时自动弹出，引导用户选择数据源
 */
import React, { useState, useMemo } from 'react'

interface NodeOutput {
    nodeId: string
    nodeLabel: string
    portId: string
    portName: string
    dataType?: string
}

interface BindingWizardProps {
    isOpen: boolean
    widgetType: string
    widgetTitle: string
    availableOutputs: NodeOutput[]
    onConfirm: (binding: { type: string; path: string; nodeLabel?: string; portName?: string } | null) => void
    onCancel: () => void
}

// LabVIEW风格颜色
const lvColors = {
    bg: '#f0f0f0',
    bgSecondary: '#e8e8e8',
    border: '#c0c0c0',
    accent: '#0066cc',
    accentLight: '#e3f2fd',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    success: '#00aa00',
    warning: '#ff8800',
}

// 数据类型图标和颜色映射（类似LabVIEW的端子颜色）
const dataTypeStyles: Record<string, { color: string; icon: string }> = {
    number: { color: '#ff6600', icon: '🔢' },
    boolean: { color: '#00aa00', icon: '🔘' },
    string: { color: '#ff00ff', icon: '📝' },
    array: { color: '#0066ff', icon: '📊' },
    object: { color: '#996600', icon: '📦' },
    default: { color: '#666666', icon: '⚡' },
}

const BindingWizard: React.FC<BindingWizardProps> = ({
    isOpen,
    widgetType: _widgetType, // 保留供将来根据控件类型过滤兼容的数据源
    widgetTitle,
    availableOutputs,
    onConfirm,
    onCancel,
}) => {
    const [selectedBinding, setSelectedBinding] = useState<string | null>(null)
    const [bindingType, setBindingType] = useState<'node_output' | 'mqtt' | 'none'>('node_output')
    const [mqttTopic, setMqttTopic] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // 按节点分组输出端口
    const groupedOutputs = useMemo(() => {
        const groups: Record<string, NodeOutput[]> = {}
        availableOutputs.forEach(output => {
            if (!groups[output.nodeId]) {
                groups[output.nodeId] = []
            }
            groups[output.nodeId].push(output)
        })
        return groups
    }, [availableOutputs])

    // 过滤搜索结果
    const filteredOutputs = useMemo(() => {
        if (!searchQuery.trim()) return availableOutputs
        const query = searchQuery.toLowerCase()
        return availableOutputs.filter(
            output =>
                output.nodeLabel.toLowerCase().includes(query) ||
                output.portName.toLowerCase().includes(query) ||
                output.portId.toLowerCase().includes(query)
        )
    }, [availableOutputs, searchQuery])

    if (!isOpen) return null

    const handleConfirm = () => {
        if (bindingType === 'none') {
            onConfirm(null)
        } else if (bindingType === 'mqtt' && mqttTopic) {
            onConfirm({ type: 'device', path: mqttTopic })
        } else if (bindingType === 'node_output' && selectedBinding) {
            const [nodeId, portId] = selectedBinding.split('.')
            const output = availableOutputs.find(o => o.nodeId === nodeId && o.portId === portId)
            onConfirm({
                type: 'node_output',
                path: selectedBinding,
                nodeLabel: output?.nodeLabel,
                portName: output?.portName,
            })
        } else {
            onConfirm(null)
        }
    }

    const getTypeStyle = (dataType?: string) => {
        return dataTypeStyles[dataType || 'default'] || dataTypeStyles.default
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
        }}>
            <div style={{
                width: 520,
                maxHeight: '80vh',
                background: lvColors.bg,
                borderRadius: 6,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                fontFamily: 'Segoe UI, Tahoma, sans-serif',
            }}>
                {/* 标题栏 */}
                <div style={{
                    padding: '14px 16px',
                    background: lvColors.bgSecondary,
                    borderBottom: `1px solid ${lvColors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>🔗</span>
                        <div>
                            <div style={{ fontWeight: 600, color: lvColors.textPrimary, fontSize: 14 }}>
                                变量绑定向导
                            </div>
                            <div style={{ fontSize: 11, color: lvColors.textSecondary }}>
                                为 "{widgetTitle}" 选择数据源
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: 18,
                            cursor: 'pointer',
                            color: lvColors.textSecondary,
                            padding: 4,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* 绑定类型选择 */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${lvColors.border}`,
                    display: 'flex',
                    gap: 8,
                }}>
                    <BindingTypeButton
                        active={bindingType === 'node_output'}
                        icon="🔧"
                        label="程序框图输出"
                        description="绑定到节点端口"
                        onClick={() => setBindingType('node_output')}
                    />
                    <BindingTypeButton
                        active={bindingType === 'mqtt'}
                        icon="🌐"
                        label="MQTT主题"
                        description="订阅消息主题"
                        onClick={() => setBindingType('mqtt')}
                    />
                    <BindingTypeButton
                        active={bindingType === 'none'}
                        icon="📌"
                        label="无绑定"
                        description="静态显示"
                        onClick={() => setBindingType('none')}
                    />
                </div>

                {/* 内容区域 */}
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                    {bindingType === 'node_output' && (
                        <>
                            {/* 搜索框 */}
                            <div style={{ marginBottom: 12 }}>
                                <input
                                    type="text"
                                    placeholder="🔍 搜索节点或端口..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: `1px solid ${lvColors.border}`,
                                        borderRadius: 4,
                                        fontSize: 13,
                                        background: '#fff',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {/* 可用输出列表 */}
                            {filteredOutputs.length > 0 ? (
                                <div style={{
                                    border: `1px solid ${lvColors.border}`,
                                    borderRadius: 4,
                                    background: '#fff',
                                    maxHeight: 280,
                                    overflow: 'auto',
                                }}>
                                    {Object.entries(groupedOutputs).map(([nodeId, outputs]) => {
                                        const nodeOutputs = outputs.filter(o =>
                                            filteredOutputs.some(fo => fo.nodeId === o.nodeId && fo.portId === o.portId)
                                        )
                                        if (nodeOutputs.length === 0) return null

                                        return (
                                            <div key={nodeId}>
                                                {/* 节点标题 */}
                                                <div style={{
                                                    padding: '8px 12px',
                                                    background: lvColors.bgSecondary,
                                                    borderBottom: `1px solid ${lvColors.border}`,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: lvColors.textSecondary,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    <span>🔧</span>
                                                    <span>{outputs[0]?.nodeLabel || nodeId}</span>
                                                </div>

                                                {/* 端口列表 */}
                                                {nodeOutputs.map(output => {
                                                    const bindingKey = `${output.nodeId}.${output.portId}`
                                                    const isSelected = selectedBinding === bindingKey
                                                    const typeStyle = getTypeStyle(output.dataType)

                                                    return (
                                                        <div
                                                            key={bindingKey}
                                                            onClick={() => setSelectedBinding(bindingKey)}
                                                            style={{
                                                                padding: '10px 12px 10px 28px',
                                                                borderBottom: `1px solid ${lvColors.border}`,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                background: isSelected ? lvColors.accentLight : '#fff',
                                                                borderLeft: isSelected ? `3px solid ${lvColors.accent}` : '3px solid transparent',
                                                                transition: 'all 0.15s',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!isSelected) e.currentTarget.style.background = '#f8f8f8'
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!isSelected) e.currentTarget.style.background = '#fff'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <span style={{
                                                                    width: 24,
                                                                    height: 24,
                                                                    borderRadius: 4,
                                                                    background: typeStyle.color,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: 12,
                                                                }}>
                                                                    {typeStyle.icon}
                                                                </span>
                                                                <div>
                                                                    <div style={{
                                                                        fontSize: 13,
                                                                        fontWeight: 500,
                                                                        color: lvColors.textPrimary,
                                                                    }}>
                                                                        {output.portName}
                                                                    </div>
                                                                    <div style={{
                                                                        fontSize: 10,
                                                                        color: lvColors.textSecondary,
                                                                    }}>
                                                                        {bindingKey}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isSelected && (
                                                                <span style={{ color: lvColors.accent, fontSize: 16 }}>✓</span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div style={{
                                    padding: 32,
                                    textAlign: 'center',
                                    color: lvColors.textSecondary,
                                    background: '#fff',
                                    border: `1px solid ${lvColors.border}`,
                                    borderRadius: 4,
                                }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
                                    <div style={{ fontSize: 13, marginBottom: 4 }}>暂无可用的节点输出</div>
                                    <div style={{ fontSize: 11 }}>请先在程序框图中添加数据采集节点</div>
                                </div>
                            )}
                        </>
                    )}

                    {bindingType === 'mqtt' && (
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                color: lvColors.textSecondary,
                                marginBottom: 6,
                            }}>
                                MQTT 主题路径
                            </label>
                            <input
                                type="text"
                                placeholder="例如: sensors/temperature"
                                value={mqttTopic}
                                onChange={(e) => setMqttTopic(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: `1px solid ${lvColors.border}`,
                                    borderRadius: 4,
                                    fontSize: 13,
                                    background: '#fff',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <div style={{
                                marginTop: 12,
                                padding: 12,
                                background: lvColors.accentLight,
                                borderRadius: 4,
                                fontSize: 11,
                                color: lvColors.textSecondary,
                            }}>
                                💡 提示：MQTT主题将在运行时订阅，确保后端Broker已启动。
                            </div>
                        </div>
                    )}

                    {bindingType === 'none' && (
                        <div style={{
                            padding: 32,
                            textAlign: 'center',
                            color: lvColors.textSecondary,
                        }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>📌</div>
                            <div style={{ fontSize: 13 }}>控件将显示静态/模拟数据</div>
                            <div style={{ fontSize: 11, marginTop: 4 }}>您可以稍后在属性面板中配置绑定</div>
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: `1px solid ${lvColors.border}`,
                    background: lvColors.bgSecondary,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 20px',
                            border: `1px solid ${lvColors.border}`,
                            borderRadius: 4,
                            background: '#fff',
                            color: lvColors.textPrimary,
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{
                            padding: '8px 20px',
                            border: 'none',
                            borderRadius: 4,
                            background: lvColors.accent,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                        }}
                    >
                        确认绑定
                    </button>
                </div>
            </div>
        </div>
    )
}

// 绑定类型选择按钮
const BindingTypeButton: React.FC<{
    active: boolean
    icon: string
    label: string
    description: string
    onClick: () => void
}> = ({ active, icon, label, description, onClick }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1,
            padding: '10px 8px',
            border: active ? `2px solid ${lvColors.accent}` : `1px solid ${lvColors.border}`,
            borderRadius: 4,
            background: active ? lvColors.accentLight : '#fff',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s',
        }}
    >
        <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
        <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: active ? lvColors.accent : lvColors.textPrimary,
        }}>
            {label}
        </div>
        <div style={{ fontSize: 10, color: lvColors.textSecondary }}>{description}</div>
    </button>
)

export default BindingWizard

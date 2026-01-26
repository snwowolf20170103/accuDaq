/**
 * DashboardDesigner - 拖拽式 Dashboard 设计器
 * 功能：拖拽放置控件、调整大小、变量绑定、实时预览
 */

import React, { useState, useCallback } from 'react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import GridLayoutOriginal from 'react-grid-layout'
const GridLayout: any = GridLayoutOriginal
import 'react-grid-layout/css/styles.css'

// Define our own LayoutItem type to match react-grid-layout
interface LayoutItem {
    i: string
    x: number
    y: number
    w: number
    h: number
    minW?: number
    maxW?: number
    minH?: number
    maxH?: number
    static?: boolean
}
import 'react-resizable/css/styles.css'
import './DashboardDesigner.css'

import { LEDWidget } from './widgets/LEDWidget'
import { GaugeWidget } from './widgets/GaugeWidget'
import { SwitchWidget } from './widgets/SwitchWidget'
import { NumberInputWidget } from './widgets/NumberInputWidget'
import { LineChartWidget } from './widgets/LineChartWidget'
import { useMqtt, MqttMessage } from '../hooks/useMqtt'

export interface Widget {
    id: string
    type: 'led' | 'gauge' | 'switch' | 'number_input' | 'line_chart'
    title: string
    binding?: VariableBinding
    config: Record<string, any>
}

export interface VariableBinding {
    type: 'device' | 'global' | 'node_output'
    path: string
}

interface NodeOutput {
    nodeId: string
    nodeLabel: string
    portId: string
    portName: string
}

interface DashboardDesignerProps {
    editMode?: boolean
    isRunning?: boolean
    widgets?: Widget[]
    layout?: LayoutItem[]
    brokerHost?: string
    availableOutputs?: NodeOutput[]
    onWidgetsChange?: (widgets: Widget[]) => void
    onLayoutChange?: (layout: LayoutItem[]) => void
}

const DashboardDesigner = ({
    editMode = true,
    isRunning = false,
    widgets: initialWidgets = [],
    layout: initialLayout = [],
    brokerHost = 'localhost',
    availableOutputs = [],
    onWidgetsChange,
    onLayoutChange
}: DashboardDesignerProps) => {
    const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)
    const [layout, setLayout] = useState<LayoutItem[]>(initialLayout)
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null)
    const [showWidgetToolbar, setShowWidgetToolbar] = useState(editMode)
    const [showPropertyPanel, setShowPropertyPanel] = useState(false)

    // MQTT connection for real-time data
    const { isConnected, messages, history, subscribe } = useMqtt({
        brokerUrl: isRunning ? `ws://${brokerHost}:8083/mqtt` : ''
    })

    // Subscribe to all widget topics when running
    React.useEffect(() => {
        if (isConnected && isRunning) {
            widgets.forEach(w => {
                const topic = w.binding?.path || w.config?.topic || w.config?.dataSource
                if (topic) {
                    subscribe(topic)
                }
            })
            // Also subscribe to common topics
            subscribe('accudaq/#')
            subscribe('sensors/#')
        }
    }, [isConnected, isRunning, widgets, subscribe])

    // Sync widgets from props when they change
    React.useEffect(() => {
        if (initialWidgets.length > 0) {
            setWidgets(initialWidgets)
        }
    }, [initialWidgets])

    React.useEffect(() => {
        if (initialLayout.length > 0) {
            setLayout(initialLayout)
        }
    }, [initialLayout])

    // 添加控件
    const handleAddWidget = useCallback((type: Widget['type']) => {
        const id = `widget_${Date.now()}`

        const newWidget: Widget = {
            id,
            type,
            title: getDefaultTitle(type),
            config: getDefaultConfig(type)
        }

        const newLayoutItem: LayoutItem = {
            i: id,
            x: (widgets.length * 2) % 12,
            y: Infinity, // 自动放置到最底部
            w: getDefaultWidth(type),
            h: getDefaultHeight(type)
        }

        const updatedWidgets = [...widgets, newWidget]
        const updatedLayout = [...layout, newLayoutItem]

        setWidgets(updatedWidgets)
        setLayout(updatedLayout)
        setSelectedWidget(id)
        setShowPropertyPanel(true)

        onWidgetsChange?.(updatedWidgets)
        onLayoutChange?.(updatedLayout)
    }, [widgets, layout, onWidgetsChange, onLayoutChange])

    // 删除控件
    const handleDeleteWidget = useCallback((widgetId: string) => {
        const updatedWidgets = widgets.filter(w => w.id !== widgetId)
        const updatedLayout = layout.filter(l => l.i !== widgetId)

        setWidgets(updatedWidgets)
        setLayout(updatedLayout)

        if (selectedWidget === widgetId) {
            setSelectedWidget(null)
            setShowPropertyPanel(false)
        }

        onWidgetsChange?.(updatedWidgets)
        onLayoutChange?.(updatedLayout)
    }, [widgets, layout, selectedWidget, onWidgetsChange, onLayoutChange])

    // 更新控件配置
    const handleUpdateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
        const updatedWidgets = widgets.map(w =>
            w.id === widgetId ? { ...w, ...updates } : w
        )
        setWidgets(updatedWidgets)
        onWidgetsChange?.(updatedWidgets)
    }, [widgets, onWidgetsChange])

    // 布局变化
    const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
        setLayout(newLayout)
        onLayoutChange?.(newLayout)
    }, [onLayoutChange])

    // Get real-time value for a widget
    const getWidgetValue = (widget: Widget): any => {
        const topic = widget.binding?.path || widget.config?.topic || widget.config?.dataSource
        if (!topic || !isRunning) {
            return getMockValue(widget.type)
        }
        const msg = messages[topic]
        if (msg) {
            return typeof msg.payload === 'number' ? msg.payload : parseFloat(msg.payload) || msg.payload
        }
        return getMockValue(widget.type)
    }

    // Get history data for chart widgets
    const getWidgetHistory = (widget: Widget): MqttMessage[] => {
        const topic = widget.binding?.path || widget.config?.topic || widget.config?.dataSource
        if (!topic || !isRunning) {
            return []
        }
        return history[topic] || []
    }

    // 渲染控件
    const renderWidget = (widget: Widget) => {
        const commonProps = {
            label: widget.title,
            ...widget.config
        }

        const value = getWidgetValue(widget)

        switch (widget.type) {
            case 'led':
                return <LEDWidget value={!!value} {...commonProps} />
            case 'gauge':
                return <GaugeWidget value={typeof value === 'number' ? value : parseFloat(value) || 0} {...commonProps} />
            case 'switch':
                return <SwitchWidget value={!!value} {...commonProps} />
            case 'number_input':
                return <NumberInputWidget value={typeof value === 'number' ? value : parseFloat(value) || 0} {...commonProps} />
            case 'line_chart':
                return (
                    <LineChartWidget
                        label={widget.title}
                        data={getWidgetHistory(widget)}
                        dataKey="value"
                        color={widget.config?.color || '#4a90d9'}
                    />
                )
            default:
                return (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#666'
                    }}>
                        {widget.type}
                    </div>
                )
        }
    }

    const selectedWidgetData = widgets.find(w => w.id === selectedWidget)

    return (
        <div className="dashboard-designer">
            {/* 工具栏 */}
            {showWidgetToolbar && (
                <div className="widget-toolbar">
                    <div className="widget-toolbar-header">
                        <h3>📊 控件库</h3>
                        <button
                            className="btn-toggle-toolbar"
                            onClick={() => setShowWidgetToolbar(false)}
                        >
                            ◀
                        </button>
                    </div>

                    <div className="widget-toolbar-items">
                        <WidgetToolbarItem
                            icon="💡"
                            name="LED 指示灯"
                            onClick={() => handleAddWidget('led')}
                        />
                        <WidgetToolbarItem
                            icon="📊"
                            name="仪表盘"
                            onClick={() => handleAddWidget('gauge')}
                        />
                        <WidgetToolbarItem
                            icon="🔘"
                            name="开关按钮"
                            onClick={() => handleAddWidget('switch')}
                        />
                        <WidgetToolbarItem
                            icon="🔢"
                            name="数值输入"
                            onClick={() => handleAddWidget('number_input')}
                        />
                        <WidgetToolbarItem
                            icon="📈"
                            name="折线图"
                            onClick={() => handleAddWidget('line_chart')}
                        />
                    </div>
                </div>
            )}

            {/* 主画布 */}
            <div className="dashboard-canvas">
                <div className="dashboard-canvas-header">
                    <h3>Dashboard 设计器</h3>
                    <div className="dashboard-canvas-actions">
                        {!showWidgetToolbar && (
                            <button
                                className="btn-show-toolbar"
                                onClick={() => setShowWidgetToolbar(true)}
                            >
                                📊 控件库
                            </button>
                        )}
                        <button
                            className="btn-toggle-edit"
                            onClick={() => {
                                // 切换编辑模式逻辑
                            }}
                        >
                            {editMode ? '🔒 锁定' : '✏️ 编辑'}
                        </button>
                        <button
                            className="btn-clear-all"
                            onClick={() => {
                                if (confirm('确定清空所有控件吗？')) {
                                    setWidgets([])
                                    setLayout([])
                                    onWidgetsChange?.([])
                                    onLayoutChange?.([])
                                }
                            }}
                        >
                            🗑️ 清空
                        </button>
                    </div>
                </div>

                <div className="dashboard-grid-container">
                    {widgets.length === 0 ? (
                        <div className="dashboard-empty">
                            <div className="dashboard-empty-icon">📊</div>
                            <div className="dashboard-empty-text">从左侧拖入控件开始设计</div>
                            <div className="dashboard-empty-hint">
                                点击控件库中的控件即可添加到 Dashboard
                            </div>
                        </div>
                    ) : (
                        <GridLayout
                            className="dashboard-grid"
                            layout={layout}
                            cols={12}
                            rowHeight={60}
                            width={1200}
                            onLayoutChange={(newLayout: any) => handleLayoutChange(newLayout)}
                            isDraggable={editMode}
                            isResizable={editMode}
                            compactType="vertical"
                            preventCollision={false}
                        >
                            {widgets.map(widget => (
                                <div
                                    key={widget.id}
                                    className={`dashboard-widget-container ${selectedWidget === widget.id ? 'selected' : ''
                                        }`}
                                    onClick={() => {
                                        setSelectedWidget(widget.id)
                                        setShowPropertyPanel(true)
                                    }}
                                >
                                    {/* 控件头部（编辑模式） */}
                                    {editMode && (
                                        <div className="widget-header">
                                            <span className="widget-title">{widget.title}</span>
                                            <div className="widget-actions">
                                                <button
                                                    className="btn-widget-action"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteWidget(widget.id)
                                                    }}
                                                    title="删除"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 控件内容 */}
                                    <div className="widget-content">
                                        {renderWidget(widget)}
                                    </div>
                                </div>
                            ))}
                        </GridLayout>
                    )}
                </div>
            </div>

            {/* 属性面板 */}
            {showPropertyPanel && selectedWidgetData && (
                <div className="property-panel">
                    <div className="property-panel-header">
                        <h3>⚙️ 控件属性</h3>
                        <button
                            className="btn-close-panel"
                            onClick={() => setShowPropertyPanel(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className="property-panel-body">
                        {/* 基本信息 */}
                        <div className="property-section">
                            <h4>基本信息</h4>
                            <div className="property-group">
                                <label>控件类型</label>
                                <input
                                    type="text"
                                    value={selectedWidgetData.type}
                                    disabled
                                />
                            </div>
                            <div className="property-group">
                                <label>标题</label>
                                <input
                                    type="text"
                                    value={selectedWidgetData.title}
                                    onChange={(e) =>
                                        handleUpdateWidget(selectedWidgetData.id, {
                                            title: e.target.value
                                        })
                                    }
                                />
                            </div>
                        </div>

                        {/* 数据绑定 */}
                        <div className="property-section">
                            <h4>数据绑定</h4>
                            <div className="property-group">
                                <label>绑定类型</label>
                                <select
                                    value={selectedWidgetData.binding?.type || 'none'}
                                    onChange={(e) => {
                                        const type = e.target.value
                                        if (type === 'none') {
                                            handleUpdateWidget(selectedWidgetData.id, {
                                                binding: undefined
                                            })
                                        } else {
                                            handleUpdateWidget(selectedWidgetData.id, {
                                                binding: {
                                                    type: type as VariableBinding['type'],
                                                    path: ''
                                                }
                                            })
                                        }
                                    }}
                                >
                                    <option value="none">无绑定（静态）</option>
                                    <option value="device">设备变量</option>
                                    <option value="node_output">节点输出</option>
                                    <option value="global">全局变量</option>
                                </select>
                            </div>

                            {selectedWidgetData.binding && selectedWidgetData.binding.type === 'node_output' && (
                                <div className="property-group">
                                    <label>选择节点输出</label>
                                    {availableOutputs.length > 0 ? (
                                        <select
                                            value={selectedWidgetData.binding.path}
                                            onChange={(e) =>
                                                handleUpdateWidget(selectedWidgetData.id, {
                                                    binding: {
                                                        ...selectedWidgetData.binding!,
                                                        path: e.target.value
                                                    }
                                                })
                                            }
                                        >
                                            <option value="">请选择...</option>
                                            {availableOutputs.map(output => (
                                                <option
                                                    key={`${output.nodeId}.${output.portId}`}
                                                    value={`${output.nodeId}.${output.portId}`}
                                                >
                                                    {output.nodeLabel} → {output.portName}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="empty-hint">无可用节点输出</div>
                                    )}
                                </div>
                            )}

                            {selectedWidgetData.binding && selectedWidgetData.binding.type !== 'node_output' && (
                                <div className="property-group">
                                    <label>变量路径 / MQTT Topic</label>
                                    <input
                                        type="text"
                                        placeholder="例如: sensors/temperature"
                                        value={selectedWidgetData.binding.path}
                                        onChange={(e) =>
                                            handleUpdateWidget(selectedWidgetData.id, {
                                                binding: {
                                                    ...selectedWidgetData.binding!,
                                                    path: e.target.value
                                                }
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        {/* 控件配置 */}
                        <div className="property-section">
                            <h4>控件配置</h4>
                            {renderWidgetConfig(selectedWidgetData, handleUpdateWidget)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// 工具栏控件项
const WidgetToolbarItem = ({ icon, name, onClick }: {
    icon: string
    name: string
    onClick: () => void
}) => (
    <div className="widget-toolbar-item" onClick={onClick}>
        <div className="widget-toolbar-icon">{icon}</div>
        <div className="widget-toolbar-name">{name}</div>
    </div>
)

// 渲染控件配置表单
const renderWidgetConfig = (
    widget: Widget,
    onUpdate: (id: string, updates: Partial<Widget>) => void
) => {
    const updateConfig = (key: string, value: any) => {
        onUpdate(widget.id, {
            config: { ...widget.config, [key]: value }
        })
    }

    switch (widget.type) {
        case 'led':
            return (
                <>
                    <div className="property-group">
                        <label>激活颜色</label>
                        <input
                            type="color"
                            value={widget.config.colorOn || '#27ae60'}
                            onChange={(e) => updateConfig('colorOn', e.target.value)}
                        />
                    </div>
                    <div className="property-group">
                        <label>未激活颜色</label>
                        <input
                            type="color"
                            value={widget.config.colorOff || '#e74c3c'}
                            onChange={(e) => updateConfig('colorOff', e.target.value)}
                        />
                    </div>
                    <div className="property-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={widget.config.blinking || false}
                                onChange={(e) => updateConfig('blinking', e.target.checked)}
                            />
                            {' '}闪烁效果
                        </label>
                    </div>
                </>
            )

        case 'gauge':
            return (
                <>
                    <div className="property-group">
                        <label>最小值</label>
                        <input
                            type="number"
                            value={widget.config.min || 0}
                            onChange={(e) => updateConfig('min', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="property-group">
                        <label>最大值</label>
                        <input
                            type="number"
                            value={widget.config.max || 100}
                            onChange={(e) => updateConfig('max', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="property-group">
                        <label>单位</label>
                        <input
                            type="text"
                            value={widget.config.unit || ''}
                            onChange={(e) => updateConfig('unit', e.target.value)}
                        />
                    </div>
                </>
            )

        case 'number_input':
            return (
                <>
                    <div className="property-group">
                        <label>最小值</label>
                        <input
                            type="number"
                            value={widget.config.min || 0}
                            onChange={(e) => updateConfig('min', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="property-group">
                        <label>最大值</label>
                        <input
                            type="number"
                            value={widget.config.max || 100}
                            onChange={(e) => updateConfig('max', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="property-group">
                        <label>步进值</label>
                        <input
                            type="number"
                            value={widget.config.step || 1}
                            onChange={(e) => updateConfig('step', parseFloat(e.target.value))}
                        />
                    </div>
                </>
            )

        default:
            return <div>暂无配置项</div>
    }
}

// 辅助函数
const getDefaultTitle = (type: Widget['type']): string => {
    const titles = {
        led: 'LED 指示灯',
        gauge: '仪表盘',
        switch: '开关',
        number_input: '数值输入',
        line_chart: '折线图'
    }
    return titles[type] || '未知控件'
}

const getDefaultConfig = (type: Widget['type']): Record<string, any> => {
    const configs: Record<Widget['type'], Record<string, any>> = {
        led: { colorOn: '#27ae60', colorOff: '#e74c3c', size: 40 },
        gauge: { min: 0, max: 100, unit: '', color: '#27ae60' },
        switch: { colorOn: '#27ae60', colorOff: '#95a5a6', size: 'medium' },
        number_input: { min: 0, max: 100, step: 1, unit: '', precision: 2 },
        line_chart: { color: '#4a90d9', dataKey: 'value' }
    }
    return configs[type] || {}
}

const getDefaultWidth = (type: Widget['type']): number => {
    const widths = { led: 2, gauge: 3, switch: 2, number_input: 3, line_chart: 6 }
    return widths[type] || 3
}

const getDefaultHeight = (type: Widget['type']): number => {
    const heights = { led: 2, gauge: 3, switch: 2, number_input: 2, line_chart: 4 }
    return heights[type] || 3
}

const getMockValue = (type: Widget['type']): any => {
    // 模拟数据，实际应从 MQTT 或全局变量获取
    const mockValues: Record<Widget['type'], any> = {
        led: true,
        gauge: 65.5,
        switch: false,
        number_input: 42,
        line_chart: []
    }
    return mockValues[type] || null
}

export default DashboardDesigner

/**
 * FrontPanelPalette - LabVIEW风格的"控件选板"
 * 用于前面板视图，显示可拖拽的UI控件
 */
import { useState } from 'react'

// LabVIEW风格的颜色定义
const lvColors = {
    paletteBackground: '#f0f0f0',
    paletteBorder: '#c0c0c0',
    categoryHeader: '#e0e0e0',
    categoryHeaderHover: '#d0d0d0',
    itemBackground: '#ffffff',
    itemBorder: '#d0d0d0',
    itemHover: '#e8f4fc',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    accent: '#0066cc',
}

// 前面板控件定义（类似LabVIEW的控件选板）
interface WidgetDefinition {
    type: string
    name: string
    icon: string
    description: string
}

// LabVIEW风格的控件分类
const widgetCategories = [
    {
        id: 'numeric',
        name: '数值',
        icon: '🔢',
        items: [
            { type: 'gauge', name: '仪表盘', icon: '⚙️', description: '圆形仪表显示' },
            { type: 'seven-segment', name: '数字显示', icon: '🔢', description: '七段数码管' },
            { type: 'knob', name: '旋钮', icon: '🎛️', description: '可调节旋钮' },
            { type: 'slider', name: '滑块', icon: '📏', description: '线性滑块控件' },
            { type: 'numeric-input', name: '数值输入', icon: '✏️', description: '数字输入框' },
        ]
    },
    {
        id: 'boolean',
        name: '布尔',
        icon: '🔘',
        items: [
            { type: 'led', name: 'LED指示灯', icon: '💡', description: '状态指示灯' },
            { type: 'toggle', name: '开关', icon: '🔀', description: '拨动开关' },
            { type: 'push-button', name: '按钮', icon: '🔲', description: '点击按钮' },
            { type: 'checkbox', name: '复选框', icon: '☑️', description: '勾选控件' },
        ]
    },
    {
        id: 'string',
        name: '字符串与路径',
        icon: '📝',
        items: [
            { type: 'text-input', name: '字符串输入', icon: '📝', description: '文本输入框' },
            { type: 'text-display', name: '字符串显示', icon: '📄', description: '文本显示' },
            { type: 'path-input', name: '路径输入', icon: '📁', description: '文件路径选择' },
        ]
    },
    {
        id: 'graph',
        name: '图表',
        icon: '📈',
        items: [
            { type: 'waveform-chart', name: '波形图', icon: '📈', description: '实时波形显示' },
            { type: 'xy-graph', name: 'XY图', icon: '📊', description: 'XY坐标图' },
            { type: 'sparkline', name: '迷你图', icon: '📉', description: '紧凑趋势图' },
            { type: 'bar-chart', name: '柱状图', icon: '📊', description: '柱状图表' },
        ]
    },
    {
        id: 'container',
        name: '容器',
        icon: '📦',
        items: [
            { type: 'status-card', name: '状态卡片', icon: '🎴', description: '状态信息卡' },
            { type: 'alarm-banner', name: '报警横幅', icon: '🚨', description: '报警提示' },
            { type: 'progress-bar', name: '进度条', icon: '📊', description: '进度显示' },
            { type: 'tank', name: '液位计', icon: '🛢️', description: '液位显示' },
        ]
    },
    {
        id: 'decoration',
        name: '修饰',
        icon: '🎨',
        items: [
            { type: 'label', name: '标签', icon: '🏷️', description: '文字标签' },
            { type: 'panel', name: '面板', icon: '⬜', description: '分组面板' },
            { type: 'divider', name: '分隔线', icon: '➖', description: '水平分隔' },
        ]
    },
]

const FrontPanelPalette = () => {
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        'numeric': true,
        'boolean': true,
        'string': false,
        'graph': false,
        'container': false,
        'decoration': false,
    })

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }))
    }

    // 创建拖拽幽灵图像
    const createDragGhost = (widget: WidgetDefinition) => {
        const ghost = document.createElement('div')
        ghost.style.width = '100px'
        ghost.style.height = '70px'
        ghost.style.background = lvColors.itemBackground
        ghost.style.border = `2px solid ${lvColors.accent}`
        ghost.style.borderRadius = '4px'
        ghost.style.display = 'flex'
        ghost.style.flexDirection = 'column'
        ghost.style.alignItems = 'center'
        ghost.style.justifyContent = 'center'
        ghost.style.padding = '8px'
        ghost.style.gap = '4px'
        ghost.style.position = 'absolute'
        ghost.style.top = '-1000px'
        ghost.style.left = '-1000px'
        ghost.style.zIndex = '9999'
        ghost.style.color = lvColors.textPrimary
        ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
        ghost.style.fontFamily = 'Segoe UI, Tahoma, sans-serif'

        const icon = document.createElement('div')
        icon.innerHTML = widget.icon
        icon.style.fontSize = '24px'
        ghost.appendChild(icon)

        const text = document.createElement('div')
        text.innerText = widget.name
        text.style.fontSize = '11px'
        text.style.fontWeight = '500'
        text.style.textAlign = 'center'
        ghost.appendChild(text)

        document.body.appendChild(ghost)
        return ghost
    }

    const onDragStart = (event: React.DragEvent, widget: WidgetDefinition) => {
        const target = event.currentTarget as HTMLElement
        const rect = target.getBoundingClientRect()
        const offsetX = event.clientX - rect.left
        const offsetY = event.clientY - rect.top

        const dragData = {
            widget,
            source: 'front-panel-palette',
            offset: { x: offsetX, y: offsetY }
        }

        event.dataTransfer.setData('application/daq-widget', JSON.stringify(dragData))
        event.dataTransfer.effectAllowed = 'copy'

        const ghost = createDragGhost(widget)
        event.dataTransfer.setDragImage(ghost, 50, 35)

        setTimeout(() => {
            document.body.removeChild(ghost)
        }, 0)
    }

    return (
        <div style={{
            width: 220,
            background: lvColors.paletteBackground,
            borderRight: `1px solid ${lvColors.paletteBorder}`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            fontSize: 12,
        }}>
            {/* 选板标题 */}
            <div style={{
                padding: '8px 12px',
                background: lvColors.categoryHeader,
                borderBottom: `1px solid ${lvColors.paletteBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 600,
                color: lvColors.textPrimary,
            }}>
                <span>📊</span>
                <span>控件选板</span>
            </div>

            {/* 分类列表 */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {widgetCategories.map(category => (
                    <div key={category.id}>
                        {/* 分类标题 */}
                        <div
                            onClick={() => toggleCategory(category.id)}
                            style={{
                                padding: '6px 12px',
                                background: openCategories[category.id] ? lvColors.categoryHeaderHover : lvColors.categoryHeader,
                                borderBottom: `1px solid ${lvColors.paletteBorder}`,
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontWeight: 500,
                                color: lvColors.textPrimary,
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = lvColors.categoryHeaderHover}
                            onMouseLeave={(e) => e.currentTarget.style.background = openCategories[category.id] ? lvColors.categoryHeaderHover : lvColors.categoryHeader}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{category.icon}</span>
                                <span>{category.name}</span>
                            </span>
                            <span style={{
                                fontSize: 10,
                                transform: openCategories[category.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                color: lvColors.textSecondary,
                            }}>
                                ▼
                            </span>
                        </div>

                        {/* 控件网格 */}
                        {openCategories[category.id] && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 4,
                                padding: 6,
                                background: '#fff',
                            }}>
                                {category.items.map(widget => (
                                    <div
                                        key={widget.type}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, widget)}
                                        style={{
                                            background: lvColors.itemBackground,
                                            border: `1px solid ${lvColors.itemBorder}`,
                                            borderRadius: 3,
                                            padding: '8px 4px',
                                            cursor: 'grab',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 4,
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = lvColors.itemHover
                                            e.currentTarget.style.borderColor = lvColors.accent
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = lvColors.itemBackground
                                            e.currentTarget.style.borderColor = lvColors.itemBorder
                                        }}
                                        title={widget.description}
                                    >
                                        <div style={{ fontSize: 20 }}>{widget.icon}</div>
                                        <div style={{
                                            fontSize: 10,
                                            color: lvColors.textPrimary,
                                            textAlign: 'center',
                                            lineHeight: 1.2,
                                            maxWidth: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {widget.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* 底部提示 */}
            <div style={{
                padding: '8px 12px',
                borderTop: `1px solid ${lvColors.paletteBorder}`,
                background: lvColors.categoryHeader,
                fontSize: 10,
                color: lvColors.textSecondary,
                textAlign: 'center',
            }}>
                💡 拖拽控件到前面板
            </div>
        </div>
    )
}

export default FrontPanelPalette

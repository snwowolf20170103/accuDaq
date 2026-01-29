/**
 * ComponentLibrary - LabVIEW-style "函数选板" (Function Palette)
 * Displays block diagram components in a grid layout similar to LabVIEW
 */
import { useState } from 'react'
import { ComponentDefinition } from '../types'
import componentLibrary from '../data/componentLibrary'

// LabVIEW-style color palette
const lvColors = {
    paletteBackground: '#f0f0f0',
    paletteBorder: '#c0c0c0',
    categoryHeader: '#e0e0e0',
    categoryHeaderHover: '#d0d0d0',
    itemBackground: '#ffffff',
    itemBorder: '#d0d0d0',
    itemHover: '#e8f4fc',
    itemSelected: '#cce5ff',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    accent: '#0066cc',
}

// LabVIEW-style Chinese category labels
const categoryLabels: Record<string, { cn: string; icon: string }> = {
    'device': { cn: '测量I/O', icon: '📡' },
    'comm': { cn: '数据通信', icon: '🌐' },
    'protocol': { cn: '仪器I/O', icon: '🔌' },
    'algorithm': { cn: '信号处理', icon: '📈' },
    'logic': { cn: '数值', icon: '🔢' },
    'control': { cn: '结构', icon: '🔲' },
    'storage': { cn: '文件I/O', icon: '💾' },
}

const ComponentLibrary = () => {
    // State for collapsible categories
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        'device': true,
        'comm': false,
        'protocol': false,
        'algorithm': false,
        'logic': false,
        'control': false,
        'storage': false
    })

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }))
    }

    // Helper to create a custom drag ghost image
    const createDragGhost = (component: ComponentDefinition) => {
        const ghost = document.createElement('div')
        ghost.style.width = '120px'
        ghost.style.height = '80px'
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

        // Add icon
        const icon = document.createElement('div')
        icon.innerHTML = component.icon
        icon.style.fontSize = '24px'
        ghost.appendChild(icon)

        // Add text
        const text = document.createElement('div')
        text.innerText = component.name
        text.style.fontSize = '11px'
        text.style.fontWeight = '500'
        text.style.textAlign = 'center'
        ghost.appendChild(text)

        document.body.appendChild(ghost)
        return ghost
    }

    const onDragStart = (event: React.DragEvent, component: ComponentDefinition) => {
        // Calculate offset
        const target = event.currentTarget as HTMLElement
        const rect = target.getBoundingClientRect()
        const offsetX = event.clientX - rect.left
        const offsetY = event.clientY - rect.top

        const dragData = {
            component,
            offset: { x: offsetX, y: offsetY }
        }

        event.dataTransfer.setData('application/daq-component', JSON.stringify(dragData))
        event.dataTransfer.effectAllowed = 'move'

        // Set custom drag image
        const ghost = createDragGhost(component)
        event.dataTransfer.setDragImage(ghost, 60, 40)

        // Remove ghost from DOM after a short delay (browser takes a snapshot)
        setTimeout(() => {
            document.body.removeChild(ghost)
        }, 0)
    }

    const categories = [
        { id: 'device', items: componentLibrary.filter(c => c.category === 'device') },
        { id: 'comm', items: componentLibrary.filter(c => c.category === 'comm') },
        { id: 'protocol', items: componentLibrary.filter(c => c.category === 'protocol') },
        { id: 'algorithm', items: componentLibrary.filter(c => c.category === 'algorithm') },
        { id: 'logic', items: componentLibrary.filter(c => c.category === 'logic') },
        { id: 'control', items: componentLibrary.filter(c => c.category === 'control') },
        { id: 'storage', items: componentLibrary.filter(c => c.category === 'storage') },
    ]

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
            {/* Palette Header */}
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
                <span>🔧</span>
                <span>函数选板</span>
            </div>

            {/* Category List */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {categories.map(category => category.items.length > 0 && (
                    <div key={category.id}>
                        {/* Category Header */}
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
                                <span>{categoryLabels[category.id]?.icon || '📦'}</span>
                                <span>{categoryLabels[category.id]?.cn || category.id}</span>
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

                        {/* Items Grid */}
                        {openCategories[category.id] && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: 4,
                                padding: 6,
                                background: '#fff',
                            }}>
                                {category.items.map(component => (
                                    <div
                                        key={component.type}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, component)}
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
                                        title={component.description}
                                    >
                                        <div style={{ fontSize: 20 }}>{component.icon}</div>
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
                                            {component.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Search hint at bottom */}
            <div style={{
                padding: '8px 12px',
                borderTop: `1px solid ${lvColors.paletteBorder}`,
                background: lvColors.categoryHeader,
                fontSize: 10,
                color: lvColors.textSecondary,
                textAlign: 'center',
            }}>
                💡 拖拽组件到画布
            </div>
        </div>
    )
}

export default ComponentLibrary

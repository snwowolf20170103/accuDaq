import { useState } from 'react'
import { ComponentDefinition } from '../types'
import componentLibrary from '../data/componentLibrary'

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
        ghost.style.width = '200px'
        ghost.style.height = '100px' // Approximation of node size
        ghost.style.background = '#2a2a4a'
        ghost.style.border = '1px solid #4a90d9'
        ghost.style.borderRadius = '8px'
        ghost.style.display = 'flex'
        ghost.style.alignItems = 'center'
        ghost.style.padding = '10px'
        ghost.style.gap = '10px'
        ghost.style.position = 'absolute'
        ghost.style.top = '-1000px'
        ghost.style.left = '-1000px'
        ghost.style.zIndex = '9999'
        ghost.style.color = '#fff'
        ghost.style.boxShadow = '0 8px 16px rgba(0,0,0,0.4)'

        // Add icon
        const icon = document.createElement('div')
        icon.innerHTML = component.icon
        icon.style.fontSize = '24px'
        ghost.appendChild(icon)

        // Add text
        const text = document.createElement('div')
        text.innerText = component.name
        text.style.fontSize = '14px'
        text.style.fontWeight = 'bold'
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
        event.dataTransfer.setDragImage(ghost, offsetX, offsetY)

        // Remove ghost from DOM after a short delay (browser takes a snapshot)
        setTimeout(() => {
            document.body.removeChild(ghost)
        }, 0)
    }

    const categories = [
        { id: 'device', title: 'Devices', items: componentLibrary.filter(c => c.category === 'device') },
        { id: 'comm', title: 'Communication', items: componentLibrary.filter(c => c.category === 'comm') },
        { id: 'protocol', title: 'Industrial Protocols', items: componentLibrary.filter(c => c.category === 'protocol') },
        { id: 'algorithm', title: 'Algorithms', items: componentLibrary.filter(c => c.category === 'algorithm') },
        { id: 'logic', title: 'Logic', items: componentLibrary.filter(c => c.category === 'logic') },
        { id: 'control', title: 'Control', items: componentLibrary.filter(c => c.category === 'control') },
        { id: 'storage', title: 'Storage', items: componentLibrary.filter(c => c.category === 'storage') },
    ]

    return (
        <div className="component-library">
            <div className="library-header">
                <h2>🧩 Components</h2>
            </div>

            <div className="library-content">
                {categories.map(category => category.items.length > 0 && (
                    <div key={category.id} className={`component-category ${openCategories[category.id] ? 'open' : ''}`}>
                        <div
                            className="category-title"
                            onClick={() => toggleCategory(category.id)}
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <span>{category.title}</span>
                            <span style={{ fontSize: '12px', transform: openCategories[category.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                ▼
                            </span>
                        </div>

                        {openCategories[category.id] && (
                            <div className="category-items">
                                {category.items.map(component => (
                                    <div
                                        key={component.type}
                                        className={`component-item component-${category.id}`}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, component)}
                                    >
                                        <div className="component-icon">{component.icon}</div>
                                        <div className="component-info">
                                            <div className="component-name">{component.name}</div>
                                            <div className="component-desc">{component.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ComponentLibrary

import { ComponentDefinition } from '../types'
import componentLibrary from '../data/componentLibrary'

const ComponentLibrary = () => {
    const onDragStart = (event: React.DragEvent, component: ComponentDefinition) => {
        event.dataTransfer.setData('application/daq-component', JSON.stringify(component))
        event.dataTransfer.effectAllowed = 'move'
    }

    const deviceComponents = componentLibrary.filter(c => c.category === 'device')
    const commComponents = componentLibrary.filter(c => c.category === 'comm')
    const logicComponents = componentLibrary.filter(c => c.category === 'logic')
    const storageComponents = componentLibrary.filter(c => c.category === 'storage')

    return (
        <div className="component-library">
            <div className="library-header">
                <h2>🧩 Components</h2>
            </div>

            <div className="library-content">
                {deviceComponents.length > 0 && (
                    <div className="component-category">
                        <div className="category-title">Devices</div>
                        {deviceComponents.map(component => (
                            <div
                                key={component.type}
                                className="component-item component-device"
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

                {commComponents.length > 0 && (
                    <div className="component-category">
                        <div className="category-title">Communication</div>
                        {commComponents.map(component => (
                            <div
                                key={component.type}
                                className="component-item component-comm"
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

                {logicComponents.length > 0 && (
                    <div className="component-category">
                        <div className="category-title">Logic</div>
                        {logicComponents.map(component => (
                            <div
                                key={component.type}
                                className="component-item component-logic"
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

                {storageComponents.length > 0 && (
                    <div className="component-category">
                        <div className="category-title">Storage</div>
                        {storageComponents.map(component => (
                            <div
                                key={component.type}
                                className="component-item component-storage"
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
        </div>
    )
}

export default ComponentLibrary

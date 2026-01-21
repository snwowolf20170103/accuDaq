import { Node } from '@xyflow/react'
import { DAQNodeData } from '../types'
import componentLibrary from '../data/componentLibrary'

interface PropertyPanelProps {
    node: Node | undefined
    onPropertyChange: (nodeId: string, key: string, value: any) => void
}

const PropertyPanel = ({ node, onPropertyChange }: PropertyPanelProps) => {
    if (!node) {
        return (
            <div className="property-panel">
                <div className="panel-header">
                    <h3>Properties</h3>
                </div>
                <div className="panel-content">
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div className="empty-state-text">Select a node to edit properties</div>
                    </div>
                </div>
            </div>
        )
    }

    const nodeData = node.data as DAQNodeData
    const componentDef = componentLibrary.find(c => c.type === nodeData.componentType)
    const propertySchema = componentDef?.propertySchema || []

    const handleChange = (key: string, value: any, type: string) => {
        let parsedValue = value
        if (type === 'number') {
            parsedValue = parseFloat(value) || 0
        } else if (type === 'boolean') {
            parsedValue = value === 'true' || value === true
        }
        onPropertyChange(node.id, key, parsedValue)
    }

    return (
        <div className="property-panel">
            <div className="panel-header">
                <h3>
                    {nodeData.icon} {nodeData.label}
                </h3>
            </div>

            <div className="panel-content">
                <div className="property-group">
                    <div className="property-group-title">Node Info</div>
                    <div className="property-row">
                        <div className="property-label">ID</div>
                        <input
                            className="property-input"
                            value={node.id}
                            readOnly
                            style={{ opacity: 0.6 }}
                        />
                    </div>
                    <div className="property-row">
                        <div className="property-label">Type</div>
                        <input
                            className="property-input"
                            value={nodeData.componentType}
                            readOnly
                            style={{ opacity: 0.6 }}
                        />
                    </div>
                </div>

                <div className="property-group">
                    <div className="property-group-title">Configuration</div>
                    {propertySchema.map(prop => (
                        <div key={prop.key} className="property-row">
                            <div className="property-label">{prop.label}</div>
                            {prop.type === 'select' ? (
                                <select
                                    className="property-select"
                                    value={nodeData.properties[prop.key] ?? prop.default ?? ''}
                                    onChange={(e) => handleChange(prop.key, e.target.value, prop.type)}
                                >
                                    {prop.options?.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : prop.type === 'boolean' ? (
                                <select
                                    className="property-select"
                                    value={String(nodeData.properties[prop.key] ?? prop.default ?? false)}
                                    onChange={(e) => handleChange(prop.key, e.target.value, prop.type)}
                                >
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            ) : (
                                <input
                                    className="property-input"
                                    type={prop.type === 'number' ? 'number' : 'text'}
                                    value={nodeData.properties[prop.key] ?? prop.default ?? ''}
                                    onChange={(e) => handleChange(prop.key, e.target.value, prop.type)}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="property-group">
                    <div className="property-group-title">Ports</div>
                    <div className="property-row">
                        <div className="property-label">Inputs</div>
                        <div style={{ color: '#aaa', fontSize: 12 }}>
                            {nodeData.inputs.length > 0
                                ? nodeData.inputs.map(i => i.name).join(', ')
                                : 'None'}
                        </div>
                    </div>
                    <div className="property-row">
                        <div className="property-label">Outputs</div>
                        <div style={{ color: '#aaa', fontSize: 12 }}>
                            {nodeData.outputs.length > 0
                                ? nodeData.outputs.map(o => o.name).join(', ')
                                : 'None'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PropertyPanel

import { useState } from 'react'
import { Node } from '@xyflow/react'
import { DAQNodeData } from '../types'
import componentLibrary from '../data/componentLibrary'
import BlocklyModal from './BlocklyModal'

interface PropertyPanelProps {
    node: Node | undefined
    onPropertyChange: (nodeId: string, key: string, value: any) => void
}

const PropertyPanel = ({ node, onPropertyChange }: PropertyPanelProps) => {
    const [isBlocklyModalOpen, setIsBlocklyModalOpen] = useState(false)

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

    const nodeData = node.data as unknown as DAQNodeData
    const componentDef = componentLibrary.find(c => c.type === nodeData.componentType)
    const propertySchema = componentDef?.propertySchema || []
    const isCustomScript = nodeData.componentType === 'custom_script'

    const handleChange = (key: string, value: any, type: string) => {
        let parsedValue = value
        if (type === 'number') {
            parsedValue = parseFloat(value) || 0
        } else if (type === 'boolean') {
            parsedValue = value === 'true' || value === true
        } else if (type === 'select') {
            // 对于 select，尝试保持原始类型（数值选项应返回数值）
            const numValue = parseFloat(value)
            if (!isNaN(numValue) && String(numValue) === value) {
                parsedValue = numValue
            }
        }
        onPropertyChange(node.id, key, parsedValue)
    }

    const handleBlocklySave = (code: string, xml: string) => {
        onPropertyChange(node.id, 'generatedCode', code)
        onPropertyChange(node.id, 'blocklyXml', xml)
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

                {/* Custom Script 专用：编辑逻辑按钮 */}
                {isCustomScript && (
                    <div className="property-group">
                        <div className="property-group-title">Script Editor</div>
                        <div className="property-row">
                            <button
                                className="blockly-edit-btn"
                                onClick={() => setIsBlocklyModalOpen(true)}
                                style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: '#0e639c',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                🧩 编辑逻辑
                            </button>
                        </div>
                        {nodeData.properties.generatedCode && (
                            <div className="property-row" style={{ marginTop: '8px' }}>
                                <pre style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: '#1e1e1e',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    color: '#9cdcfe',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: '120px',
                                    overflow: 'auto',
                                }}>
                                    {nodeData.properties.generatedCode}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                <div className="property-group">
                    <div className="property-group-title">Configuration</div>
                    {propertySchema
                        .filter(prop => prop.type !== 'hidden' && prop.type !== 'code')
                        .map(prop => (
                        <div key={prop.key} className="property-row">
                            <div className="property-label">{prop.label}</div>
                            {prop.type === 'select' ? (
                                <select
                                    className="property-select"
                                    value={nodeData.properties[prop.key] ?? prop.default ?? ''}
                                    onChange={(e) => handleChange(prop.key, e.target.value, prop.type)}
                                >
                                    {prop.options?.map((opt, idx) => {
                                        // 支持两种格式：string[] 和 {value, label}[]
                                        const optValue = typeof opt === 'string' ? opt : opt.value;
                                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                                        return (
                                            <option key={idx} value={optValue}>
                                                {optLabel}
                                            </option>
                                        );
                                    })}
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

            {/* Blockly 弹窗编辑器 */}
            <BlocklyModal
                isOpen={isBlocklyModalOpen}
                onClose={() => setIsBlocklyModalOpen(false)}
                onSave={handleBlocklySave}
                initialXml={nodeData.properties.blocklyXml || ''}
                nodeName={nodeData.label}
            />
        </div>
    )
}

export default PropertyPanel

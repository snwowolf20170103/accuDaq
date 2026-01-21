import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { DAQNodeData } from '../types'

const DAQNode = ({ data, selected }: NodeProps) => {
    const nodeData = data as DAQNodeData

    return (
        <div className={`daq-node ${nodeData.category} ${selected ? 'selected' : ''}`}>
            <div className="daq-node-header">
                <div className="daq-node-icon">{nodeData.icon}</div>
                <div>
                    <div className="daq-node-title">{nodeData.label}</div>
                    <div className="daq-node-type">{nodeData.componentType}</div>
                </div>
            </div>

            <div className="daq-node-body">
                <div className="daq-node-ports">
                    <div className="daq-ports-left">
                        {nodeData.inputs.map((input, index) => (
                            <div key={input.id} className="daq-port">
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={input.id}
                                    style={{
                                        top: `${35 + index * 25}%`,
                                        background: '#4a90d9',
                                        width: 10,
                                        height: 10,
                                        border: '2px solid #fff',
                                    }}
                                />
                                <span style={{ marginLeft: 12 }}>{input.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="daq-ports-right">
                        {nodeData.outputs.map((output, index) => (
                            <div key={output.id} className="daq-port" style={{ justifyContent: 'flex-end' }}>
                                <span style={{ marginRight: 12 }}>{output.name}</span>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={output.id}
                                    style={{
                                        top: `${35 + index * 25}%`,
                                        background: '#27ae60',
                                        width: 10,
                                        height: 10,
                                        border: '2px solid #fff',
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(DAQNode)

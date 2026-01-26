import React, { useState, useCallback, useRef } from 'react'
import './FlowDesigner.css'

// 流程节点类型
export type FlowNodeType =
    | 'start'
    | 'end'
    | 'action'
    | 'condition'
    | 'loop'
    | 'parallel'
    | 'delay'
    | 'script'
    | 'device'
    | 'assertion'

// 流程节点
export interface FlowNode {
    id: string
    type: FlowNodeType
    name: string
    x: number
    y: number
    width: number
    height: number
    properties: Record<string, any>
    inputs: string[]   // 连接到此节点的边 ID
    outputs: string[]  // 从此节点出发的边 ID
}

// 流程边（连接）
export interface FlowEdge {
    id: string
    sourceId: string
    targetId: string
    sourcePort: 'default' | 'true' | 'false' | 'loop' | 'complete'
    label?: string
}

// 流程定义
export interface FlowDefinition {
    id: string
    name: string
    description: string
    nodes: FlowNode[]
    edges: FlowEdge[]
    variables: { name: string; type: string; defaultValue: any }[]
}

// 节点图标
const nodeIcons: Record<FlowNodeType, string> = {
    start: '▶️',
    end: '🏁',
    action: '⚡',
    condition: '❓',
    loop: '🔄',
    parallel: '⚔️',
    delay: '⏰',
    script: '📜',
    device: '🔌',
    assertion: '✅',
}

// 节点颜色
const nodeColors: Record<FlowNodeType, string> = {
    start: '#10b981',
    end: '#ef4444',
    action: '#3b82f6',
    condition: '#f59e0b',
    loop: '#8b5cf6',
    parallel: '#06b6d4',
    delay: '#6366f1',
    script: '#ec4899',
    device: '#14b8a6',
    assertion: '#22c55e',
}

interface FlowDesignerProps {
    initialFlow?: FlowDefinition
    onFlowChange?: (flow: FlowDefinition) => void
    onNodeSelect?: (node: FlowNode | null) => void
    readOnly?: boolean
}

export const FlowDesigner: React.FC<FlowDesignerProps> = ({
    initialFlow,
    onFlowChange,
    onNodeSelect,
    readOnly = false,
}) => {
    const [flow, setFlow] = useState<FlowDefinition>(initialFlow || {
        id: crypto.randomUUID(),
        name: 'New Flow',
        description: '',
        nodes: [],
        edges: [],
        variables: [],
    })

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
    const [dragState, setDragState] = useState<{
        type: 'move' | 'connect' | null
        nodeId: string | null
        startX: number
        startY: number
    }>({ type: null, nodeId: null, startX: 0, startY: 0 })

    const [connecting, setConnecting] = useState<{
        sourceId: string
        sourcePort: string
        x: number
        y: number
    } | null>(null)

    const canvasRef = useRef<HTMLDivElement>(null)
    const [offset, _setOffset] = useState({ x: 50, y: 50 })
    const [scale, _setScale] = useState(1)
    void _setOffset  // Reserved for future pan feature
    void _setScale   // Reserved for future zoom feature

    // 生成唯一 ID
    const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 添加节点
    const addNode = useCallback((type: FlowNodeType, x: number, y: number) => {
        const newNode: FlowNode = {
            id: generateId(),
            type,
            name: getDefaultNodeName(type),
            x,
            y,
            width: type === 'condition' ? 120 : 140,
            height: type === 'condition' ? 80 : 60,
            properties: getDefaultProperties(type),
            inputs: [],
            outputs: [],
        }

        setFlow(prev => {
            const updated = {
                ...prev,
                nodes: [...prev.nodes, newNode],
            }
            onFlowChange?.(updated)
            return updated
        })

        return newNode
    }, [onFlowChange])

    // 删除节点
    const deleteNode = useCallback((nodeId: string) => {
        setFlow(prev => {
            const updated = {
                ...prev,
                nodes: prev.nodes.filter(n => n.id !== nodeId),
                edges: prev.edges.filter(e => e.sourceId !== nodeId && e.targetId !== nodeId),
            }
            onFlowChange?.(updated)
            return updated
        })
        if (selectedNodeId === nodeId) {
            setSelectedNodeId(null)
            onNodeSelect?.(null)
        }
    }, [selectedNodeId, onFlowChange, onNodeSelect])

    // 添加边
    const addEdge = useCallback((sourceId: string, targetId: string, sourcePort: FlowEdge['sourcePort'] = 'default') => {
        // 检查是否已存在
        const exists = flow.edges.some(e => e.sourceId === sourceId && e.targetId === targetId)
        if (exists || sourceId === targetId) return

        const newEdge: FlowEdge = {
            id: `edge_${Date.now()}`,
            sourceId,
            targetId,
            sourcePort,
        }

        setFlow(prev => {
            const updated = {
                ...prev,
                edges: [...prev.edges, newEdge],
            }
            onFlowChange?.(updated)
            return updated
        })
    }, [flow.edges, onFlowChange])

    // 删除边 (用于右键菜单删除连接)
    const _deleteEdge = useCallback((edgeId: string) => {
        setFlow(prev => {
            const updated = {
                ...prev,
                edges: prev.edges.filter(e => e.id !== edgeId),
            }
            onFlowChange?.(updated)
            return updated
        })
    }, [onFlowChange])
    void _deleteEdge  // Reserved for edge deletion feature

    // 更新节点位置
    const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
        setFlow(prev => {
            const updated = {
                ...prev,
                nodes: prev.nodes.map(n =>
                    n.id === nodeId ? { ...n, x, y } : n
                ),
            }
            return updated
        })
    }, [])

    // 更新节点属性
    const updateNodeProperties = useCallback((nodeId: string, properties: Record<string, any>) => {
        setFlow(prev => {
            const updated = {
                ...prev,
                nodes: prev.nodes.map(n =>
                    n.id === nodeId ? { ...n, properties: { ...n.properties, ...properties } } : n
                ),
            }
            onFlowChange?.(updated)
            return updated
        })
    }, [onFlowChange])

    // 处理节点拖拽
    const handleNodeMouseDown = (e: React.MouseEvent, node: FlowNode) => {
        if (readOnly) return
        e.stopPropagation()

        setSelectedNodeId(node.id)
        onNodeSelect?.(node)

        setDragState({
            type: 'move',
            nodeId: node.id,
            startX: e.clientX - node.x,
            startY: e.clientY - node.y,
        })
    }

    // 处理连接开始
    const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, port: string) => {
        if (readOnly) return
        e.stopPropagation()

        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        setConnecting({
            sourceId: nodeId,
            sourcePort: port,
            x: (e.clientX - rect.left - offset.x) / scale,
            y: (e.clientY - rect.top - offset.y) / scale,
        })
    }

    // 处理鼠标移动
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (dragState.type === 'move' && dragState.nodeId) {
            const x = e.clientX - dragState.startX
            const y = e.clientY - dragState.startY
            updateNodePosition(dragState.nodeId, Math.max(0, x), Math.max(0, y))
        }

        if (connecting) {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return

            setConnecting(prev => prev ? {
                ...prev,
                x: (e.clientX - rect.left - offset.x) / scale,
                y: (e.clientY - rect.top - offset.y) / scale,
            } : null)
        }
    }, [dragState, connecting, offset, scale, updateNodePosition])

    // 处理鼠标释放
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (connecting) {
            // 检查是否在某个节点上释放
            const rect = canvasRef.current?.getBoundingClientRect()
            if (rect) {
                const x = (e.clientX - rect!.left - offset.x) / scale
                const y = (e.clientY - rect!.top - offset.y) / scale

                const targetNode = flow.nodes.find(n =>
                    x >= n.x && x <= n.x + n.width &&
                    y >= n.y && y <= n.y + n.height &&
                    n.id !== connecting.sourceId
                )

                if (targetNode) {
                    addEdge(connecting.sourceId, targetNode.id, connecting.sourcePort as FlowEdge['sourcePort'])
                }
            }
            setConnecting(null)
        }

        if (dragState.type === 'move') {
            onFlowChange?.(flow)
        }

        setDragState({ type: null, nodeId: null, startX: 0, startY: 0 })
    }, [connecting, dragState, flow, offset, scale, addEdge, onFlowChange])

    // 处理拖放添加节点
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const nodeType = e.dataTransfer.getData('nodeType') as FlowNodeType
        if (!nodeType) return

        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return

        const x = (e.clientX - rect.left - offset.x) / scale
        const y = (e.clientY - rect.top - offset.y) / scale

        addNode(nodeType, x, y)
    }, [offset, scale, addNode])

    // 渲染节点
    const renderNode = (node: FlowNode) => {
        const isSelected = selectedNodeId === node.id

        return (
            <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={`flow-node ${isSelected ? 'selected' : ''}`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
            >
                {/* 节点背景 */}
                {node.type === 'condition' ? (
                    <polygon
                        points={`${node.width / 2},0 ${node.width},${node.height / 2} ${node.width / 2},${node.height} 0,${node.height / 2}`}
                        fill={nodeColors[node.type]}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth="2"
                    />
                ) : node.type === 'start' || node.type === 'end' ? (
                    <ellipse
                        cx={node.width / 2}
                        cy={node.height / 2}
                        rx={node.width / 2}
                        ry={node.height / 2}
                        fill={nodeColors[node.type]}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth="2"
                    />
                ) : (
                    <rect
                        width={node.width}
                        height={node.height}
                        rx="8"
                        fill={nodeColors[node.type]}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth="2"
                    />
                )}

                {/* 图标和文字 */}
                <text
                    x={node.width / 2}
                    y={node.height / 2 - 8}
                    textAnchor="middle"
                    fill="white"
                    fontSize="16"
                >
                    {nodeIcons[node.type]}
                </text>
                <text
                    x={node.width / 2}
                    y={node.height / 2 + 12}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="500"
                >
                    {node.name}
                </text>

                {/* 输出端口 */}
                {node.type !== 'end' && (
                    <>
                        {node.type === 'condition' ? (
                            <>
                                {/* True 端口 */}
                                <circle
                                    cx={node.width}
                                    cy={node.height / 2 - 15}
                                    r="6"
                                    fill="#10b981"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="port output"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'true')}
                                />
                                <text x={node.width + 10} y={node.height / 2 - 12} fill="#10b981" fontSize="9">Y</text>

                                {/* False 端口 */}
                                <circle
                                    cx={node.width}
                                    cy={node.height / 2 + 15}
                                    r="6"
                                    fill="#ef4444"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="port output"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'false')}
                                />
                                <text x={node.width + 10} y={node.height / 2 + 18} fill="#ef4444" fontSize="9">N</text>
                            </>
                        ) : (
                            <circle
                                cx={node.width}
                                cy={node.height / 2}
                                r="6"
                                fill="#cdd6f4"
                                stroke="white"
                                strokeWidth="2"
                                className="port output"
                                onMouseDown={(e) => handlePortMouseDown(e, node.id, 'default')}
                            />
                        )}
                    </>
                )}

                {/* Loop 完成端口 */}
                {node.type === 'loop' && (
                    <circle
                        cx={node.width / 2}
                        cy={node.height}
                        r="6"
                        fill="#8b5cf6"
                        stroke="white"
                        strokeWidth="2"
                        className="port output"
                        onMouseDown={(e) => handlePortMouseDown(e, node.id, 'complete')}
                    />
                )}
            </g>
        )
    }

    // 渲染边
    const renderEdge = (edge: FlowEdge) => {
        const sourceNode = flow.nodes.find(n => n.id === edge.sourceId)
        const targetNode = flow.nodes.find(n => n.id === edge.targetId)
        if (!sourceNode || !targetNode) return null

        // 计算起点
        let startX = sourceNode.x + sourceNode.width
        let startY = sourceNode.y + sourceNode.height / 2

        if (edge.sourcePort === 'true') {
            startY = sourceNode.y + sourceNode.height / 2 - 15
        } else if (edge.sourcePort === 'false') {
            startY = sourceNode.y + sourceNode.height / 2 + 15
        } else if (edge.sourcePort === 'complete') {
            startX = sourceNode.x + sourceNode.width / 2
            startY = sourceNode.y + sourceNode.height
        }

        // 计算终点
        const endX = targetNode.x
        const endY = targetNode.y + targetNode.height / 2

        // 贝塞尔曲线控制点
        const midX = (startX + endX) / 2
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`

        return (
            <g key={edge.id} className="flow-edge">
                <path
                    d={path}
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                    <text
                        x={midX}
                        y={(startY + endY) / 2 - 5}
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize="10"
                    >
                        {edge.label}
                    </text>
                )}
            </g>
        )
    }

    // 渲染正在连接的线
    const renderConnectingLine = () => {
        if (!connecting) return null

        const sourceNode = flow.nodes.find(n => n.id === connecting.sourceId)
        if (!sourceNode) return null

        let startX = sourceNode.x + sourceNode.width
        let startY = sourceNode.y + sourceNode.height / 2

        if (connecting.sourcePort === 'true') {
            startY -= 15
        } else if (connecting.sourcePort === 'false') {
            startY += 15
        }

        return (
            <line
                x1={startX}
                y1={startY}
                x2={connecting.x}
                y2={connecting.y}
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
            />
        )
    }

    return (
        <div className="flow-designer">
            {/* 工具栏 */}
            <div className="flow-toolbar">
                <span className="toolbar-title">🔧 流程设计器</span>
                <div className="toolbar-actions">
                    <button onClick={() => {
                        const json = JSON.stringify(flow, null, 2)
                        console.log(json)
                        navigator.clipboard.writeText(json)
                    }}>📋 导出 JSON</button>
                    <button onClick={() => setFlow({ ...flow, nodes: [], edges: [] })}>🗑️ 清空</button>
                </div>
            </div>

            {/* 节点面板 */}
            <div className="flow-palette">
                <div className="palette-title">节点</div>
                {(['start', 'end', 'action', 'condition', 'loop', 'delay', 'script', 'device', 'assertion'] as FlowNodeType[]).map(type => (
                    <div
                        key={type}
                        className="palette-item"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('nodeType', type)}
                        style={{ borderLeftColor: nodeColors[type] }}
                    >
                        <span>{nodeIcons[type]}</span>
                        <span>{getDefaultNodeName(type)}</span>
                    </div>
                ))}
            </div>

            {/* 画布 */}
            <div
                ref={canvasRef}
                className="flow-canvas"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <svg
                    width="100%"
                    height="100%"
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                >
                    {/* 箭头定义 */}
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="7"
                            refX="9"
                            refY="3.5"
                            orient="auto"
                        >
                            <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                        </marker>
                    </defs>

                    {/* 网格 */}
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    </pattern>
                    <rect width="2000" height="2000" fill="url(#grid)" />

                    {/* 边 */}
                    {flow.edges.map(renderEdge)}

                    {/* 正在连接的线 */}
                    {renderConnectingLine()}

                    {/* 节点 */}
                    {flow.nodes.map(renderNode)}
                </svg>
            </div>

            {/* 属性面板 */}
            <div className="flow-properties">
                <div className="properties-title">属性</div>
                {selectedNodeId ? (
                    <NodePropertiesPanel
                        node={flow.nodes.find(n => n.id === selectedNodeId)!}
                        onUpdate={(props) => updateNodeProperties(selectedNodeId, props)}
                        onDelete={() => deleteNode(selectedNodeId)}
                    />
                ) : (
                    <div className="no-selection">选择一个节点</div>
                )}
            </div>
        </div>
    )
}

// 节点属性面板
const NodePropertiesPanel: React.FC<{
    node: FlowNode
    onUpdate: (props: Record<string, any>) => void
    onDelete: () => void
}> = ({ node, onUpdate, onDelete }) => {
    return (
        <div className="node-properties">
            <div className="prop-group">
                <label>名称</label>
                <input
                    type="text"
                    value={node.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                />
            </div>

            {node.type === 'action' && (
                <div className="prop-group">
                    <label>动作</label>
                    <select
                        value={node.properties.action || ''}
                        onChange={(e) => onUpdate({ action: e.target.value })}
                    >
                        <option value="">选择动作...</option>
                        <option value="read">读取数据</option>
                        <option value="write">写入数据</option>
                        <option value="call">调用函数</option>
                        <option value="set">设置变量</option>
                    </select>
                </div>
            )}

            {node.type === 'condition' && (
                <div className="prop-group">
                    <label>条件表达式</label>
                    <input
                        type="text"
                        value={node.properties.expression || ''}
                        onChange={(e) => onUpdate({ expression: e.target.value })}
                        placeholder="e.g. value > 100"
                    />
                </div>
            )}

            {node.type === 'loop' && (
                <>
                    <div className="prop-group">
                        <label>循环类型</label>
                        <select
                            value={node.properties.loopType || 'count'}
                            onChange={(e) => onUpdate({ loopType: e.target.value })}
                        >
                            <option value="count">固定次数</option>
                            <option value="while">条件循环</option>
                            <option value="foreach">遍历</option>
                        </select>
                    </div>
                    <div className="prop-group">
                        <label>次数/条件</label>
                        <input
                            type="text"
                            value={node.properties.loopValue || ''}
                            onChange={(e) => onUpdate({ loopValue: e.target.value })}
                        />
                    </div>
                </>
            )}

            {node.type === 'delay' && (
                <div className="prop-group">
                    <label>延迟 (ms)</label>
                    <input
                        type="number"
                        value={node.properties.delay || 1000}
                        onChange={(e) => onUpdate({ delay: parseInt(e.target.value) })}
                    />
                </div>
            )}

            {node.type === 'script' && (
                <div className="prop-group">
                    <label>脚本</label>
                    <textarea
                        value={node.properties.script || ''}
                        onChange={(e) => onUpdate({ script: e.target.value })}
                        placeholder="Python/JavaScript code..."
                        rows={6}
                    />
                </div>
            )}

            {node.type === 'device' && (
                <>
                    <div className="prop-group">
                        <label>设备</label>
                        <select
                            value={node.properties.deviceId || ''}
                            onChange={(e) => onUpdate({ deviceId: e.target.value })}
                        >
                            <option value="">选择设备...</option>
                            <option value="device1">Mock Device</option>
                            <option value="serial1">Serial Port</option>
                        </select>
                    </div>
                    <div className="prop-group">
                        <label>操作</label>
                        <select
                            value={node.properties.operation || ''}
                            onChange={(e) => onUpdate({ operation: e.target.value })}
                        >
                            <option value="read">读取</option>
                            <option value="write">写入</option>
                            <option value="connect">连接</option>
                            <option value="disconnect">断开</option>
                        </select>
                    </div>
                </>
            )}

            {node.type === 'assertion' && (
                <>
                    <div className="prop-group">
                        <label>断言类型</label>
                        <select
                            value={node.properties.assertType || 'equals'}
                            onChange={(e) => onUpdate({ assertType: e.target.value })}
                        >
                            <option value="equals">等于</option>
                            <option value="notEquals">不等于</option>
                            <option value="greaterThan">大于</option>
                            <option value="lessThan">小于</option>
                            <option value="contains">包含</option>
                            <option value="matches">正则匹配</option>
                        </select>
                    </div>
                    <div className="prop-group">
                        <label>期望值</label>
                        <input
                            type="text"
                            value={node.properties.expected || ''}
                            onChange={(e) => onUpdate({ expected: e.target.value })}
                        />
                    </div>
                </>
            )}

            <div className="prop-actions">
                <button className="delete-btn" onClick={onDelete}>🗑️ 删除节点</button>
            </div>
        </div>
    )
}

// 辅助函数
function getDefaultNodeName(type: FlowNodeType): string {
    const names: Record<FlowNodeType, string> = {
        start: '开始',
        end: '结束',
        action: '动作',
        condition: '条件',
        loop: '循环',
        parallel: '并行',
        delay: '延迟',
        script: '脚本',
        device: '设备',
        assertion: '断言',
    }
    return names[type]
}

function getDefaultProperties(type: FlowNodeType): Record<string, any> {
    switch (type) {
        case 'delay':
            return { delay: 1000 }
        case 'loop':
            return { loopType: 'count', loopValue: '10' }
        case 'condition':
            return { expression: '' }
        default:
            return {}
    }
}

export default FlowDesigner

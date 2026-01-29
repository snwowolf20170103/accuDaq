/**
 * EditorCanvas - Extracted ReactFlow canvas component
 * Wraps the visual flow editor with toolbar, debug panel, and property panel
 * Isolates canvas state updates from main App re-renders
 */
import React, { memo, useCallback } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    Node,
    Edge,
} from '@xyflow/react'
import ComponentLibrary from '../ComponentLibrary'
import PropertyPanel from '../PropertyPanel'
import Toolbar from '../Toolbar'
import DAQNode from '../DAQNode'
import DataFlowEdge from '../DataFlowEdge'
import { DAQNodeData } from '../../types'

// Hoisted static configuration (Vercel: rendering-hoist-jsx)
const nodeTypes = {
    daqNode: DAQNode,
}

const edgeTypes = {
    dataflow: DataFlowEdge,
}

const defaultEdgeOptions = {
    type: 'dataflow',
    animated: false,
}

const miniMapNodeColor = (node: any) => {
    const category = (node.data as unknown as DAQNodeData).category
    switch (category) {
        case 'device': return '#4a90d9'
        case 'logic': return '#9b59b6'
        case 'storage': return '#27ae60'
        case 'comm': return '#e67e22'
        case 'protocol': return '#f1c40f'
        case 'algorithm': return '#1abc9c'
        case 'control': return '#34495e'
        default: return '#888'
    }
}

const miniMapStyle: React.CSSProperties = {
    backgroundColor: '#0f0f1a',
    height: 150,
    width: 200
}

const debugPanelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 10,
    left: 10,
    background: 'rgba(230, 126, 34, 0.9)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    zIndex: 100,
}

const continueButtonStyle: React.CSSProperties = {
    marginLeft: 12,
    background: '#27ae60',
    color: '#fff',
    border: 'none',
    padding: '4px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 500,
}

interface EditorCanvasProps {
    // Node & Edge data
    nodes: Node[]
    edges: Edge[]
    selectedNode: string | null
    selectedNodeData: Node | undefined
    // Event handlers
    onNodesChange: OnNodesChange
    onEdgesChange: OnEdgesChange
    onConnect: OnConnect
    onNodeClick: (event: any, node: Node) => void
    onPaneClick: () => void
    onDragOver: (event: React.DragEvent) => void
    onDrop: (event: React.DragEvent) => void
    onPropertyChange: (nodeId: string, key: string, value: any) => void
    // Toolbar props
    onExport: () => void
    onImport: () => void
    onCompile: () => void
    onDelete: () => void
    onToggleRun: () => void
    csvPath: string
    isRunning: boolean
    // Debug props
    debugMode: boolean
    breakpoints: string[]
    executingNodeId: string | null
    onContinueFromBreakpoint: () => void
    // Edge data visualization
    showEdgeData: boolean
    onToggleEdgeData: () => void
    // Undo/Redo
    onUndo?: () => void
    onRedo?: () => void
    canUndo: boolean
    canRedo: boolean
    // Side panel
    showDevicePanel: boolean
    DevicePanelComponent: React.ComponentType
}

function EditorCanvasComponent({
    nodes,
    edges,
    selectedNode,
    selectedNodeData,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    onDragOver,
    onDrop,
    onPropertyChange,
    onExport,
    onImport,
    onCompile,
    onDelete,
    onToggleRun,
    csvPath,
    isRunning,
    debugMode,
    breakpoints,
    executingNodeId,
    onContinueFromBreakpoint,
    showEdgeData,
    onToggleEdgeData,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    showDevicePanel,
    DevicePanelComponent,
}: EditorCanvasProps) {

    const handleDemoMode = useCallback(() => {
        onToggleRun()
        onToggleEdgeData()
    }, [onToggleRun, onToggleEdgeData])

    return (
        <div className="app-container">
            {showDevicePanel ? (
                <DevicePanelComponent />
            ) : (
                <ComponentLibrary />
            )}

            <div className="canvas-container">
                <Toolbar
                    onExport={onExport}
                    onImport={onImport}
                    onCompile={onCompile}
                    onDelete={onDelete}
                    hasSelection={!!selectedNode}
                    isRunning={isRunning}
                    onToggleRun={onToggleRun}
                    csvPath={csvPath}
                    onDemoMode={debugMode ? () => console.log("Demo Mode data flow") : undefined}
                    isDemoMode={false}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                />

                <div className="canvas-wrapper">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        snapToGrid={false}
                        nodesDraggable={true}
                        nodesConnectable={true}
                        elementsSelectable={true}
                        selectNodesOnDrag={false}
                        multiSelectionKeyCode="Shift"
                        panOnDrag={true}
                        minZoom={0.2}
                        maxZoom={4}
                        defaultEdgeOptions={defaultEdgeOptions}
                    >
                        <Background color="#2a2a4a" gap={20} />
                        <Controls />
                        <MiniMap
                            nodeColor={miniMapNodeColor}
                            maskColor="rgba(26, 26, 46, 0.7)"
                            style={miniMapStyle}
                            zoomable
                            pannable
                        />
                    </ReactFlow>
                </div>

                {/* Debug Info Panel */}
                {debugMode ? (
                    <div style={debugPanelStyle}>
                        🐛 Debug Mode Active | Breakpoints: {breakpoints.length} | {executingNodeId ? `Executing: ${executingNodeId}` : 'Idle'}
                        {executingNodeId ? (
                            <button onClick={onContinueFromBreakpoint} style={continueButtonStyle}>
                                ▶️ Continue
                            </button>
                        ) : null}
                    </div>
                ) : null}

                {/* Edge Data Visualization Toggle */}
                {isRunning ? (
                    <div style={{
                        position: 'absolute',
                        bottom: 10,
                        right: 340,
                        background: showEdgeData ? 'rgba(34, 197, 94, 0.9)' : 'rgba(100, 116, 139, 0.9)',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                        onClick={onToggleEdgeData}
                    >
                        {showEdgeData ? '📊' : '📉'} Data Flow: {showEdgeData ? 'ON' : 'OFF'}
                    </div>
                ) : null}
            </div>

            <PropertyPanel
                node={selectedNodeData}
                onPropertyChange={onPropertyChange}
            />
        </div>
    )
}

// Memoize to prevent re-renders when parent state changes that don't affect canvas
export const EditorCanvas = memo(EditorCanvasComponent)
export default EditorCanvas

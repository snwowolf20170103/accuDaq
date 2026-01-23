import { useState, useCallback } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    useReactFlow,
    Connection,
    Edge,
    ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import ComponentLibrary from './components/ComponentLibrary'
import PropertyPanel from './components/PropertyPanel'
import Toolbar from './components/Toolbar'
import DAQNode from './components/DAQNode'
import { ComponentDefinition, DAQNodeData } from './types'
import { v4 as uuidv4 } from 'uuid'
import componentLibrary from './data/componentLibrary'

const nodeTypes = {
    daqNode: DAQNode,
}

import Dashboard from './components/Dashboard'
import DaqEngine from './components/DaqEngine'
import { useEffect } from 'react'

// Toast notification component
interface ToastProps {
    message: string
    type: 'success' | 'error' | 'info'
    onClose: () => void
}

const Toast = ({ message, type, onClose }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 2000)
        return () => clearTimeout(timer)
    }, [onClose])

    const bgColor = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'

    return (
        <div style={{
            position: 'fixed',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            background: bgColor,
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 500,
            animation: 'slideDown 0.3s ease-out'
        }}>
            <span>{icon}</span>
            <span>{message}</span>
        </div>
    )
}

function App() {
    // Load from localStorage on initialization
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([])
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
    const [selectedNode, setSelectedNode] = useState<string | null>(null)
    const [view, setView] = useState<'editor' | 'dashboard'>('editor')
    const [isRunning, setIsRunning] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type })
    }, [])

    // Load from localStorage on initialization
    useEffect(() => {
        const savedNodes = localStorage.getItem('daq-nodes')
        const savedEdges = localStorage.getItem('daq-edges')
        if (savedNodes) {
            // Ensure all nodes are unselected and draggable when loading
            const parsedNodes = JSON.parse(savedNodes).map((node: any) => ({
                ...node,
                selected: false,
                draggable: true,
                selectable: true
            }))
            setNodes(parsedNodes)
        }
        if (savedEdges) setEdges(JSON.parse(savedEdges))
    }, [])

    // Persist to localStorage whenever nodes/edges change
    useEffect(() => {
        localStorage.setItem('daq-nodes', JSON.stringify(nodes))
    }, [nodes])

    useEffect(() => {
        localStorage.setItem('daq-edges', JSON.stringify(edges))
    }, [edges])

    const toggleRun = useCallback(async () => {
        if (!isRunning) {
            // Start the Python DAQ engine
            try {
                const response = await fetch('/api/engine/start', { method: 'POST' });
                const result = await response.json();
                if (response.ok) {
                    setIsRunning(true);
                    setView('dashboard');
                    console.log("DAQ Engine started:", result);
                } else {
                    alert("Failed to start engine: " + result.error);
                }
            } catch (err: any) {
                alert("Network error: " + err.message);
            }
        } else {
            // Stop the Python DAQ engine
            try {
                const response = await fetch('/api/engine/stop', { method: 'POST' });
                const result = await response.json();
                if (response.ok) {
                    setIsRunning(false);
                    console.log("DAQ Engine stopped:", result);
                } else {
                    // Engine might have already stopped, just update state
                    setIsRunning(false);
                    console.warn("Stop returned:", result.error);
                }
            } catch (err: any) {
                setIsRunning(false);
                console.error("Stop error:", err.message);
            }
        }
    }, [isRunning])

    // Connection validation: check port type compatibility
    const isValidConnection = useCallback((connection: Edge | Connection) => {
        // Handle both Edge and Connection types
        const source = connection.source;
        const target = connection.target;
        const sourceHandle = connection.sourceHandle ?? null;
        const targetHandle = connection.targetHandle ?? null;

        if (!source || !target) return false;
        if (!sourceHandle || !targetHandle) return false;

        const sourceNode = nodes.find(n => n.id === source);
        const targetNode = nodes.find(n => n.id === target);

        if (!sourceNode || !targetNode) return false;

        // Find port definitions
        const sourcePort = sourceNode.data.outputs?.find(
            (p: any) => p.id === sourceHandle
        );
        const targetPort = targetNode.data.inputs?.find(
            (p: any) => p.id === targetHandle
        );

        if (!sourcePort || !targetPort) {
            console.warn('Port not found:', sourceHandle, targetHandle);
            return false;
        }

        // Type compatibility rules
        const sourceType = sourcePort.type;
        const targetType = targetPort.type;

        // 'any' type accepts all
        if (targetType === 'any') return true;
        if (sourceType === 'any') return true;

        // Exact type match
        if (sourceType === targetType) return true;

        // 'object' can connect to 'any' (already covered above)
        // 'number' can connect to 'number' or 'any'
        // etc.

        console.warn(`Type mismatch: ${sourceType} -> ${targetType}`);
        return false;
    }, [nodes]);

    const onConnect = useCallback(
        (params: Connection) => {
            // Double-check validation before adding edge
            if (!isValidConnection(params)) {
                console.warn('Invalid connection rejected:', params);
                return;
            }
            setEdges((eds) => addEdge({
                ...params,
                type: 'smoothstep',
                animated: true,
            }, eds));
        },
        [setEdges, isValidConnection]
    )

    const onNodeClick = useCallback((_: any, node: any) => {
        setSelectedNode(node.id)
    }, [])

    const onPaneClick = useCallback(() => {
        setSelectedNode(null)
    }, [])

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
    }, [])

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault()

            const componentData = event.dataTransfer.getData('application/daq-component')
            if (!componentData) return

            const component: ComponentDefinition = JSON.parse(componentData)

            const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect()
            if (!reactFlowBounds) return

            const position = {
                x: event.clientX - reactFlowBounds.left - 100,
                y: event.clientY - reactFlowBounds.top - 50,
            }

            const newNode = {
                id: uuidv4(),
                type: 'daqNode',
                position,
                draggable: true,
                selectable: true,
                selected: false,
                data: {
                    label: component.name,
                    componentType: component.type,
                    category: component.category,
                    icon: component.icon,
                    inputs: component.inputs,
                    outputs: component.outputs,
                    properties: { ...component.defaultProperties },
                } as DAQNodeData,
            }

            setNodes((nds) => [...nds, newNode])
        },
        [setNodes]
    )

    const updateNodeProperty = useCallback((nodeId: string, key: string, value: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            properties: {
                                ...node.data.properties,
                                [key]: value,
                            },
                        },
                    }
                }
                return node
            })
        )
    }, [setNodes])

    const deleteSelectedNode = useCallback(() => {
        if (selectedNode) {
            setNodes((nds) => nds.filter((n) => n.id !== selectedNode))
            setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode))
            setSelectedNode(null)
        }
    }, [selectedNode, setNodes, setEdges])

    const compileProject = useCallback(async () => {
        const project = {
            meta: {
                name: "MQTT Realtime Test",
                version: "1.0.0",
                schemaVersion: "0.1.0"
            },
            devices: [],
            logic: {
                nodes: nodes.map((node) => ({
                    id: node.id,
                    type: `daq:${node.data.componentType}`,
                    label: node.data.label,
                    position: node.position,
                    properties: node.data.properties,
                })),
                wires: edges.map((edge) => ({
                    id: edge.id,
                    source: { nodeId: edge.source, portId: edge.sourceHandle || 'output' },
                    target: { nodeId: edge.target, portId: edge.targetHandle || 'input' },
                })),
            },
            ui: { widgets: [] }
        }

        try {
            const response = await fetch('/api/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            })

            if (response.ok) {
                showToast("Compilation successful!", "success")
            } else {
                const error = await response.text()
                showToast("Compilation failed: " + error, "error")
            }
        } catch (err) {
            showToast("Network error: " + err, "error")
        }
    }, [nodes, edges])

    const exportProject = useCallback(async () => {
        const project = {
            meta: {
                name: "New Project",
                version: "1.0.0",
                schemaVersion: "0.1.0"
            },
            devices: [],
            logic: {
                nodes: nodes.map((node) => ({
                    id: node.id,
                    type: `daq:${node.data.componentType}`,
                    label: node.data.label,
                    position: node.position,
                    properties: node.data.properties,
                })),
                wires: edges.map((edge) => ({
                    id: edge.id,
                    source: { nodeId: edge.source, portId: edge.sourceHandle || 'output' },
                    target: { nodeId: edge.target, portId: edge.targetHandle || 'input' },
                })),
            },
            ui: { widgets: [] }
        }

        const jsonString = JSON.stringify(project, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Try to use the File System Access API if supported
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: 'project.daq',
                    types: [{
                        description: 'DAQ Project File',
                        accept: { 'application/json': ['.daq', '.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.warn('File picker failed, falling back to default download', err);
                } else {
                    return; // User cancelled
                }
            }
        }

        // Fallback: Default download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'project.daq'
        a.click()
        URL.revokeObjectURL(url)
    }, [nodes, edges])

    const importProject = useCallback(async () => {
        try {
            // Try to use File System Access API first
            let jsonString = '';
            if ('showOpenFilePicker' in window) {
                const [handle] = await (window as any).showOpenFilePicker({
                    types: [{
                        description: 'DAQ Project File',
                        accept: { 'application/json': ['.daq', '.json'] },
                    }],
                });
                const file = await handle.getFile();
                jsonString = await file.text();
            } else {
                // Fallback: Use input element
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.daq,.json';

                jsonString = await new Promise((resolve, reject) => {
                    input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return reject('No file selected');
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target?.result as string);
                        reader.onerror = (err) => reject(err);
                        reader.readAsText(file);
                    };
                    input.click();
                });
            }

            const project = JSON.parse(jsonString);
            if (!project.logic || !Array.isArray(project.logic.nodes)) {
                throw new Error('Invalid project file format');
            }

            // Map project nodes to ReactFlow nodes
            const newNodes = project.logic.nodes.map((pNode: any) => {
                const typeName = pNode.type.startsWith('daq:') ? pNode.type.split(':')[1] : pNode.type;
                const component = componentLibrary.find(c => c.type === typeName);

                if (!component) {
                    console.warn(`Unknown component type: ${typeName}`);
                }

                return {
                    id: pNode.id,
                    type: 'daqNode',
                    position: pNode.position || { x: 0, y: 0 },
                    draggable: true,
                    selectable: true,
                    selected: false,
                    data: {
                        label: pNode.label || (component?.name || typeName),
                        componentType: typeName,
                        category: component?.category || 'logic',
                        icon: component?.icon || '❓',
                        inputs: component?.inputs || [],
                        outputs: component?.outputs || [],
                        properties: { ...component?.defaultProperties, ...pNode.properties },
                    } as DAQNodeData,
                };
            });

            // Map project wires to ReactFlow edges
            const newEdges = (project.logic.wires || []).map((wire: any) => ({
                id: wire.id || uuidv4(),
                source: wire.source.nodeId,
                target: wire.target.nodeId,
                sourceHandle: wire.source.portId,
                targetHandle: wire.target.portId,
                type: 'smoothstep',
                animated: true,
            }));

            setNodes(newNodes);
            setEdges(newEdges);
            setSelectedNode(null);

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                alert('Failed to import project: ' + err.message);
            }
        }
    }, [setNodes, setEdges])

    const selectedNodeData = nodes.find((n) => n.id === selectedNode)

    // Get CSV file path from CSV Storage node
    const getCsvPath = () => {
        const csvNode = nodes.find((n: any) => n.data?.componentType === 'csv_storage');
        return csvNode?.data?.properties?.file_path || './data/output.csv';
    }

    // Editor View Component
    const EditorView = () => (
        <div className="app-container">
            <ComponentLibrary />

            <div className="canvas-container">
                <Toolbar
                    onExport={exportProject}
                    onImport={importProject}
                    onCompile={compileProject}
                    onDelete={deleteSelectedNode}
                    hasSelection={!!selectedNode}
                    isRunning={isRunning}
                    onToggleRun={toggleRun}
                    csvPath={getCsvPath()}
                />

                <div className="canvas-wrapper">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        isValidConnection={isValidConnection}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid={true}
                        snapGrid={[20, 20]}
                        nodesDraggable={true}
                        nodesConnectable={true}
                        elementsSelectable={true}
                        selectNodesOnDrag={true}
                        panOnDrag={[1, 2]}
                        minZoom={0.2}
                        maxZoom={4}
                        onlyRenderVisibleElements={false}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: false,
                        }}
                    >
                        <Background color="#2a2a4a" gap={20} />
                        <Controls />
                        <MiniMap
                            nodeColor={(node) => {
                                const category = (node.data as DAQNodeData).category
                                switch (category) {
                                    case 'device': return '#4a90d9'
                                    case 'logic': return '#9b59b6'
                                    case 'storage': return '#27ae60'
                                    case 'comm': return '#e67e22'
                                    default: return '#888'
                                }
                            }}
                            zoomable={true}
                            pannable={true}
                            nodeStrokeWidth={3}
                        />
                    </ReactFlow>
                </div>
            </div>

            <PropertyPanel
                node={selectedNodeData}
                onPropertyChange={updateNodeProperty}
            />
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Top Navigation Bar */}
            <div style={{
                height: 50,
                background: '#16213e',
                borderBottom: '1px solid #2a2a4a',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🚀</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>DAQ IDE</span>
                </div>

                <div style={{ display: 'flex', background: '#0f0f1a', borderRadius: 6, padding: 4 }}>
                    <button
                        onClick={() => setView('editor')}
                        style={{
                            background: view === 'editor' ? '#2a2a4a' : 'transparent',
                            color: view === 'editor' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setView('dashboard')}
                        style={{
                            background: view === 'dashboard' ? '#2a2a4a' : 'transparent',
                            color: view === 'dashboard' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        Dashboard
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={toggleRun}
                        style={{
                            background: isRunning ? '#e74c3c' : '#2ecc71',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 0 10px ' + (isRunning ? 'rgba(231, 76, 60, 0.4)' : 'rgba(46, 204, 113, 0.4)')
                        }}
                    >
                        {isRunning ? '🛑 STOP' : '▶️ RUN'}
                    </button>
                    <div style={{ width: 10 }}></div>
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                {view === 'editor' ? <EditorView /> : <Dashboard nodes={nodes} isRunning={isRunning} />}
                <DaqEngine nodes={nodes} isRunning={isRunning} />
            </div>
        </div>
    )
}

export default function AppWrapper() {
    return (
        <ReactFlowProvider>
            <App />
        </ReactFlowProvider>
    )
}

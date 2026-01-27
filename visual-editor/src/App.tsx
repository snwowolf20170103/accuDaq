import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
import NewProjectDialog from './components/NewProjectDialog'
import CodeView from './components/CodeView'
import { ComponentDefinition, DAQNodeData, DAQProject, DAQWidget, EditorMode } from './types'
import { v4 as uuidv4 } from 'uuid'
import componentLibrary from './data/componentLibrary'
import DataFlowEdge from './components/DataFlowEdge'

const nodeTypes = {
    daqNode: DAQNode,
}

const edgeTypes = {
    dataflow: DataFlowEdge,
}

const defaultEdgeOptions = {
    type: 'dataflow',
    animated: false,
};

const miniMapNodeColor = (node: any) => {
    const category = (node.data as unknown as DAQNodeData).category
    switch (category) {
        case 'device': return '#4a90d9'
        case 'logic': return '#9b59b6'
        case 'storage': return '#27ae60'
        case 'comm': return '#e67e22'
        default: return '#888'
    }
}

import DashboardDesigner from './components/DashboardDesigner'
import DevicePanel from './components/DevicePanel'
import AIChat from './components/AIChat'
import DaqEngine from './components/DaqEngine'
import FlowDesigner from './components/FlowDesigner'
import CICDPanel from './components/CICDPanel'
import { SettingsPanel } from './components/SettingsPanel'
// New imports for unintegrated components
import IndustryWidgets from './components/IndustryWidgets'
import BlocklyEditor from './components/BlocklyEditor'
import CommLogViewer from './components/CommLogViewer'
import DataReplayPanel from './components/DataReplayPanel'
import HistoryDataViewer from './components/HistoryDataViewer'
import TaskSchedulerPanel from './components/TaskSchedulerPanel'
// Debug and AI components
import DataFlowDebugger from './components/DataFlowDebugger'
import AIAssistantPanel from './components/AIAssistantPanel'
import GitPanel from './components/GitPanel'

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
    const [view, setView] = useState<'editor' | 'dashboard' | 'flowdesigner' | 'industry' | 'blockly' | 'commlog' | 'replay' | 'history' | 'scheduler'>('editor')
    const [editorMode, setEditorMode] = useState<EditorMode>('visual')
    const [isRunning, setIsRunning] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
    const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
    const [projectName, setProjectName] = useState<string>('Untitled Project')
    const [dashboardWidgets, setDashboardWidgets] = useState<DAQWidget[]>([])
    const [dashboardLayout, setDashboardLayout] = useState<any[]>([])
    const [dashboardEditMode, setDashboardEditMode] = useState(true)
    const [showDevicePanel, setShowDevicePanel] = useState(false)
    const [showAIChat, setShowAIChat] = useState(false)
    const [showCICDPanel, setShowCICDPanel] = useState(false)
    const [showSettingsPanel, setShowSettingsPanel] = useState(false)
    const [debugMode, setDebugMode] = useState(false)
    const [executingNodeId, setExecutingNodeId] = useState<string | null>(null)
    const [breakpoints, setBreakpoints] = useState<string[]>([])
    // Debug and AI panel states
    const [showDebugger, setShowDebugger] = useState(false)
    const [showAIAssistant, setShowAIAssistant] = useState(false)
    const [showGitPanel, setShowGitPanel] = useState(false)
    // Edge data for live visualization
    const [edgeDataMap, setEdgeDataMap] = useState<Record<string, any>>({})
    const [showEdgeData, setShowEdgeData] = useState(true)
    const { screenToFlowPosition, getZoom, getNode } = useReactFlow()

    // Live data visualization (Backend + Demo)
    useEffect(() => {
        if (!isRunning || !showEdgeData) {
            setEdgeDataMap({})
            return
        }

        // Check if we are in "Demo Mode" (pure frontend simulation)
        // We can use a heuristic: if we have never received backend data, maybe use simulation?
        // But better to just try fetching backend data first.

        let isPolling = true;

        // Start backend tracking if not already
        fetch('/api/edge/data/start', { method: 'POST' }).catch(err => console.warn('Debug start failed', err));

        const interval = setInterval(async () => {
            if (!isPolling) return;

            try {
                const res = await fetch('/api/edge/data');
                if (res.ok) {
                    const backendData = await res.json();

                    const newDataMap: Record<string, any> = {};
                    let hasBackendData = Object.keys(backendData).length > 0;

                    edges.forEach(edge => {
                        // 1. Try to find real data from backend
                        // Key format: source___sourceHandle___target___targetHandle
                        const key = `${edge.source}___${edge.sourceHandle || ''}___${edge.target}___${edge.targetHandle || ''}`;

                        if (backendData[key] !== undefined) {
                            newDataMap[edge.id] = backendData[key];
                        }
                        // 2. Fallback to simulation ONLY if we are in explicit Demo Mode (isDemoMode prop)
                        // But here we rely on the state. For now, if no backend data found, 
                        // we can simulate IF the user clicked the "Demo" button specifically.
                        // However, isRunning is shared. 
                        // Let's assume if backendData is empty, we MIGHT be in demo mode? 
                        // Actually, let's keep the Demo button behavior strictly for simulation
                        // and the Run button for real data.

                        // We need to know if this is a "Demo Run" or "Real Run".
                        // currently we don't distinguish in state.
                        // Let's use a simple trick: if the URL query param ?demo=true matches? No.

                        // For now: mixed mode. 
                        else if (!hasBackendData) {
                            // Simulation logic (fallback)
                            const sourceHandle = edge.sourceHandle || ''
                            let value: any
                            if (sourceHandle.includes('value') || sourceHandle.includes('result')) {
                                value = Math.round((Math.sin(Date.now() / 1000) + 1) * 50 * 100) / 100
                            } else if (sourceHandle.includes('alarm') || sourceHandle.includes('exceeded')) {
                                value = Math.random() > 0.7
                            } else if (sourceHandle.includes('data')) {
                                value = { temp: Math.round(Math.random() * 40), ts: Date.now() }
                            } else {
                                value = Math.round(Math.random() * 100 * 100) / 100
                            }
                            // Only apply simulation if we really suspect no backend is running
                            // But to avoid confusion, let's only do this if we are SURE.

                            // Let's strictly use the backend data if available. 
                            // If this was started via "Demo Data Flow" button, we want simulation.
                            // How to detect? 
                            // The "Demo Data Flow" button sets isRunning=true but doesn't call /api/engine/start
                            // So we can check if the engine is running?
                        }
                    })

                    // If we have backend data, prioritize it. 
                    // If backend data is empty, check if we should simulate.
                    // We will allow the "Demo Button" simulation logic to run 
                    // if NO backend data is present.

                    if (hasBackendData) {
                        setEdgeDataMap(prev => ({ ...prev, ...newDataMap }));
                    } else {
                        // Check if we should simulate (if enabled via Demo button)
                        const simMap: Record<string, any> = {};
                        edges.forEach(edge => {
                            const sourceHandle = edge.sourceHandle || ''
                            let value: any
                            if (sourceHandle.includes('value') || sourceHandle.includes('result')) {
                                value = Math.round((Math.sin(Date.now() / 1000) + 1) * 50 * 100) / 100
                            } else if (sourceHandle.includes('alarm')) {
                                value = Math.random() > 0.7
                            } else {
                                value = Math.round(Math.random() * 100);
                            }
                            simMap[edge.id] = value;
                        });
                        // Only set sim map if we think we are in demo mode (no backend updates)
                        // This is a bit Hacky but smooth.
                        setEdgeDataMap(simMap);
                    }
                }
            } catch (e) {
                console.warn('Poll error', e);
            }
        }, 500);

        return () => {
            isPolling = false;
            clearInterval(interval);
        }
    }, [isRunning, showEdgeData, edges])

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type })
    }, [])

    // Load from localStorage on initialization
    useEffect(() => {
        const savedProject = localStorage.getItem('daq-project')
        if (savedProject) {
            try {
                const project = JSON.parse(savedProject)
                setProjectName(project.meta?.name || 'Untitled Project')
                setDashboardWidgets(project.ui?.widgets || [])
                setDashboardLayout(project.ui?.layout || [])
            } catch (e) {
                console.warn('Failed to parse saved project meta')
            }
        }

        const savedNodes = localStorage.getItem('daq-nodes')
        const savedEdges = localStorage.getItem('daq-edges')
        if (savedNodes) {
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

    // Auto-save with debounce - saves complete project state
    useEffect(() => {
        const saveTimer = setTimeout(() => {
            // Save nodes and edges
            localStorage.setItem('daq-nodes', JSON.stringify(nodes))
            localStorage.setItem('daq-edges', JSON.stringify(edges))

            // Save complete project
            const project: DAQProject = {
                meta: {
                    name: projectName,
                    version: '1.0.0',
                    schemaVersion: '2.0.0',
                    modifiedAt: new Date().toISOString()
                },
                settings: {
                    debugMode,
                    autoSave: true
                },
                devices: [],
                logic: {
                    nodes: nodes.map(n => ({
                        id: n.id,
                        type: `daq:${(n.data as any).componentType}`,
                        label: (n.data as any).label,
                        position: n.position,
                        properties: (n.data as any).properties || {}
                    })),
                    wires: edges.map(e => ({
                        id: e.id,
                        source: { nodeId: e.source, portId: e.sourceHandle || '' },
                        target: { nodeId: e.target, portId: e.targetHandle || '' }
                    }))
                },
                ui: {
                    widgets: dashboardWidgets,
                    layout: dashboardLayout as any
                }
            }
            localStorage.setItem('daq-project', JSON.stringify(project))

            console.log('Project auto-saved at', new Date().toLocaleTimeString())
        }, 2000) // 2 second debounce

        return () => clearTimeout(saveTimer)
    }, [nodes, edges, projectName, debugMode, dashboardWidgets, dashboardLayout])

    // State for project management
    const [showProjectList, setShowProjectList] = useState(false)
    const [recentProjects, setRecentProjects] = useState<{ fileName: string; name: string; modifiedAt: string }[]>([])

    // Save project to file
    const saveProjectToFile = useCallback(async () => {
        const project: DAQProject = {
            meta: {
                name: projectName,
                version: '1.0.0',
                schemaVersion: '2.0.0',
                modifiedAt: new Date().toISOString()
            },
            settings: {
                debugMode,
                autoSave: true
            },
            devices: [],
            logic: {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: `daq:${(n.data as any).componentType}`,
                    label: (n.data as any).label,
                    position: n.position,
                    properties: (n.data as any).properties || {}
                })),
                wires: edges.map(e => ({
                    id: e.id,
                    source: { nodeId: e.source, portId: e.sourceHandle || '' },
                    target: { nodeId: e.target, portId: e.targetHandle || '' }
                }))
            },
            ui: {
                widgets: dashboardWidgets,
                layout: dashboardLayout as any
            }
        }

        try {
            const response = await fetch('/api/project/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: projectName, project })
            })
            const result = await response.json()
            if (response.ok) {
                showToast(`项目已保存: ${result.fileName}`, 'success')
            } else {
                showToast(`保存失败: ${result.error}`, 'error')
            }
        } catch (err: any) {
            showToast(`保存失败: ${err.message}`, 'error')
        }
    }, [nodes, edges, projectName, debugMode, dashboardWidgets, dashboardLayout, showToast])

    // Load project from file
    const loadProjectFromFile = useCallback(async (fileName: string) => {
        try {
            const response = await fetch(`/api/project/load?file=${encodeURIComponent(fileName)}`)
            const result = await response.json()
            if (response.ok && result.project) {
                const project = result.project
                setProjectName(project.name || project.meta?.name || 'Untitled')
                setDebugMode(project.settings?.debugMode || false)
                setDashboardWidgets(project.ui?.widgets || [])
                setDashboardLayout(project.ui?.layout || [])

                // Restore nodes
                if (project.logic?.nodes) {
                    const restoredNodes = project.logic.nodes.map((pNode: any) => {
                        const typeName = pNode.type.startsWith('daq:') ? pNode.type.split(':')[1] : pNode.type
                        const component = componentLibrary.find(c => c.type === typeName)
                        return {
                            id: pNode.id,
                            type: 'daqNode',
                            position: pNode.position,
                            data: {
                                label: pNode.label || component?.name || typeName,
                                componentType: typeName,
                                icon: component?.icon || '⚙️',
                                inputs: component?.inputs || [],
                                outputs: component?.outputs || [],
                                properties: { ...(component?.defaultProperties || {}), ...pNode.properties }
                            }
                        }
                    })
                    setNodes(restoredNodes)
                }

                // Restore edges
                if (project.logic?.wires) {
                    const restoredEdges = project.logic.wires.map((wire: any) => ({
                        id: wire.id,
                        source: wire.source.nodeId,
                        target: wire.target.nodeId,
                        sourceHandle: wire.source.portId,
                        targetHandle: wire.target.portId
                    }))
                    setEdges(restoredEdges)
                }

                setShowProjectList(false)
                showToast(`项目已加载: ${project.name || fileName}`, 'success')
            } else {
                showToast(`加载失败: ${result.error}`, 'error')
            }
        } catch (err: any) {
            showToast(`加载失败: ${err.message}`, 'error')
        }
    }, [setNodes, setEdges, showToast])

    // Fetch recent projects list
    const fetchRecentProjects = useCallback(async () => {
        try {
            const response = await fetch('/api/projects')
            const result = await response.json()
            if (response.ok) {
                setRecentProjects(result.projects || [])
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err)
        }
    }, [])

    // Delete project
    const deleteProject = useCallback(async (fileName: string) => {
        if (!confirm(`确定要删除项目 "${fileName}" 吗？此操作不可恢复。`)) return

        try {
            const response = await fetch(`/api/project/delete?file=${encodeURIComponent(fileName)}`, {
                method: 'DELETE'
            })
            if (response.ok) {
                showToast('项目已删除', 'success')
                fetchRecentProjects()
            } else {
                const result = await response.json()
                showToast(`删除失败: ${result.error}`, 'error')
            }
        } catch (err: any) {
            showToast(`删除失败: ${err.message}`, 'error')
        }
    }, [showToast, fetchRecentProjects])

    // Rename project state and function
    const [renameDialog, setRenameDialog] = useState<{ show: boolean; fileName: string; currentName: string }>({ show: false, fileName: '', currentName: '' })
    const [newProjectName, setNewProjectName] = useState('')

    const renameProject = useCallback(async () => {
        if (!newProjectName.trim()) {
            showToast('请输入新名称', 'error')
            return
        }

        try {
            const response = await fetch('/api/project/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldFile: renameDialog.fileName, newName: newProjectName.trim() })
            })
            if (response.ok) {
                showToast('项目已重命名', 'success')
                setRenameDialog({ show: false, fileName: '', currentName: '' })
                setNewProjectName('')
                fetchRecentProjects()
            } else {
                const result = await response.json()
                showToast(`重命名失败: ${result.error}`, 'error')
            }
        } catch (err: any) {
            showToast(`重命名失败: ${err.message}`, 'error')
        }
    }, [newProjectName, renameDialog.fileName, showToast, fetchRecentProjects])

    // Duplicate project
    const duplicateProject = useCallback(async (sourceFile: string, sourceName: string) => {
        const newName = prompt('请输入新项目名称:', `${sourceName}_copy`)
        if (!newName) return

        try {
            const response = await fetch('/api/project/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceFile, newName: newName.trim() })
            })
            if (response.ok) {
                showToast('项目已复制', 'success')
                fetchRecentProjects()
            } else {
                const result = await response.json()
                showToast(`复制失败: ${result.error}`, 'error')
            }
        } catch (err: any) {
            showToast(`复制失败: ${err.message}`, 'error')
        }
    }, [showToast, fetchRecentProjects])

    // Download saved project from server
    const downloadSavedProject = useCallback((fileName: string) => {
        const link = document.createElement('a')
        link.href = `/api/project/export?file=${encodeURIComponent(fileName)}`
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('项目已导出', 'success')
    }, [showToast])

    // Import project (upload)
    const importProjectRef = useRef<HTMLInputElement>(null)
    const handleImportProject = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            const content = await file.text()
            const response = await fetch('/api/project/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: content
            })
            if (response.ok) {
                showToast('项目已导入', 'success')
                fetchRecentProjects()
            } else {
                const result = await response.json()
                showToast(`导入失败: ${result.error}`, 'error')
            }
        } catch (err: any) {
            showToast(`导入失败: ${err.message}`, 'error')
        }

        // Reset input
        if (importProjectRef.current) {
            importProjectRef.current.value = ''
        }
    }, [showToast, fetchRecentProjects])

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

        const sourceNode = getNode(source);
        const targetNode = getNode(target);

        if (!sourceNode || !targetNode) return false;

        // Find port definitions
        const sourcePort = (sourceNode.data as unknown as DAQNodeData).outputs?.find(
            (p: any) => p.id === sourceHandle
        );
        const targetPort = (targetNode.data as unknown as DAQNodeData).inputs?.find(
            (p: any) => p.id === targetHandle
        );

        if (!sourcePort || !targetPort) {
            // console.warn('Port not found:', sourceHandle, targetHandle);
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

        // console.warn(`Type mismatch: ${sourceType} -> ${targetType}`);
        return false;
    }, [getNode]);

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

            const dataString = event.dataTransfer.getData('application/daq-component')
            if (!dataString) return

            let component: ComponentDefinition
            let offset = { x: 0, y: 0 }

            try {
                const parsedData = JSON.parse(dataString)
                if (parsedData.component && parsedData.offset) {
                    component = parsedData.component
                    offset = parsedData.offset
                } else {
                    // Fallback for old Format or direct component data
                    component = parsedData
                    // Default offset if not provided (center of a theoretical 200x100 node)
                    offset = { x: 100, y: 50 }
                }
            } catch (err) {
                console.error("Failed to parse drag data", err)
                return
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            })

            // Adjust position based on offset and current zoom level
            const zoom = getZoom()
            const correctedX = position.x - (offset.x / zoom)
            const correctedY = position.y - (offset.y / zoom)

            const newNode = {
                id: uuidv4(),
                type: 'daqNode',
                position: {
                    x: correctedX,
                    y: correctedY,
                },
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
        [setNodes, screenToFlowPosition, getZoom]
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
                name: projectName,
                version: "1.0.0",
                schemaVersion: "2.0.0"
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
            ui: { widgets: dashboardWidgets }
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
    }, [nodes, edges, dashboardWidgets, projectName])

    const exportProject = useCallback(async () => {
        const project = {
            meta: {
                name: projectName,
                version: "1.0.0",
                schemaVersion: "2.0.0"
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
            ui: { widgets: dashboardWidgets }
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
    }, [nodes, edges, dashboardWidgets, projectName])

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

            setProjectName(project.meta?.name || 'Untitled Project')
            setDashboardWidgets(project.ui?.widgets || [])

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

    // Handle new project creation from template
    const handleCreateProject = useCallback((project: DAQProject) => {
        setProjectName(project.meta.name)
        setDashboardWidgets(project.ui?.widgets || [])

        // Convert project nodes to ReactFlow nodes
        const newNodes = project.logic.nodes.map((pNode) => {
            const typeName = pNode.type.startsWith('daq:') ? pNode.type.split(':')[1] : pNode.type
            const component = componentLibrary.find(c => c.type === typeName)

            return {
                id: pNode.id,
                type: 'daqNode',
                position: pNode.position,
                draggable: true,
                selectable: true,
                selected: false,
                data: {
                    label: pNode.label || component?.name || typeName,
                    componentType: typeName,
                    category: component?.category || 'logic',
                    icon: component?.icon || '❓',
                    inputs: component?.inputs || [],
                    outputs: component?.outputs || [],
                    properties: { ...component?.defaultProperties, ...pNode.properties },
                } as DAQNodeData,
            }
        })

        // Convert project wires to ReactFlow edges
        const newEdges = project.logic.wires.map((wire) => ({
            id: wire.id,
            source: wire.source.nodeId,
            target: wire.target.nodeId,
            sourceHandle: wire.source.portId,
            targetHandle: wire.target.portId,
            type: 'smoothstep',
            animated: true,
        }))

        setNodes(newNodes)
        setEdges(newEdges)
        setSelectedNode(null)

        // Save project meta to localStorage
        localStorage.setItem('daq-project', JSON.stringify(project))

        showToast(`Project "${project.meta.name}" created!`, 'success')
    }, [setNodes, setEdges, showToast])

    // Toggle debug mode with backend sync
    const toggleDebugMode = useCallback(async () => {
        const newMode = !debugMode
        setDebugMode(newMode)

        try {
            if (newMode) {
                await fetch('/api/debug/enable', { method: 'POST' })
            } else {
                await fetch('/api/debug/disable', { method: 'POST' })
                setExecutingNodeId(null)
            }
        } catch (err) {
            console.warn('Failed to sync debug mode with backend:', err)
        }
    }, [debugMode])

    // Toggle breakpoint on a node with backend sync
    const toggleBreakpoint = useCallback(async (nodeId: string) => {
        setBreakpoints(prev => {
            if (prev.includes(nodeId)) {
                return prev.filter(id => id !== nodeId)
            }
            return [...prev, nodeId]
        })

        // Sync with backend
        try {
            await fetch('/api/debug/breakpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodeId })
            })
        } catch (err) {
            console.warn('Failed to sync breakpoint with backend:', err)
        }
    }, [])

    // Poll debug state from backend when running in debug mode
    useEffect(() => {
        if (!debugMode || !isRunning) return

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/debug/state')
                if (response.ok) {
                    const state = await response.json()
                    if (state.executing_node) {
                        setExecutingNodeId(state.executing_node)
                    }
                }
            } catch (err) {
                // Ignore polling errors
            }
        }, 500)

        return () => clearInterval(pollInterval)
    }, [debugMode, isRunning])

    // Continue from breakpoint
    const continueFromBreakpoint = useCallback(async () => {
        try {
            await fetch('/api/debug/continue', { method: 'POST' })
            setExecutingNodeId(null)
        } catch (err) {
            console.warn('Failed to continue from breakpoint:', err)
        }
    }, [])

    // Create nodes with debug properties injected
    const nodesWithDebug = useMemo(() => {
        if (!debugMode) return nodes

        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                debugMode: true,
                isExecuting: executingNodeId === node.id,
                hasBreakpoint: breakpoints.includes(node.id),
                portValues: {}, // Would be populated from backend in real implementation
                onToggleBreakpoint: () => toggleBreakpoint(node.id)
            }
        }))
    }, [nodes, debugMode, executingNodeId, breakpoints, toggleBreakpoint])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }} className={debugMode ? 'debug-mode' : ''}>
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* New Project Dialog */}
            <NewProjectDialog
                isOpen={showNewProjectDialog}
                onClose={() => setShowNewProjectDialog(false)}
                onCreateProject={handleCreateProject}
            />

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 20 }}>🚀</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>DAQ IDE</span>
                    <span style={{ color: '#888', fontSize: 13 }}>|</span>
                    <span style={{ color: '#4a90d9', fontSize: 14, fontWeight: 500 }}>{projectName}</span>
                    <button
                        onClick={() => setShowNewProjectDialog(true)}
                        style={{
                            background: '#2a2a4a',
                            border: 'none',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                        }}
                    >
                        + New
                    </button>
                    <button
                        onClick={saveProjectToFile}
                        title="保存项目到文件"
                        style={{
                            background: '#2a2a4a',
                            border: 'none',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                        }}
                    >
                        💾 Save
                    </button>
                    <button
                        onClick={() => { fetchRecentProjects(); setShowProjectList(true) }}
                        title="打开已保存的项目"
                        style={{
                            background: '#2a2a4a',
                            border: 'none',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                        }}
                    >
                        📂 Open
                    </button>
                </div>

                <div style={{ display: 'flex', background: '#0f0f1a', borderRadius: 6, padding: 4 }}>
                    <button
                        onClick={() => { setView('editor'); setEditorMode('visual') }}
                        style={{
                            background: view === 'editor' && editorMode === 'visual' ? '#2a2a4a' : 'transparent',
                            color: view === 'editor' && editorMode === 'visual' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        📊 Visual
                    </button>
                    <button
                        onClick={() => { setView('editor'); setEditorMode('code') }}
                        style={{
                            background: view === 'editor' && editorMode === 'code' ? '#2a2a4a' : 'transparent',
                            color: view === 'editor' && editorMode === 'code' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        💻 Code
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
                    <button
                        onClick={() => setView('flowdesigner')}
                        style={{
                            background: view === 'flowdesigner' ? '#2a2a4a' : 'transparent',
                            color: view === 'flowdesigner' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        🔧 流程
                    </button>
                    <button
                        onClick={() => setView('industry')}
                        style={{
                            background: view === 'industry' ? '#2a2a4a' : 'transparent',
                            color: view === 'industry' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        🏭 工业控件
                    </button>
                    <button
                        onClick={() => setView('blockly')}
                        style={{
                            background: view === 'blockly' ? '#2a2a4a' : 'transparent',
                            color: view === 'blockly' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        🧩 Blockly
                    </button>
                    <button
                        onClick={() => setView('commlog')}
                        style={{
                            background: view === 'commlog' ? '#2a2a4a' : 'transparent',
                            color: view === 'commlog' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        📡 通信日志
                    </button>
                    <button
                        onClick={() => setView('replay')}
                        style={{
                            background: view === 'replay' ? '#2a2a4a' : 'transparent',
                            color: view === 'replay' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        ⏪ 数据回放
                    </button>
                    <button
                        onClick={() => setView('history')}
                        style={{
                            background: view === 'history' ? '#2a2a4a' : 'transparent',
                            color: view === 'history' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        📊 历史数据
                    </button>
                    <button
                        onClick={() => setView('scheduler')}
                        style={{
                            background: view === 'scheduler' ? '#2a2a4a' : 'transparent',
                            color: view === 'scheduler' ? '#fff' : '#888',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        ⏰ 任务调度
                    </button>
                    {view === 'dashboard' && (
                        <button
                            onClick={() => setDashboardEditMode(!dashboardEditMode)}
                            style={{
                                background: dashboardEditMode ? '#4fc3f7' : '#3c3c3c',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: 12,
                                marginLeft: 8,
                            }}
                        >
                            {dashboardEditMode ? '🔓 编辑中' : '🔒 已锁定'}
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Debug Mode Toggle */}
                    {view === 'editor' && editorMode === 'visual' && (
                        <button
                            onClick={() => setShowDevicePanel(!showDevicePanel)}
                            style={{
                                background: showDevicePanel ? '#9b59b6' : '#2a2a4a',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 500,
                                fontSize: 12,
                            }}
                        >
                            📡 {showDevicePanel ? '组件库' : '设备'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowAIAssistant(!showAIAssistant)}
                        style={{
                            background: showAIAssistant ? '#9b59b6' : '#2a2a4a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 12,
                        }}
                    >
                        🤖 AI 助手
                    </button>
                    <button
                        onClick={() => setShowDebugger(!showDebugger)}
                        style={{
                            background: showDebugger ? '#3498db' : '#2a2a4a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 12,
                        }}
                        title="数据流调试器"
                    >
                        🔍 调试器
                    </button>
                    <button
                        onClick={toggleDebugMode}
                        style={{
                            background: debugMode ? '#e67e22' : '#2a2a4a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                        title={debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
                    >
                        🐛 {debugMode ? 'Debug ON' : 'Debug'}
                    </button>
                    <button
                        onClick={() => setShowCICDPanel(true)}
                        style={{
                            background: '#2a2a4a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 12,
                        }}
                    >
                        🔧 CI/CD
                    </button>
                    <button
                        onClick={() => setShowGitPanel(!showGitPanel)}
                        style={{
                            background: showGitPanel ? '#f1502f' : '#2a2a4a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 12,
                        }}
                    >
                        📦 Git
                    </button>
                    <button
                        onClick={() => setShowSettingsPanel(true)}
                        style={{
                            background: '#2a2a4a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: 12,
                        }}
                    >
                        ⚙️ 设置
                    </button>

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
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                {view === 'editor' ? (
                    editorMode === 'visual' ? (
                        <div className="app-container">
                            {showDevicePanel ? (
                                <DevicePanel />
                            ) : (
                                <ComponentLibrary />
                            )}

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
                                    onDemoMode={() => {
                                        if (isRunning) {
                                            // Stop demo
                                            setIsRunning(false)
                                            setShowEdgeData(false)
                                        } else {
                                            // Start demo
                                            setIsRunning(true)
                                            setShowEdgeData(true)
                                        }
                                    }}
                                    isDemoMode={isRunning}
                                />

                                <div className="canvas-wrapper">
                                    <ReactFlow
                                        nodes={nodesWithDebug}
                                        edges={edges.map(e => ({
                                            ...e,
                                            data: {
                                                ...e.data,
                                                value: edgeDataMap[e.id],
                                                showValue: showEdgeData && isRunning
                                            }
                                        }))}
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
                                            style={{
                                                backgroundColor: '#0f0f1a',
                                                height: 150,
                                                width: 200
                                            }}
                                            zoomable
                                            pannable
                                        />
                                    </ReactFlow>
                                </div>

                                {/* Debug Info Panel */}
                                {debugMode && (
                                    <div style={{
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
                                    }}>
                                        🐛 Debug Mode Active | Breakpoints: {breakpoints.length} | {executingNodeId ? `Executing: ${executingNodeId}` : 'Idle'}
                                        {executingNodeId && (
                                            <button
                                                onClick={continueFromBreakpoint}
                                                style={{
                                                    marginLeft: 12,
                                                    background: '#27ae60',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: 4,
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                ▶️ Continue
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Edge Data Visualization Toggle */}
                                {isRunning && (
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
                                        onClick={() => setShowEdgeData(!showEdgeData)}
                                    >
                                        {showEdgeData ? '📊' : '📉'} Data Flow: {showEdgeData ? 'ON' : 'OFF'}
                                    </div>
                                )}
                            </div>

                            <PropertyPanel
                                node={selectedNodeData}
                                onPropertyChange={updateNodeProperty}
                            />
                        </div>
                    ) : (
                        <CodeView
                            nodes={nodes}
                            edges={edges}
                            onBack={() => setEditorMode('visual')}
                        />
                    )
                ) : view === 'dashboard' ? (
                    <DashboardDesigner
                        editMode={dashboardEditMode}
                        isRunning={isRunning}
                        widgets={dashboardWidgets as any}
                        layout={dashboardLayout}
                        availableOutputs={nodes.flatMap(node => {
                            const nodeData = node.data as any
                            return (nodeData.outputs || []).map((output: any) => ({
                                nodeId: node.id,
                                nodeLabel: nodeData.label || node.id,
                                portId: output.id,
                                portName: output.name
                            }))
                        })}
                        onWidgetsChange={(newWidgets) => {
                            setDashboardWidgets(newWidgets as any)
                            // Save to localStorage
                            const savedProject = localStorage.getItem('daq-project')
                            if (savedProject) {
                                const project = JSON.parse(savedProject)
                                project.ui = { ...project.ui, widgets: newWidgets }
                                localStorage.setItem('daq-project', JSON.stringify(project))
                            }
                        }}
                        onLayoutChange={(newLayout) => {
                            setDashboardLayout(newLayout)
                            // Save to localStorage
                            const savedProject = localStorage.getItem('daq-project')
                            if (savedProject) {
                                const project = JSON.parse(savedProject)
                                project.ui = { ...project.ui, layout: newLayout }
                                localStorage.setItem('daq-project', JSON.stringify(project))
                            }
                        }}
                    />
                ) : view === 'flowdesigner' ? (
                    <FlowDesigner
                        onFlowChange={(flow) => {
                            console.log('Flow updated:', flow)
                            // Could save to project state here
                        }}
                        onNodeSelect={(node) => {
                            console.log('Node selected:', node)
                        }}
                    />
                ) : view === 'industry' ? (
                    <IndustryWidgets />
                ) : view === 'blockly' ? (
                    <BlocklyEditor />
                ) : view === 'commlog' ? (
                    <CommLogViewer onClose={() => setView('flowdesigner')} />
                ) : view === 'replay' ? (
                    <DataReplayPanel />
                ) : view === 'history' ? (
                    <HistoryDataViewer />
                ) : view === 'scheduler' ? (
                    <TaskSchedulerPanel />
                ) : null}
                <DaqEngine nodes={nodes} isRunning={isRunning} />
            </div>

            {/* AI Chat Panel */}
            <AIChat
                isOpen={showAIChat}
                onClose={() => setShowAIChat(false)}
                projectContext={{
                    nodes,
                    edges,
                    projectName
                }}
            />

            {/* CI/CD Panel */}
            <CICDPanel
                isOpen={showCICDPanel}
                onClose={() => setShowCICDPanel(false)}
            />

            {/* Settings Panel */}
            {showSettingsPanel && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: '#1e1e2e',
                        borderRadius: 16,
                        padding: 24,
                        maxWidth: 600,
                        maxHeight: '80vh',
                        overflow: 'auto',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => setShowSettingsPanel(false)}
                            style={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: '#fff',
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                cursor: 'pointer',
                            }}
                        >
                            ✕
                        </button>
                        <SettingsPanel />
                    </div>
                </div>
            )}

            {/* Project List Dialog */}
            {showProjectList && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        background: '#1e1e2e',
                        borderRadius: 16,
                        padding: 24,
                        minWidth: 600,
                        maxWidth: 800,
                        maxHeight: '80vh',
                        overflow: 'auto',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ color: '#fff', margin: 0 }}>📂 项目管理</h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    ref={importProjectRef}
                                    type="file"
                                    accept=".daq,.json"
                                    onChange={handleImportProject}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    onClick={() => importProjectRef.current?.click()}
                                    style={{
                                        background: '#27ae60',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: 12,
                                    }}
                                >
                                    📤 导入
                                </button>
                                <button
                                    onClick={() => setShowProjectList(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: 'none',
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {recentProjects.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: 40 }}>
                                暂无已保存的项目
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {recentProjects.map((project) => (
                                    <div
                                        key={project.fileName}
                                        style={{
                                            background: '#2a2a4a',
                                            padding: '12px 16px',
                                            borderRadius: 8,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div
                                            style={{ flex: 1, cursor: 'pointer' }}
                                            onClick={() => loadProjectFromFile(project.fileName)}
                                        >
                                            <div style={{ color: '#fff', fontWeight: 500 }}>{project.name}</div>
                                            <div style={{ color: '#888', fontSize: 12 }}>
                                                {project.fileName} · {new Date(project.modifiedAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setRenameDialog({ show: true, fileName: project.fileName, currentName: project.name }); setNewProjectName(project.name); }}
                                                title="重命名"
                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); duplicateProject(project.fileName, project.name); }}
                                                title="复制"
                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                                            >
                                                📋
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); downloadSavedProject(project.fileName); }}
                                                title="下载"
                                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                                            >
                                                📥
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteProject(project.fileName); }}
                                                title="删除"
                                                style={{ background: 'rgba(231,76,60,0.3)', border: 'none', color: '#e74c3c', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Rename Dialog */}
            {renameDialog.show && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                }}>
                    <div style={{
                        background: '#1e1e2e',
                        borderRadius: 12,
                        padding: 24,
                        minWidth: 400,
                    }}>
                        <h3 style={{ color: '#fff', margin: '0 0 16px 0' }}>重命名项目</h3>
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="输入新名称"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: '#2a2a4a',
                                border: '1px solid #3a3a5a',
                                borderRadius: 6,
                                color: '#fff',
                                fontSize: 14,
                                boxSizing: 'border-box',
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') renameProject(); }}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setRenameDialog({ show: false, fileName: '', currentName: '' })}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                            >
                                取消
                            </button>
                            <button
                                onClick={renameProject}
                                style={{ background: '#3498db', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
                            >
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Flow Debugger Panel */}
            <DataFlowDebugger
                isOpen={showDebugger}
                onClose={() => setShowDebugger(false)}
                isRunning={false}
                nodes={nodes}
                edges={edges}
                executingNodeId={executingNodeId}
                breakpoints={breakpoints}
                onToggleBreakpoint={(nodeId) => {
                    setBreakpoints(prev =>
                        prev.includes(nodeId)
                            ? prev.filter(id => id !== nodeId)
                            : [...prev, nodeId]
                    )
                }}
                onStepOver={() => { /* TODO: Implement step over */ }}
                onContinue={() => { /* TODO: Implement continue */ }}
                onPause={() => { /* TODO: Implement pause */ }}
            />

            {/* AI Assistant Panel */}
            <AIAssistantPanel
                isOpen={showAIAssistant}
                onClose={() => setShowAIAssistant(false)}
                projectContext={{
                    nodes,
                    edges,
                    projectName,
                }}
                onAddComponent={(suggestion) => {
                    // Add suggested component to canvas
                    const newNode = {
                        id: `${suggestion.type}-${Date.now()}`,
                        type: 'daqNode',
                        position: { x: 400, y: 300 },
                        data: {
                            label: suggestion.name,
                            componentType: suggestion.type,
                            category: suggestion.category,
                            icon: suggestion.icon,
                            inputs: [],
                            outputs: [],
                            properties: suggestion.properties || {},
                        },
                    }
                    setNodes(nds => [...nds, newNode])
                    showToast(`已添加 ${suggestion.name}`, 'success')
                }}
                onApplyCode={(code, nodeId) => {
                    // Apply generated code to custom script node
                    if (nodeId) {
                        setNodes(nds => nds.map(n => {
                            if (n.id === nodeId) {
                                return {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        properties: {
                                            ...n.data.properties,
                                            generatedCode: code,
                                        }
                                    }
                                }
                            }
                            return n
                        }))
                    }
                    showToast('代码已应用', 'success')
                }}
            />

            {/* Git Panel */}
            <GitPanel
                isOpen={showGitPanel}
                onClose={() => setShowGitPanel(false)}
            />
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

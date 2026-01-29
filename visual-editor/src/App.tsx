import { useState, useCallback, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import {
    addEdge,
    useNodesState,
    useEdgesState,
    useReactFlow,
    Connection,
    Edge,
    ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import NewProjectDialog from './components/NewProjectDialog'
import SaveProjectDialog from './components/SaveProjectDialog'
import { ComponentDefinition, DAQNodeData, DAQProject, DAQWidget, EditorMode } from './types'
import { v4 as uuidv4 } from 'uuid'
import componentLibrary from './data/componentLibrary'

// Lazy-loaded components for code splitting
const DevicePanel = lazy(() => import('./components/DevicePanel'))
const AIChat = lazy(() => import('./components/AIChat'))
const DaqEngine = lazy(() => import('./components/DaqEngine'))
const CICDPanel = lazy(() => import('./components/CICDPanel'))
const DataFlowDebugger = lazy(() => import('./components/DataFlowDebugger'))
const AIAssistantPanel = lazy(() => import('./components/AIAssistantPanel'))
const GitPanel = lazy(() => import('./components/GitPanel'))

import { SettingsPanel } from './components/SettingsPanel'
import { I18nProvider } from './i18n'
import { useEdgeData, startEdgeDataTracking } from './hooks/useEdgeData'
import { useHistory } from './hooks/useHistory'
import { useClipboard } from './hooks/useClipboard'
import { TopNavBar, PanelsContainer } from './components/layout'



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
    const [showSaveDialog, setShowSaveDialog] = useState(false)
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
    const [showEdgeData, setShowEdgeData] = useState(true)
    const { screenToFlowPosition, getZoom, getNode } = useReactFlow()

    // Live data visualization using SWR (replaces manual polling)
    const { edgeDataMap, error: edgeDataError } = useEdgeData(edges, {
        enabled: isRunning && showEdgeData,
        refreshInterval: 500,
    })

    // Undo/Redo & Clipboard Hooks
    const { undo, redo, canUndo, canRedo } = useHistory(nodes, edges)
    const { copy, paste } = useClipboard()

    const handleUndo = useCallback(() => {
        const previousState = undo()
        if (previousState) {
            setNodes(previousState.nodes)
            setEdges(previousState.edges)
        }
    }, [undo, setNodes, setEdges])

    const handleRedo = useCallback(() => {
        const nextState = redo()
        if (nextState) {
            setNodes(nextState.nodes)
            setEdges(nextState.edges)
        }
    }, [redo, setNodes, setEdges])

    const handleCopy = useCallback(() => {
        copy(nodes, edges)
    }, [copy, nodes, edges])

    const handlePaste = useCallback(() => {
        const result = paste(nodes, edges, screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
        if (result) {
            setNodes(result.nodes)
            setEdges(result.edges)
        }
    }, [paste, nodes, edges, screenToFlowPosition, setNodes, setEdges])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault()
                        if (e.shiftKey) handleRedo(); else handleUndo();
                        break
                    case 'y':
                        e.preventDefault()
                        handleRedo()
                        break
                    case 'c':
                        e.preventDefault()
                        handleCopy()
                        break
                    case 'v':
                        e.preventDefault()
                        handlePaste()
                        break
                    case 'e':
                        // LabVIEW-style: Ctrl+E toggles between Front Panel and Block Diagram
                        e.preventDefault()
                        if (view === 'dashboard') {
                            setView('editor')
                            setEditorMode('visual')
                        } else {
                            setView('dashboard')
                        }
                        break
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleUndo, handleRedo, handleCopy, handlePaste, view])



    // Start edge data tracking when running starts
    useEffect(() => {
        if (isRunning && showEdgeData) {
            startEdgeDataTracking()
        }
    }, [isRunning, showEdgeData])

    // Log edge data errors
    useEffect(() => {
        if (edgeDataError) {
            console.warn('Edge data fetch error:', edgeDataError)
        }
    }, [edgeDataError])

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
    const saveProjectToFile = useCallback(async (targetName?: string) => {
        const nameToUse = targetName || projectName
        const project: DAQProject = {
            meta: {
                name: nameToUse,
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
                body: JSON.stringify({ name: nameToUse, project })
            })
            const result = await response.json()
            if (response.ok) {
                if (targetName) {
                    setProjectName(targetName.replace(/\.daq$/i, ''))
                }
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

    // Optimization: Pre-compute port lookups for O(1) access during connection validation
    const nodePortMap = useMemo(() => {
        const map = new Map<string, { inputs: Map<string, any>, outputs: Map<string, any> }>()
        nodes.forEach(node => {
            const data = node.data as unknown as DAQNodeData
            map.set(node.id, {
                inputs: new Map((data.inputs || []).map(p => [p.id, p])),
                outputs: new Map((data.outputs || []).map(p => [p.id, p]))
            })
        })
        return map
    }, [nodes])

    // Connection validation: check port type compatibility
    const isValidConnection = useCallback((connection: Edge | Connection) => {
        const sourceId = connection.source
        const targetId = connection.target
        const sourceHandle = connection.sourceHandle
        const targetHandle = connection.targetHandle

        if (!sourceId || !targetId || !sourceHandle || !targetHandle) return false

        // Fast O(1) lookup using memoized map
        const sourceNodePorts = nodePortMap.get(sourceId)
        const targetNodePorts = nodePortMap.get(targetId)

        if (!sourceNodePorts || !targetNodePorts) return false

        const sourcePort = sourceNodePorts.outputs.get(sourceHandle)
        const targetPort = targetNodePorts.inputs.get(targetHandle)

        if (!sourcePort || !targetPort) {
            return false
        }

        // Type compatibility rules
        const sourceType = sourcePort.type
        const targetType = targetPort.type

        // 'any' type accepts all
        if (targetType === 'any') return true
        if (sourceType === 'any') return true

        // Exact type match
        if (sourceType === targetType) return true

        return false
    }, [nodePortMap])

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

    // Memoized edge data mapping to prevent re-renders (Vercel: rerender-memo)
    const edgesWithData = useMemo(() => {
        return edges.map(e => ({
            ...e,
            data: {
                ...e.data,
                value: edgeDataMap[e.id],
                showValue: showEdgeData && isRunning
            }
        }))
    }, [edges, edgeDataMap, showEdgeData, isRunning])

    // Memoized available outputs for DashboardDesigner (Vercel: rerender-memo)
    const availableOutputs = useMemo(() => {
        return nodes.flatMap(node => {
            const nodeData = node.data as any
            return (nodeData.outputs || []).map((output: any) => ({
                nodeId: node.id,
                nodeLabel: nodeData.label || node.id,
                portId: output.id,
                portName: output.name
            }))
        })
    }, [nodes])

    // Stable callbacks for dashboard handlers (Vercel: rerender-functional-setstate)
    const handleWidgetsChange = useCallback((newWidgets: any) => {
        setDashboardWidgets(newWidgets)
        const savedProject = localStorage.getItem('daq-project')
        if (savedProject) {
            const project = JSON.parse(savedProject)
            project.ui = { ...project.ui, widgets: newWidgets }
            localStorage.setItem('daq-project', JSON.stringify(project))
        }
    }, [])

    const handleLayoutChange = useCallback((newLayout: any) => {
        setDashboardLayout(newLayout)
        const savedProject = localStorage.getItem('daq-project')
        if (savedProject) {
            const project = JSON.parse(savedProject)
            project.ui = { ...project.ui, layout: newLayout }
            localStorage.setItem('daq-project', JSON.stringify(project))
        }
    }, [])



    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }} className={debugMode ? 'debug-mode' : ''}>
            {/* Toast Notification */}
            {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

            {/* New Project Dialog */}
            <NewProjectDialog
                isOpen={showNewProjectDialog}
                onClose={() => setShowNewProjectDialog(false)}
                onCreateProject={handleCreateProject}
            />

            <SaveProjectDialog
                isOpen={showSaveDialog}
                onClose={() => setShowSaveDialog(false)}
                onSave={saveProjectToFile}
                currentName={projectName}
            />

            {/* Top Navigation Bar - Extracted component */}
            <TopNavBar
                projectName={projectName}
                view={view}
                editorMode={editorMode}
                isRunning={isRunning}
                debugMode={debugMode}
                dashboardEditMode={dashboardEditMode}
                showDevicePanel={showDevicePanel}
                showAIAssistant={showAIAssistant}
                showDebugger={showDebugger}
                showGitPanel={showGitPanel}
                onNewProject={() => setShowNewProjectDialog(true)}
                onSaveProject={() => setShowSaveDialog(true)}
                onOpenProject={() => { fetchRecentProjects(); setShowProjectList(true) }}
                onSetView={setView}
                onSetEditorMode={setEditorMode}
                onToggleRun={toggleRun}
                onToggleDebugMode={toggleDebugMode}
                onToggleDashboardEditMode={() => setDashboardEditMode(!dashboardEditMode)}
                onToggleDevicePanel={() => setShowDevicePanel(!showDevicePanel)}
                onToggleAIAssistant={() => setShowAIAssistant(!showAIAssistant)}
                onToggleDebugger={() => setShowDebugger(!showDebugger)}
                onToggleGitPanel={() => setShowGitPanel(!showGitPanel)}
                onShowCICD={() => setShowCICDPanel(true)}
                onShowSettings={() => setShowSettingsPanel(true)}
            />

            <div style={{ flex: 1, overflow: 'hidden' }}>
                <PanelsContainer
                    view={view}
                    editorMode={editorMode}
                    onSetEditorMode={setEditorMode}
                    onSetView={setView}
                    editorCanvasProps={{
                        nodes: nodesWithDebug,
                        edges: edgesWithData,
                        selectedNode,
                        selectedNodeData,
                        onNodesChange,
                        onEdgesChange,
                        onConnect,
                        onNodeClick,
                        onPaneClick,
                        onDragOver,
                        onDrop,
                        onPropertyChange: updateNodeProperty,
                        onExport: exportProject,
                        onImport: importProject,
                        onCompile: compileProject,
                        onDelete: deleteSelectedNode,
                        onToggleRun: toggleRun,
                        csvPath: getCsvPath(),
                        isRunning,
                        debugMode,
                        breakpoints,
                        executingNodeId,
                        onContinueFromBreakpoint: continueFromBreakpoint,
                        showEdgeData,
                        onToggleEdgeData: () => setShowEdgeData(!showEdgeData),
                        onUndo: handleUndo,
                        onRedo: handleRedo,
                        canUndo,
                        canRedo,
                        showDevicePanel,
                        DevicePanelComponent: DevicePanel
                    }}
                    dashboardProps={{
                        editMode: dashboardEditMode,
                        isRunning,
                        widgets: dashboardWidgets,
                        layout: dashboardLayout,
                        availableOutputs,
                        onWidgetsChange: handleWidgetsChange,
                        onLayoutChange: handleLayoutChange
                    }}
                />
                <Suspense fallback={null}><DaqEngine nodes={nodes} isRunning={isRunning} /></Suspense>
            </div>

            {/* AI Chat Panel */}
            <Suspense fallback={null}>
                <AIChat
                    isOpen={showAIChat}
                    onClose={() => setShowAIChat(false)}
                    projectContext={{
                        nodes,
                        edges,
                        projectName
                    }}
                />
            </Suspense>

            {/* CI/CD Panel */}
            <Suspense fallback={null}>
                <CICDPanel
                    isOpen={showCICDPanel}
                    onClose={() => setShowCICDPanel(false)}
                />
            </Suspense>

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={showSettingsPanel}
                onClose={() => setShowSettingsPanel(false)}
            />

            {/* Project List Dialog */}
            {
                showProjectList && (
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
                )
            }

            {/* Rename Dialog */}
            {
                renameDialog.show && (
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
                )
            }

            {/* Data Flow Debugger Panel */}
            <Suspense fallback={null}>
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
            </Suspense>

            {/* AI Assistant Panel */}
            <Suspense fallback={null}>
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
            </Suspense>

            {/* Git Panel */}
            <Suspense fallback={null}>
                <GitPanel
                    isOpen={showGitPanel}
                    onClose={() => setShowGitPanel(false)}
                />
            </Suspense>
        </div >
    )
}

export default function AppWrapper() {
    return (
        <ReactFlowProvider>
            <I18nProvider>
                <App />
            </I18nProvider>
        </ReactFlowProvider>
    )
}

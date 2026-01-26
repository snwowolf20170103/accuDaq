export interface PortDefinition {
    id: string
    name: string
    type: 'number' | 'string' | 'boolean' | 'any' | 'object' | 'array'
}

export interface ComponentDefinition {
    type: string
    name: string
    category: 'device' | 'logic' | 'storage' | 'comm' | 'algorithm' | 'protocol' | 'control'
    icon: string
    description: string
    inputs: PortDefinition[]
    outputs: PortDefinition[]
    defaultProperties: Record<string, any>
    propertySchema: PropertySchema[]
}

export interface PropertySchema {
    key: string
    label: string
    type: 'string' | 'number' | 'boolean' | 'select' | 'hidden' | 'code' | 'text' | 'password'
    options?: { value: string | number; label: string }[] | string[]
    default?: any
    readonly?: boolean
}

export interface DAQNodeData {
    label: string
    componentType: string
    category: 'device' | 'logic' | 'storage' | 'comm' | 'algorithm' | 'protocol' | 'control'
    icon: string
    inputs: PortDefinition[]
    outputs: PortDefinition[]
    properties: Record<string, any>
    // Debug properties (injected at runtime)
    debugMode?: boolean
    isExecuting?: boolean
    hasBreakpoint?: boolean
    portValues?: Record<string, any>
    onToggleBreakpoint?: () => void
}

export interface DAQProjectMeta {
    name: string
    version: string
    schemaVersion: string
    description?: string
    author?: string
    createdAt?: string
    modifiedAt?: string
}

export interface DAQProjectSettings {
    tickInterval?: number
    autoSave?: boolean
    debugMode?: boolean
}

export interface DAQProjectUI {
    widgets: DAQWidget[]
    layout?: 'grid' | 'free'
    theme?: 'dark' | 'light'
}

export interface DAQWidget {
    id: string
    type: string
    position: { x: number; y: number; w: number; h: number }
    config: Record<string, any>
}

export interface DAQProject {
    meta: DAQProjectMeta
    settings?: DAQProjectSettings
    devices: any[]
    logic: {
        nodes: DAQProjectNode[]
        wires: DAQProjectWire[]
    }
    ui: DAQProjectUI
}

export interface DAQProjectNode {
    id: string
    type: string
    label?: string
    position: { x: number; y: number }
    properties: Record<string, any>
}

export interface DAQProjectWire {
    id: string
    source: { nodeId: string; portId: string }
    target: { nodeId: string; portId: string }
}

// Editor modes
export type EditorMode = 'visual' | 'code'

// Debug state
export interface DebugState {
    enabled: boolean
    executingNodeId: string | null
    portValues: Record<string, Record<string, any>>
    breakpoints: string[]  // Changed from Set<string> for JSON serialization
    isPaused: boolean
}


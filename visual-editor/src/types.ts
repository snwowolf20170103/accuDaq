export interface PortDefinition {
    id: string
    name: string
    type: 'number' | 'string' | 'boolean' | 'any' | 'object'
}

export interface ComponentDefinition {
    type: string
    name: string
    category: 'device' | 'logic' | 'storage' | 'comm'
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
    type: 'string' | 'number' | 'boolean' | 'select' | 'hidden' | 'code'
    options?: { value: string; label: string }[]
    default?: any
    readonly?: boolean
}

export interface DAQNodeData {
    label: string
    componentType: string
    category: 'device' | 'logic' | 'storage' | 'comm'
    icon: string
    inputs: PortDefinition[]
    outputs: PortDefinition[]
    properties: Record<string, any>
}

export interface DAQProject {
    meta: {
        name: string
        version: string
        schemaVersion: string
    }
    devices: any[]
    logic: {
        nodes: DAQProjectNode[]
        wires: DAQProjectWire[]
    }
    ui: {
        widgets: any[]
    }
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

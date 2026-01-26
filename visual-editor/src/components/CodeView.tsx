import { useState, useEffect } from 'react'
import { DAQNodeData } from '../types'
import './CodeView.css'

interface CodeViewProps {
    nodes: any[]
    edges: any[]
    onBack: () => void
}

const CodeView = ({ nodes, edges, onBack }: CodeViewProps) => {
    const [generatedCode, setGeneratedCode] = useState<string>('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        generateCode()
    }, [nodes, edges])

    const generateCode = () => {
        setIsGenerating(true)

        // Generate Python code from nodes and edges
        const code = generatePythonCode(nodes, edges)
        setGeneratedCode(code)
        setIsGenerating(false)
    }

    const generatePythonCode = (nodes: any[], edges: any[]): string => {
        const lines: string[] = []

        // Header
        lines.push('#!/usr/bin/env python3')
        lines.push('"""')
        lines.push('Auto-generated DAQ application')
        lines.push(`Generated at: ${new Date().toISOString()}`)
        lines.push('"""')
        lines.push('')

        // Imports
        lines.push('import time')
        lines.push('import json')
        lines.push('from daq_core.engine import DAQEngine')
        lines.push('from daq_core.components import (')

        // Collect unique component types
        const componentTypes = new Set<string>()
        nodes.forEach(node => {
            const data = node.data as unknown as DAQNodeData
            componentTypes.add(data.componentType)
        })

        const typeToClass: Record<string, string> = {
            'mock_device': 'MockDeviceComponent',
            'mqtt_subscribe': 'MQTTSubscriberComponent',
            'mqtt_publish': 'MQTTPublisherComponent',
            'math': 'MathOperationComponent',
            'compare': 'CompareComponent',
            'csv_storage': 'CSVStorageComponent',
            'modbus_tcp': 'ModbusClientComponent',
            'threshold_alarm': 'ThresholdAlarmComponent',
            'debug_print': 'DebugPrintComponent',
            'global_variable': 'GlobalVariableComponent',
            'custom_script': 'CustomScriptComponent',
            'while_loop': 'WhileLoopComponent',
            'conditional': 'ConditionalComponent',
            'serial_port': 'SerialPortComponent',
            'modbus_rtu': 'ModbusRTUComponent',
            'scpi_device': 'SCPIDeviceComponent',
            'usb_device': 'USBDeviceComponent',
            'usb_hid': 'USBHIDComponent',
            'bluetooth_rfcomm': 'BluetoothRFCOMMComponent',
            'ble_device': 'BLEDeviceComponent',
            'timed_loop': 'TimedLoopComponent',
            'rate_limiter': 'RateLimiterComponent',
            'watchdog': 'WatchdogComponent',
        }

        componentTypes.forEach(type => {
            const className = typeToClass[type] || `${type.charAt(0).toUpperCase() + type.slice(1)}Component`
            lines.push(`    ${className},`)
        })
        lines.push(')')
        lines.push('')

        // Main function
        lines.push('')
        lines.push('def main():')
        lines.push('    """Main entry point for the DAQ application."""')
        lines.push('    ')
        lines.push('    # Create engine instance')
        lines.push('    engine = DAQEngine()')
        lines.push('    ')

        // Create components
        lines.push('    # === Component Instances ===')
        nodes.forEach(node => {
            const data = node.data as unknown as DAQNodeData
            const varName = sanitizeVarName(data.label || node.id)
            const className = typeToClass[data.componentType] || `${data.componentType.charAt(0).toUpperCase() + data.componentType.slice(1)}Component`

            lines.push(`    `)
            lines.push(`    # ${data.label || data.componentType}`)
            lines.push(`    ${varName} = ${className}(`)
            lines.push(`        instance_id="${node.id}",`)
            lines.push(`        config=${toPythonLiteral(data.properties, 8)}`)
            lines.push(`    )`)
            lines.push(`    engine.add_component(${varName})`)
        })

        lines.push('    ')
        lines.push('    # === Wire Connections ===')

        // Create wire connections
        const nodeIdToVar: Record<string, string> = {}
        nodes.forEach(node => {
            const data = node.data as unknown as DAQNodeData
            nodeIdToVar[node.id] = sanitizeVarName(data.label || node.id)
        })

        edges.forEach(edge => {
            // engine.connect() takes IDs as strings, not variable references
            lines.push(`    engine.connect("${edge.source}", "${edge.sourceHandle}", "${edge.target}", "${edge.targetHandle}")`)
        })

        lines.push('    ')
        lines.push('    # === Run Engine ===')
        lines.push('    try:')
        lines.push('        print("Starting DAQ Engine...")')
        lines.push('        engine.start()')
        lines.push('        ')
        lines.push('        # Run until interrupted')
        lines.push('        while True:')
        lines.push('            time.sleep(0.1)')
        lines.push('            ')
        lines.push('    except KeyboardInterrupt:')
        lines.push('        print("\\nShutting down...")')
        lines.push('    finally:')
        lines.push('        engine.stop()')
        lines.push('        print("DAQ Engine stopped.")')
        lines.push('')
        lines.push('')
        lines.push('if __name__ == "__main__":')
        lines.push('    main()')
        lines.push('')

        return lines.join('\n')
    }

    const sanitizeVarName = (name: string): string => {
        // Convert to valid Python variable name
        return name
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/^[0-9]/, '_$&')
            .replace(/__+/g, '_')
    }

    // Convert JavaScript value to Python literal syntax
    const toPythonLiteral = (value: any, indent: number = 0): string => {
        const spaces = ' '.repeat(indent)

        if (value === null || value === undefined) {
            return 'None'
        }
        if (value === true) {
            return 'True'
        }
        if (value === false) {
            return 'False'
        }
        if (typeof value === 'string') {
            // Escape quotes and backslashes
            const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
            return `"${escaped}"`
        }
        if (typeof value === 'number') {
            return String(value)
        }
        if (Array.isArray(value)) {
            if (value.length === 0) return '[]'
            const items = value.map(v => toPythonLiteral(v, indent + 4))
            return `[\n${spaces}    ${items.join(`,\n${spaces}    `)}\n${spaces}]`
        }
        if (typeof value === 'object') {
            const entries = Object.entries(value)
            if (entries.length === 0) return '{}'
            const items = entries.map(([k, v]) => {
                return `"${k}": ${toPythonLiteral(v, indent + 4)}`
            })
            return `{\n${spaces}    ${items.join(`,\n${spaces}    `)}\n${spaces}}`
        }
        return String(value)
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const downloadCode = () => {
        const blob = new Blob([generatedCode], { type: 'text/x-python' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'daq_app.py'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="code-view">
            <div className="code-view-header">
                <div className="code-view-title">
                    <button className="back-btn" onClick={onBack}>
                        ← Back to Visual
                    </button>
                    <span className="code-title">💻 Generated Python Code</span>
                </div>
                <div className="code-view-actions">
                    <button className="code-btn" onClick={generateCode}>
                        🔄 Regenerate
                    </button>
                    <button className="code-btn" onClick={copyToClipboard}>
                        {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                    <button className="code-btn primary" onClick={downloadCode}>
                        💾 Download .py
                    </button>
                </div>
            </div>

            <div className="code-view-content">
                {isGenerating ? (
                    <div className="code-loading">
                        <span>Generating code...</span>
                    </div>
                ) : (
                    <pre className="code-block">
                        <code>{generatedCode}</code>
                    </pre>
                )}
            </div>

            <div className="code-view-footer">
                <span className="code-info">
                    📊 {nodes.length} components | 🔗 {edges.length} connections
                </span>
                <span className="code-note">
                    Note: This is a one-way conversion. Editing code here will not update the visual editor.
                </span>
            </div>
        </div>
    )
}

export default CodeView

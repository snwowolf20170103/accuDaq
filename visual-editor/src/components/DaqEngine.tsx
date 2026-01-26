import { useEffect, useRef, memo } from 'react'
import { useMqtt } from '../hooks/useMqtt'

interface DaqEngineProps {
    nodes: any[]
    isRunning: boolean
}

const DaqEngine = ({ nodes, isRunning }: DaqEngineProps) => {
    // We only need the publish function from useMqtt
    // We'll connect to the first broker found in nodes
    const mqttNode = nodes.find(n => n.data?.properties?.broker_host)
    const brokerHost = mqttNode?.data?.properties?.broker_host || 'localhost'

    const { isConnected, publish } = useMqtt({
        brokerUrl: isRunning ? `ws://${brokerHost}:8083/mqtt` : ''
    })

    const intervals = useRef<Record<string, number>>({})

    useEffect(() => {
        if (!isRunning || !isConnected) {
            // Clear all intervals if stopped
            Object.values(intervals.current).forEach(window.clearInterval)
            intervals.current = {}
            return
        }

        const mockNodes = nodes.filter(n => n.data?.componentType === 'mock_device')

        mockNodes.forEach(node => {
            const { id } = node
            const { interval_ms = 1000, topic = 'accudaq/demo/sensor', wave_type = 'sine', amplitude = 10, offset = 25, frequency = 0.1 } = node.data.properties

            if (intervals.current[id]) return // Already running

            let startTime = Date.now()

            intervals.current[id] = window.setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000
                let value = 0

                switch (wave_type) {
                    case 'sine':
                        value = offset + amplitude * Math.sin(2 * Math.PI * frequency * elapsed)
                        break
                    case 'square':
                        value = offset + (Math.sin(2 * Math.PI * frequency * elapsed) >= 0 ? amplitude : -amplitude)
                        break
                    case 'random':
                        value = offset + (Math.random() - 0.5) * 2 * amplitude
                        break
                    default:
                        value = offset
                }

                // Append some random noise
                value += (Math.random() - 0.5) * (amplitude * 0.05)

                const payload = {
                    value: parseFloat(value.toFixed(2)),
                    timestamp: Date.now(),
                    device_name: node.data.properties.device_name || 'Sensor'
                }

                publish(topic, payload)

                // Apply Math Operation settings from the connected math node
                // Find math node to get scale/offset configuration
                const mathNode = nodes.find(n => n.data?.componentType === 'math')
                const mathScale = mathNode?.data?.properties?.scale ?? 1
                const mathOffset = mathNode?.data?.properties?.offset ?? 0

                // Calculate processed value using actual Math Operation settings
                const processedValue = payload.value * mathScale + mathOffset

                const processedPayload = {
                    ...payload,
                    value: parseFloat(processedValue.toFixed(2))
                }
                publish(`${topic}/processed`, processedPayload)

                // Also publish to secondary topic for fixed charts in dashboard
                if (topic !== 'sensors/temperature') {
                    publish('sensors/temperature', payload)
                }

            }, interval_ms)
        })

        return () => {
            Object.values(intervals.current).forEach(window.clearInterval)
            intervals.current = {}
        }
    }, [nodes, isRunning, isConnected, publish])

    return null // Invisible component
}

// Custom comparison to prevent re-renders when only position changes (dragging)
const arePropsEqual = (prev: DaqEngineProps, next: DaqEngineProps) => {
    if (prev.isRunning !== next.isRunning) return false
    if (prev.nodes.length !== next.nodes.length) return false

    // Check if any node data changed (ignoring position/selection)
    for (let i = 0; i < prev.nodes.length; i++) {
        if (prev.nodes[i].id !== next.nodes[i].id) return false
        if (prev.nodes[i].data !== next.nodes[i].data) return false
    }

    return true
}

export default memo(DaqEngine, arePropsEqual)

import { useState, useEffect, useCallback, useRef } from 'react'
import mqtt from 'mqtt'

interface MqttMessage {
    topic: string
    payload: any
    timestamp: number
}

interface UseMqttOptions {
    brokerUrl?: string
    options?: mqtt.IClientOptions
}

export const useMqtt = ({
    brokerUrl = 'ws://localhost:8083/mqtt',
    options = { keepalive: 60, clientId: 'daq-visual-editor-' + Math.random().toString(16).substr(2, 8) }
}: UseMqttOptions = {}) => {
    const [client, setClient] = useState<mqtt.MqttClient | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [messages, setMessages] = useState<Record<string, MqttMessage>>({})
    const [history, setHistory] = useState<Record<string, MqttMessage[]>>({})

    // Keep track of subscribed topics to resubscribe on reconnect
    const subscribedTopics = useRef(new Set<string>())

    useEffect(() => {
        if (!brokerUrl) {
            setIsConnected(false)
            return
        }

        console.log(`Connecting to MQTT broker: ${brokerUrl}`)
        const mqttClient = mqtt.connect(brokerUrl, options)

        mqttClient.on('connect', () => {
            console.log('MQTT Connected')
            setIsConnected(true)
            // Resubscribe to topics
            subscribedTopics.current.forEach(topic => {
                mqttClient.subscribe(topic)
            })
        })

        mqttClient.on('message', (topic, message) => {
            try {
                const payloadStr = message.toString()
                // Try parsing JSON, otherwise string
                let payload
                try {
                    payload = JSON.parse(payloadStr)
                } catch {
                    payload = payloadStr
                }

                const msgObj: MqttMessage = {
                    topic,
                    payload,
                    timestamp: Date.now()
                }

                setMessages(prev => ({ ...prev, [topic]: msgObj }))

                setHistory(prev => {
                    const topicHistory = prev[topic] || []
                    // Keep last 100 points
                    const newHistory = [...topicHistory, msgObj].slice(-100)
                    return { ...prev, [topic]: newHistory }
                })

            } catch (err) {
                console.error('Error processing MQTT message:', err)
            }
        })

        mqttClient.on('error', (err) => {
            console.error('MQTT Connection Error:', err)
            setIsConnected(false)
        })

        mqttClient.on('offline', () => {
            console.log('MQTT Offline')
            setIsConnected(false)
        })

        setClient(mqttClient)

        return () => {
            mqttClient.end()
        }
    }, [brokerUrl])

    const subscribe = useCallback((topic: string) => {
        if (client) {
            client.subscribe(topic, (err) => {
                if (!err) {
                    subscribedTopics.current.add(topic)
                    console.log(`Subscribed to ${topic}`)
                }
            })
        } else {
            subscribedTopics.current.add(topic)
        }
    }, [client])

    const unsubscribe = useCallback((topic: string) => {
        if (client) {
            client.unsubscribe(topic)
            subscribedTopics.current.delete(topic)
        }
    }, [client])

    const publish = useCallback((topic: string, message: string | object) => {
        if (client && isConnected) {
            const payload = typeof message === 'string' ? message : JSON.stringify(message)
            client.publish(topic, payload)
        }
    }, [client, isConnected])

    return {
        client,
        isConnected,
        messages,
        history,
        subscribe,
        unsubscribe,
        publish
    }
}

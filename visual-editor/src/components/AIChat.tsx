/**
 * AIChat - AI 辅助对话组件
 * 功能：提供 AI 辅助，帮助用户创建 DAQ 项目、解答问题
 */

import { useState, useRef, useEffect } from 'react'
import './AIChat.css'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
}

interface AIChatProps {
    isOpen: boolean
    onClose: () => void
    onInsertNode?: (nodeType: string) => void
    projectContext?: {
        nodes: any[]
        edges: any[]
        projectName: string
    }
}

const AIChat = ({ isOpen, onClose, onInsertNode: _onInsertNode, projectContext: _projectContext }: AIChatProps) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '👋 你好！我是 DAQ IDE 的 AI 助手。我可以帮助你：\n\n' +
                '• 创建数据采集项目\n' +
                '• 解释组件功能\n' +
                '• 提供配置建议\n' +
                '• 排查问题\n\n' +
                '有什么可以帮你的吗？',
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // State for LLM connection
    const [useLLM, setUseLLM] = useState(true) // 默认使用 LLM
    const [llmModel, setLlmModel] = useState('')

    // Call backend LLM API
    const callLLMAPI = async (userContent: string): Promise<{ content: string; model?: string }> => {
        const chatHistory = messages.map(m => ({
            role: m.role,
            content: m.content
        }))
        
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [...chatHistory, { role: 'user', content: userContent }]
            })
        })
        
        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || `HTTP ${response.status}`)
        }
        
        const result = await response.json()
        return { content: result.content, model: result.model }
    }

    // Fallback offline responses
    const getOfflineResponse = (userMessage: string): string => {
        const lowerMsg = userMessage.toLowerCase()

        if (lowerMsg.includes('mock device') || lowerMsg.includes('模拟设备')) {
            return '**Mock Device（模拟设备）**\n\n用于测试的虚拟数据源，支持正弦波/随机/方波/三角波。'
        }
        if (lowerMsg.includes('modbus')) {
            return '**Modbus TCP 组件**\n\n连接 Modbus TCP 协议工业设备，读取保持寄存器数据。'
        }
        if (lowerMsg.includes('mqtt')) {
            return '**MQTT 组件**\n\nMQTT Subscriber 订阅数据，MQTT Publisher 发布数据。'
        }
        if (lowerMsg.includes('温度监控') || lowerMsg.includes('temperature')) {
            return '**创建温度监控项目：**\n\n1. 添加 Mock Device 或 Modbus TCP\n2. 连接到 Threshold Alarm\n3. 添加 CSV Storage\n4. 在 Dashboard 添加 Gauge 和 LineChart'
        }
        
        return '我理解你的问题。作为 DAQ IDE 助手，我可以帮助你：\n• 询问组件用法\n• 创建项目\n• 调试问题\n• Dashboard 设计\n\n💡 提示：后端 LLM 服务未连接，当前使用离线模式。'
    }

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        const userContent = input.trim()
        setInput('')
        setIsLoading(true)

        try {
            if (useLLM) {
                // Try LLM API first
                const result = await callLLMAPI(userContent)
                if (result.model) setLlmModel(result.model)
                
                const assistantMessage: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: result.content,
                    timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMessage])
            } else {
                throw new Error('LLM disabled')
            }
        } catch (err) {
            console.warn('LLM API failed, using offline mode:', err)
            
            // Fallback to offline response
            const assistantMessage: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: getOfflineResponse(userContent),
                timestamp: new Date()
            }
            setMessages(prev => [...prev, assistantMessage])
        }
        
        setIsLoading(false)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Quick action buttons
    const quickActions = [
        { label: '温度监控项目', query: '如何创建温度监控项目？' },
        { label: 'Mock Device', query: 'Mock Device 组件怎么用？' },
        { label: 'Debug 调试', query: 'debug 功能怎么使用？' },
        { label: 'Dashboard', query: '怎么配置 Dashboard？' },
    ]

    if (!isOpen) return null

    return (
        <div className="ai-chat-overlay" onClick={onClose}>
            <div className="ai-chat-panel" onClick={e => e.stopPropagation()}>
                <div className="ai-chat-header">
                    <div className="ai-chat-title">
                        <span className="ai-icon">🤖</span>
                        <span>AI 助手</span>
                        {llmModel && <span className="ai-model-badge">{llmModel}</span>}
                    </div>
                    <div className="ai-chat-controls">
                        <label className="ai-llm-toggle" title={useLLM ? '使用本地 LLM' : '离线模式'}>
                            <input
                                type="checkbox"
                                checked={useLLM}
                                onChange={(e) => setUseLLM(e.target.checked)}
                            />
                            <span>{useLLM ? '🌐 LLM' : '📴 离线'}</span>
                        </label>
                        <button className="ai-chat-close" onClick={onClose}>×</button>
                    </div>
                </div>

                <div className="ai-chat-messages">
                    {messages.map(msg => (
                        <div key={msg.id} className={`ai-message ${msg.role}`}>
                            <div className="ai-message-avatar">
                                {msg.role === 'user' ? '👤' : '🤖'}
                            </div>
                            <div className="ai-message-content">
                                <div className="ai-message-text">
                                    {msg.content.split('\n').map((line, i) => (
                                        <span key={i}>
                                            {line.startsWith('**') && line.endsWith('**') ? (
                                                <strong>{line.slice(2, -2)}</strong>
                                            ) : line.startsWith('• ') ? (
                                                <span>• {line.slice(2)}</span>
                                            ) : line.startsWith('- ') ? (
                                                <span style={{ marginLeft: 16 }}>- {line.slice(2)}</span>
                                            ) : (
                                                line
                                            )}
                                            <br />
                                        </span>
                                    ))}
                                </div>
                                <div className="ai-message-time">
                                    {msg.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="ai-message assistant">
                            <div className="ai-message-avatar">🤖</div>
                            <div className="ai-message-content">
                                <div className="ai-typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="ai-quick-actions">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            className="ai-quick-btn"
                            onClick={() => {
                                setInput(action.query)
                                setTimeout(handleSend, 100)
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>

                <div className="ai-chat-input">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="输入问题..."
                        rows={1}
                    />
                    <button
                        className="ai-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        发送
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AIChat

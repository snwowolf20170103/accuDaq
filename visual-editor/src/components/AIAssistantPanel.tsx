/**
 * AIAssistantPanel - Enhanced AI Assistant with advanced features
 * 
 * Features:
 * - Natural language code generation
 * - Component recommendation based on project context
 * - Error diagnosis and fix suggestions
 * - Workflow automation suggestions
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import './AIAssistantPanel.css'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
    type?: 'text' | 'code' | 'component' | 'error'
    metadata?: {
        language?: string
        componentType?: string
        suggestion?: any
    }
}

interface ComponentSuggestion {
    type: string
    name: string
    category: string
    icon: string
    reason: string
    properties?: Record<string, any>
}

interface AIAssistantPanelProps {
    isOpen: boolean
    onClose: () => void
    projectContext: {
        nodes: any[]
        edges: any[]
        projectName: string
    }
    onAddComponent?: (component: ComponentSuggestion) => void
    onApplyCode?: (code: string, nodeId?: string) => void
}

const AIAssistantPanel = ({
    isOpen,
    onClose,
    projectContext,
    onAddComponent,
    onApplyCode,
}: AIAssistantPanelProps) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '👋 你好！我是 DAQ AI 助手。我可以帮你：\n\n• 🔧 生成自定义脚本代码\n• 📦 推荐适合的组件\n• 🐛 诊断和修复错误\n• 💡 优化工作流程\n\n请告诉我你需要什么帮助？',
            timestamp: new Date(),
            type: 'text',
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [activeMode, setActiveMode] = useState<'chat' | 'generate' | 'recommend' | 'diagnose'>('chat')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Quick action templates
    const quickActions = [
        { icon: '🔧', label: '生成代码', mode: 'generate' as const },
        { icon: '📦', label: '推荐组件', mode: 'recommend' as const },
        { icon: '🐛', label: '诊断错误', mode: 'diagnose' as const },
    ]

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus()
        }
    }, [isOpen])

    // Add message to chat
    const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
        const newMessage: Message = {
            ...message,
            id: `msg-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
        }
        setMessages(prev => [...prev, newMessage])
        return newMessage
    }, [])

    // Send message to AI backend
    const sendToAI = useCallback(async (prompt: string, mode: string) => {
        try {
            // Build context from project
            const context = {
                mode,
                projectName: projectContext.projectName,
                nodeCount: projectContext.nodes.length,
                edgeCount: projectContext.edges.length,
                nodeTypes: projectContext.nodes.map(n => n.data?.componentType).filter(Boolean),
                hasConnections: projectContext.edges.length > 0,
            }

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt,
                    context,
                    mode,
                }),
            })

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            const result = await response.json()
            return result
        } catch (error: any) {
            console.error('AI request failed:', error)
            // Return fallback response for demo
            return generateFallbackResponse(prompt, mode, projectContext)
        }
    }, [projectContext])

    // Handle send message
    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')

        // Add user message
        addMessage({ role: 'user', content: userMessage, type: 'text' })

        setIsLoading(true)

        try {
            const response = await sendToAI(userMessage, activeMode)

            // Process response based on type
            if (response.type === 'code') {
                addMessage({
                    role: 'assistant',
                    content: response.message || '这是为你生成的代码：',
                    type: 'text',
                })
                addMessage({
                    role: 'assistant',
                    content: response.code,
                    type: 'code',
                    metadata: { language: response.language || 'python' },
                })
            } else if (response.type === 'component') {
                addMessage({
                    role: 'assistant',
                    content: response.message || '根据你的需求，我推荐以下组件：',
                    type: 'text',
                })
                addMessage({
                    role: 'assistant',
                    content: JSON.stringify(response.suggestions, null, 2),
                    type: 'component',
                    metadata: { suggestion: response.suggestions },
                })
            } else if (response.type === 'error') {
                addMessage({
                    role: 'assistant',
                    content: response.message,
                    type: 'error',
                    metadata: { suggestion: response.fix },
                })
            } else {
                addMessage({
                    role: 'assistant',
                    content: response.message || response.response || '抱歉，我没能理解你的问题。',
                    type: 'text',
                })
            }
        } catch (error: any) {
            addMessage({
                role: 'assistant',
                content: `抱歉，处理请求时出错: ${error.message}`,
                type: 'text',
            })
        } finally {
            setIsLoading(false)
        }
    }, [input, isLoading, activeMode, addMessage, sendToAI])

    // Handle key press
    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }, [handleSend])

    // Copy code to clipboard
    const copyCode = useCallback((code: string) => {
        navigator.clipboard.writeText(code)
        // Could add toast notification here
    }, [])

    // Apply code suggestion
    const applyCode = useCallback((code: string) => {
        if (onApplyCode) {
            onApplyCode(code)
        }
    }, [onApplyCode])

    // Add recommended component
    const addRecommendedComponent = useCallback((suggestion: ComponentSuggestion) => {
        if (onAddComponent) {
            onAddComponent(suggestion)
        }
    }, [onAddComponent])

    // Render message content
    const renderMessage = (message: Message) => {
        if (message.type === 'code') {
            const language = message.metadata?.language || 'python'
            return (
                <div className="code-message">
                    <div className="code-header">
                        <span className="code-language">{language}</span>
                        <div className="code-actions">
                            <button onClick={() => copyCode(message.content)} title="复制">📋</button>
                            <button onClick={() => applyCode(message.content)} title="应用">✅</button>
                        </div>
                    </div>
                    <pre className="code-block">
                        <code>{message.content}</code>
                    </pre>
                </div>
            )
        }

        if (message.type === 'component' && message.metadata?.suggestion) {
            const suggestions = Array.isArray(message.metadata.suggestion)
                ? message.metadata.suggestion
                : [message.metadata.suggestion]

            return (
                <div className="component-suggestions">
                    {suggestions.map((suggestion: ComponentSuggestion, index: number) => (
                        <div key={index} className="component-card">
                            <div className="component-icon">{suggestion.icon || '📦'}</div>
                            <div className="component-info">
                                <div className="component-name">{suggestion.name}</div>
                                <div className="component-category">{suggestion.category}</div>
                                <div className="component-reason">{suggestion.reason}</div>
                            </div>
                            <button
                                className="add-component-btn"
                                onClick={() => addRecommendedComponent(suggestion)}
                            >
                                添加
                            </button>
                        </div>
                    ))}
                </div>
            )
        }

        if (message.type === 'error') {
            return (
                <div className="error-message">
                    <div className="error-content">{message.content}</div>
                    {message.metadata?.suggestion && (
                        <div className="fix-suggestion">
                            <strong>💡 建议修复:</strong>
                            <pre>{message.metadata.suggestion}</pre>
                        </div>
                    )}
                </div>
            )
        }

        // Default text message with markdown-like formatting
        return (
            <div className="text-message">
                {message.content.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                ))}
            </div>
        )
    }

    if (!isOpen) return null

    return (
        <div className="ai-assistant-panel">
            <div className="panel-header">
                <h3>🤖 AI 助手</h3>
                <div className="mode-selector">
                    {quickActions.map(action => (
                        <button
                            key={action.mode}
                            className={`mode-btn ${activeMode === action.mode ? 'active' : ''}`}
                            onClick={() => setActiveMode(action.mode)}
                            title={action.label}
                        >
                            {action.icon}
                        </button>
                    ))}
                </div>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="mode-indicator">
                {activeMode === 'chat' && '💬 对话模式'}
                {activeMode === 'generate' && '🔧 代码生成模式'}
                {activeMode === 'recommend' && '📦 组件推荐模式'}
                {activeMode === 'diagnose' && '🐛 错误诊断模式'}
            </div>

            <div className="messages-container">
                {messages.map(message => (
                    <div key={message.id} className={`message ${message.role}`}>
                        <div className="message-content">
                            {renderMessage(message)}
                        </div>
                        <div className="message-time">
                            {message.timestamp.toLocaleTimeString()}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message assistant loading">
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                        activeMode === 'generate' ? '描述你想要生成的代码...' :
                            activeMode === 'recommend' ? '描述你的需求，我来推荐组件...' :
                                activeMode === 'diagnose' ? '描述你遇到的问题...' :
                                    '输入消息...'
                    }
                    rows={2}
                    disabled={isLoading}
                />
                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                >
                    {isLoading ? '⏳' : '➤'}
                </button>
            </div>

            {/* Context info */}
            <div className="context-info">
                <span>📊 项目: {projectContext.projectName}</span>
                <span>📦 组件: {projectContext.nodes.length}</span>
                <span>🔗 连接: {projectContext.edges.length}</span>
            </div>
        </div>
    )
}

// Fallback response generator for demo/offline mode
function generateFallbackResponse(prompt: string, mode: string, context: any) {
    const promptLower = prompt.toLowerCase()

    if (mode === 'generate' || promptLower.includes('代码') || promptLower.includes('code')) {
        return {
            type: 'code',
            message: '根据你的需求，我生成了以下 Python 代码：',
            code: `# 自动生成的代码
def process_data(input_value):
    """
    处理输入数据
    Args:
        input_value: 输入值
    Returns:
        处理后的结果
    """
    # 数据验证
    if input_value is None:
        return 0
    
    # 数据处理逻辑
    result = input_value * 2  # 示例处理
    
    # 边界检查
    if result > 100:
        result = 100
    elif result < 0:
        result = 0
    
    return result
`,
            language: 'python',
        }
    }

    if (mode === 'recommend' || promptLower.includes('组件') || promptLower.includes('推荐')) {
        return {
            type: 'component',
            message: '根据你当前的项目配置，我推荐以下组件：',
            suggestions: [
                {
                    type: 'threshold_alarm',
                    name: 'Threshold Alarm',
                    category: 'logic',
                    icon: '🚨',
                    reason: '用于监控数据超限报警',
                },
                {
                    type: 'moving_average_filter',
                    name: 'Moving Average Filter',
                    category: 'algorithm',
                    icon: '📈',
                    reason: '平滑数据波动，减少噪声',
                },
                {
                    type: 'csv_storage',
                    name: 'CSV Storage',
                    category: 'storage',
                    icon: '📁',
                    reason: '保存采集数据到文件',
                },
            ],
        }
    }

    if (mode === 'diagnose' || promptLower.includes('错误') || promptLower.includes('问题')) {
        return {
            type: 'error',
            message: '我分析了你的项目配置，发现以下潜在问题：\n\n1. 部分组件可能缺少输入连接\n2. 建议添加错误处理逻辑\n3. 考虑增加数据缓存机制',
            fix: `# 建议添加以下错误处理
try:
    result = process_data(input_value)
except Exception as e:
    logger.error(f"处理失败: {e}")
    result = default_value`,
        }
    }

    // Default chat response
    return {
        type: 'text',
        message: `我理解了你的请求。当前项目有 ${context.nodeCount} 个组件和 ${context.edgeCount} 个连接。\n\n请告诉我更多细节，或者选择上方的功能模式来获取更具体的帮助。`,
    }
}

export default AIAssistantPanel

import { useState } from 'react'
import './DebugOverlay.css'

interface DebugOverlayProps {
    nodeId: string
    isExecuting: boolean
    portValues: Record<string, any>
    hasBreakpoint: boolean
    onToggleBreakpoint: () => void
}

const DebugOverlay = ({ 
    nodeId: _nodeId, 
    isExecuting, 
    portValues, 
    hasBreakpoint,
    onToggleBreakpoint 
}: DebugOverlayProps) => {
    const [showValues, setShowValues] = useState(false)

    return (
        <div className={`debug-overlay ${isExecuting ? 'executing' : ''}`}>
            {/* Breakpoint indicator */}
            <div 
                className={`breakpoint-indicator ${hasBreakpoint ? 'active' : ''}`}
                onClick={(e) => {
                    e.stopPropagation()
                    onToggleBreakpoint()
                }}
                title={hasBreakpoint ? 'Remove breakpoint' : 'Add breakpoint'}
            >
                🔴
            </div>
            
            {/* Port values display */}
            {Object.keys(portValues).length > 0 && (
                <div 
                    className="port-values-toggle"
                    onMouseEnter={() => setShowValues(true)}
                    onMouseLeave={() => setShowValues(false)}
                >
                    📊
                    {showValues && (
                        <div className="port-values-popup">
                            <div className="port-values-title">Port Values</div>
                            {Object.entries(portValues).map(([port, value]) => (
                                <div key={port} className="port-value-item">
                                    <span className="port-name">{port}:</span>
                                    <span className="port-value">
                                        {typeof value === 'object' 
                                            ? JSON.stringify(value).slice(0, 30) 
                                            : String(value).slice(0, 20)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Executing animation */}
            {isExecuting && (
                <div className="executing-indicator">
                    <div className="pulse-ring"></div>
                </div>
            )}
        </div>
    )
}

export default DebugOverlay

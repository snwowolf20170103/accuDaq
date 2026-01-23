/**
 * 数值输入框控件
 * 功能：输入数值并写入全局变量或发送给设备
 */

import { useState, useEffect } from 'react'

interface NumberInputWidgetProps {
    value?: number
    label: string
    onChange?: (value: number) => void
    min?: number
    max?: number
    step?: number
    unit?: string
    precision?: number
    disabled?: boolean
    showButtons?: boolean  // 是否显示加减按钮
}

export const NumberInputWidget = ({
    value: externalValue,
    label,
    onChange,
    min = -Infinity,
    max = Infinity,
    step = 1,
    unit = '',
    precision = 2,
    disabled = false,
    showButtons = true
}: NumberInputWidgetProps) => {
    const [internalValue, setInternalValue] = useState(0)
    const [inputText, setInputText] = useState('0')

    const currentValue = externalValue !== undefined ? externalValue : internalValue

    // 同步显示值
    useEffect(() => {
        setInputText(currentValue.toFixed(precision))
    }, [currentValue, precision])

    const handleChange = (newValue: number) => {
        // 限制范围
        const clampedValue = Math.min(Math.max(newValue, min), max)

        // 更新内部状态
        if (externalValue === undefined) {
            setInternalValue(clampedValue)
        }

        // 触发回调
        onChange?.(clampedValue)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value)
    }

    const handleInputBlur = () => {
        const numValue = parseFloat(inputText)
        if (!isNaN(numValue)) {
            handleChange(numValue)
        } else {
            // 恢复原值
            setInputText(currentValue.toFixed(precision))
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleInputBlur()
        }
    }

    const increment = () => {
        handleChange(currentValue + step)
    }

    const decrement = () => {
        handleChange(currentValue - step)
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px'
        }}>
            {/* 标签 */}
            <div style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#ccc',
                textAlign: 'center'
            }}>
                {label}
            </div>

            {/* 输入框和按钮组 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                maxWidth: '200px'
            }}>
                {/* 减号按钮 */}
                {showButtons && (
                    <button
                        onClick={decrement}
                        disabled={disabled || currentValue <= min}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            border: 'none',
                            background: '#3c3c3c',
                            color: '#fff',
                            fontSize: 18,
                            fontWeight: 700,
                            cursor: disabled || currentValue <= min ? 'not-allowed' : 'pointer',
                            opacity: disabled || currentValue <= min ? 0.5 : 1,
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (!disabled && currentValue > min) {
                                e.currentTarget.style.background = '#4a4a4a'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#3c3c3c'
                        }}
                    >
                        −
                    </button>
                )}

                {/* 输入框 */}
                <div style={{
                    flex: 1,
                    position: 'relative'
                }}>
                    <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            paddingRight: unit ? '40px' : '12px',
                            fontSize: 16,
                            fontWeight: 600,
                            textAlign: 'center',
                            border: '2px solid #3c3c3c',
                            borderRadius: 4,
                            background: '#2a2a2a',
                            color: '#4fc3f7',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#4fc3f7'
                        }}
                        onBlurCapture={(e) => {
                            e.currentTarget.style.borderColor = '#3c3c3c'
                        }}
                    />

                    {/* 单位标签 */}
                    {unit && (
                        <div style={{
                            position: 'absolute',
                            right: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: 12,
                            color: '#888',
                            pointerEvents: 'none'
                        }}>
                            {unit}
                        </div>
                    )}
                </div>

                {/* 加号按钮 */}
                {showButtons && (
                    <button
                        onClick={increment}
                        disabled={disabled || currentValue >= max}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            border: 'none',
                            background: '#3c3c3c',
                            color: '#fff',
                            fontSize: 18,
                            fontWeight: 700,
                            cursor: disabled || currentValue >= max ? 'not-allowed' : 'pointer',
                            opacity: disabled || currentValue >= max ? 0.5 : 1,
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (!disabled && currentValue < max) {
                                e.currentTarget.style.background = '#4a4a4a'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#3c3c3c'
                        }}
                    >
                        +
                    </button>
                )}
            </div>

            {/* 范围提示 */}
            {(min !== -Infinity || max !== Infinity) && (
                <div style={{
                    fontSize: 11,
                    color: '#666',
                    display: 'flex',
                    gap: '8px'
                }}>
                    {min !== -Infinity && <span>最小: {min}</span>}
                    {max !== Infinity && <span>最大: {max}</span>}
                </div>
            )}
        </div>
    )
}

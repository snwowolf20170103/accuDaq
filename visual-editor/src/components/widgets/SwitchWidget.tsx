/**
 * 开关按钮控件
 * 功能：双态开关，支持控制设备或写入全局变量
 */

import { useState } from 'react'

interface SwitchWidgetProps {
    value?: boolean
    label: string
    onChange?: (value: boolean) => void
    disabled?: boolean
    colorOn?: string
    colorOff?: string
    size?: 'small' | 'medium' | 'large'
}

export const SwitchWidget = ({
    value: externalValue,
    label,
    onChange,
    disabled = false,
    colorOn = '#27ae60',
    colorOff = '#95a5a6',
    size = 'medium'
}: SwitchWidgetProps) => {
    const [internalValue, setInternalValue] = useState(false)

    // 使用外部值（如果提供），否则使用内部状态
    const isOn = externalValue !== undefined ? externalValue : internalValue

    const handleToggle = () => {
        if (disabled) return

        const newValue = !isOn

        // 更新内部状态
        if (externalValue === undefined) {
            setInternalValue(newValue)
        }

        // 触发回调
        onChange?.(newValue)
    }

    // 尺寸配置
    const sizeConfig = {
        small: { width: 40, height: 22, thumbSize: 18 },
        medium: { width: 60, height: 32, thumbSize: 26 },
        large: { width: 80, height: 42, thumbSize: 36 }
    }

    const config = sizeConfig[size]
    const thumbOffset = isOn ? config.width - config.thumbSize - 3 : 3

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
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

            {/* 开关按钮 */}
            <div
                onClick={handleToggle}
                style={{
                    width: config.width,
                    height: config.height,
                    borderRadius: config.height / 2,
                    backgroundColor: isOn ? colorOn : colorOff,
                    position: 'relative',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.3s ease',
                    opacity: disabled ? 0.5 : 1,
                    boxShadow: isOn
                        ? `0 0 15px ${colorOn}60`
                        : 'inset 0 2px 4px rgba(0,0,0,0.3)',
                }}
            >
                {/* 滑动按钮 */}
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: thumbOffset,
                        width: config.thumbSize,
                        height: config.thumbSize,
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        transform: 'translateY(-50%)',
                        transition: 'left 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                />
            </div>

            {/* 状态文本 */}
            <div style={{
                fontSize: 13,
                color: isOn ? colorOn : colorOff,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                {isOn ? 'ON' : 'OFF'}
            </div>
        </div>
    )
}

/**
 * DevicePanel - 设备管理面板
 * 功能：设备列表、添加/删除设备、连接状态、实时数据监视
 */

import { useState, useEffect } from 'react'
import './DevicePanel.css'

export interface Device {
    id: string
    name: string
    type: 'mock' | 'modbus' | 'mqtt'
    status: 'connected' | 'disconnected' | 'connecting'
    config: Record<string, any>
    lastUpdate?: Date
    currentValue?: any
}

interface DevicePanelProps {
    onDeviceAdd?: (device: Device) => void
    onDeviceRemove?: (deviceId: string) => void
    onDeviceConnect?: (deviceId: string) => void
    onDeviceDisconnect?: (deviceId: string) => void
}

const DevicePanel = ({
    onDeviceAdd,
    onDeviceRemove,
    onDeviceConnect,
    onDeviceDisconnect
}: DevicePanelProps) => {
    const [devices, setDevices] = useState<Device[]>([])
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [newDevice, setNewDevice] = useState<Partial<Device>>({
        type: 'mock',
        name: '',
        config: {}
    })
    const [showRawData, setShowRawData] = useState(false)

    // 从 localStorage 加载设备列表
    useEffect(() => {
        const savedDevices = localStorage.getItem('daq-devices')
        if (savedDevices) {
            setDevices(JSON.parse(savedDevices))
        }
    }, [])

    // 保存设备列表到 localStorage
    useEffect(() => {
        localStorage.setItem('daq-devices', JSON.stringify(devices))
    }, [devices])

    // 添加设备
    const handleAddDevice = () => {
        if (!newDevice.name || !newDevice.type) {
            alert('请填写设备名称')
            return
        }

        const device: Device = {
            id: `device_${Date.now()}`,
            name: newDevice.name,
            type: newDevice.type as 'mock' | 'modbus' | 'mqtt',
            status: 'disconnected',
            config: getDefaultConfig(newDevice.type as string),
        }

        setDevices([...devices, device])
        onDeviceAdd?.(device)
        setShowAddDialog(false)
        setNewDevice({ type: 'mock', name: '', config: {} })
    }

    // 删除设备
    const handleDeleteDevice = (deviceId: string) => {
        if (!confirm('确定要删除此设备吗？')) return

        setDevices(devices.filter(d => d.id !== deviceId))
        onDeviceRemove?.(deviceId)

        if (selectedDevice === deviceId) {
            setSelectedDevice(null)
        }
    }

    // 连接设备
    const handleConnect = (deviceId: string) => {
        setDevices(devices.map(d =>
            d.id === deviceId ? { ...d, status: 'connecting' } : d
        ))

        // 模拟连接延迟
        setTimeout(() => {
            setDevices(devices.map(d =>
                d.id === deviceId ? {
                    ...d,
                    status: 'connected',
                    lastUpdate: new Date()
                } : d
            ))
            onDeviceConnect?.(deviceId)
        }, 1000)
    }

    // 断开设备
    const handleDisconnect = (deviceId: string) => {
        setDevices(devices.map(d =>
            d.id === deviceId ? { ...d, status: 'disconnected' } : d
        ))
        onDeviceDisconnect?.(deviceId)
    }

    // 获取默认配置
    const getDefaultConfig = (type: string) => {
        switch (type) {
            case 'mock':
                return {
                    wave_type: 'sine',
                    amplitude: 10,
                    offset: 25,
                    frequency: 0.1
                }
            case 'modbus':
                return {
                    host: '127.0.0.1',
                    port: 502,
                    register: 0,
                    slave_id: 1,
                    data_type: 'uint16'
                }
            case 'mqtt':
                return {
                    broker_host: 'localhost',
                    broker_port: 1883,
                    topic: 'accudaq/demo/sensor'
                }
            default:
                return {}
        }
    }

    // 获取状态指示器
    const getStatusIndicator = (status: Device['status']) => {
        switch (status) {
            case 'connected':
                return { icon: '🟢', text: '已连接', color: '#27ae60' }
            case 'disconnected':
                return { icon: '🔴', text: '未连接', color: '#e74c3c' }
            case 'connecting':
                return { icon: '🟡', text: '连接中...', color: '#f39c12' }
        }
    }

    // 获取设备图标
    const getDeviceIcon = (type: Device['type']) => {
        switch (type) {
            case 'mock':
                return '🎲'
            case 'modbus':
                return '🏭'
            case 'mqtt':
                return '📡'
        }
    }

    const selectedDeviceData = devices.find(d => d.id === selectedDevice)

    return (
        <div className="device-panel">
            {/* 头部 */}
            <div className="device-panel-header">
                <h3>📡 设备管理</h3>
                <div className="device-panel-actions">
                    <button
                        className="btn-add-device"
                        onClick={() => setShowAddDialog(true)}
                    >
                        + 添加设备
                    </button>
                    <button
                        className="btn-toggle-raw"
                        onClick={() => setShowRawData(!showRawData)}
                    >
                        {showRawData ? '📊' : '📋'} {showRawData ? '列表' : '原始数据'}
                    </button>
                </div>
            </div>

            {/* 设备列表 */}
            {!showRawData && (
                <div className="device-list">
                    {devices.length === 0 ? (
                        <div className="device-empty">
                            <div className="device-empty-icon">📭</div>
                            <div className="device-empty-text">暂无设备</div>
                            <div className="device-empty-hint">点击"添加设备"开始</div>
                        </div>
                    ) : (
                        devices.map(device => {
                            const statusInfo = getStatusIndicator(device.status)
                            const isSelected = selectedDevice === device.id

                            return (
                                <div
                                    key={device.id}
                                    className={`device-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedDevice(device.id)}
                                >
                                    <div className="device-card-header">
                                        <div className="device-card-title">
                                            <span className="device-icon">
                                                {getDeviceIcon(device.type)}
                                            </span>
                                            <span className="device-name">{device.name}</span>
                                        </div>
                                        <div className="device-card-actions">
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteDevice(device.id)
                                                }}
                                                title="删除"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    <div className="device-card-body">
                                        <div className="device-status">
                                            <span className="status-indicator">
                                                {statusInfo.icon}
                                            </span>
                                            <span
                                                className="status-text"
                                                style={{ color: statusInfo.color }}
                                            >
                                                {statusInfo.text}
                                            </span>
                                        </div>

                                        <div className="device-type">
                                            类型: {device.type.toUpperCase()}
                                        </div>

                                        {device.lastUpdate && (
                                            <div className="device-last-update">
                                                最后更新: {device.lastUpdate.toLocaleTimeString()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="device-card-footer">
                                        {device.status === 'connected' ? (
                                            <button
                                                className="btn-disconnect"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDisconnect(device.id)
                                                }}
                                            >
                                                断开连接
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-connect"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleConnect(device.id)
                                                }}
                                                disabled={device.status === 'connecting'}
                                            >
                                                {device.status === 'connecting' ? '连接中...' : '连接'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* 原始数据查看器 */}
            {showRawData && (
                <div className="raw-data-viewer">
                    {selectedDeviceData ? (
                        <div className="raw-data-content">
                            <div className="raw-data-header">
                                <h4>{selectedDeviceData.name} - 实时数据</h4>
                                <div className="raw-data-status">
                                    {getStatusIndicator(selectedDeviceData.status).icon}
                                    {getStatusIndicator(selectedDeviceData.status).text}
                                </div>
                            </div>

                            <div className="raw-data-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>参数</th>
                                            <th>值</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(selectedDeviceData.config).map(([key, value]) => (
                                            <tr key={key}>
                                                <td>{key}</td>
                                                <td>{JSON.stringify(value)}</td>
                                            </tr>
                                        ))}
                                        {selectedDeviceData.currentValue !== undefined && (
                                            <tr className="highlight">
                                                <td><strong>当前值</strong></td>
                                                <td><strong>{JSON.stringify(selectedDeviceData.currentValue)}</strong></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="raw-data-empty">
                            <div>请从左侧选择一个设备</div>
                        </div>
                    )}
                </div>
            )}

            {/* 添加设备对话框 */}
            {showAddDialog && (
                <div className="dialog-overlay" onClick={() => setShowAddDialog(false)}>
                    <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                        <div className="dialog-header">
                            <h3>添加新设备</h3>
                            <button
                                className="dialog-close"
                                onClick={() => setShowAddDialog(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="dialog-body">
                            <div className="form-group">
                                <label>设备名称</label>
                                <input
                                    type="text"
                                    placeholder="例如：温度传感器01"
                                    value={newDevice.name || ''}
                                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>设备类型</label>
                                <select
                                    value={newDevice.type}
                                    onChange={(e) => setNewDevice({
                                        ...newDevice,
                                        type: e.target.value as Device['type']
                                    })}
                                >
                                    <option value="mock">🎲 Mock Device (模拟设备)</option>
                                    <option value="modbus">🏭 Modbus TCP</option>
                                    <option value="mqtt">📡 MQTT Client</option>
                                </select>
                            </div>

                            <div className="form-hint">
                                设备将使用默认配置创建，您可以稍后在节点属性中修改配置。
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowAddDialog(false)}
                            >
                                取消
                            </button>
                            <button
                                className="btn-confirm"
                                onClick={handleAddDevice}
                            >
                                添加
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default DevicePanel

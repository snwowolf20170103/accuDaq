import { DAQProject } from '../types'
import { v4 as uuidv4 } from 'uuid'

export interface ProjectTemplate {
    id: string
    name: string
    description: string
    icon: string
    project: DAQProject
}

// Generate fresh IDs for template nodes
const generateIds = () => ({
    mockDevice: uuidv4(),
    threshold: uuidv4(),
    csvStorage: uuidv4(),
    mqttPub: uuidv4(),
})

export const createBlankProject = (name: string = 'New Project'): DAQProject => ({
    meta: {
        name,
        version: '1.0.0',
        schemaVersion: '2.0.0',
        description: '',
        author: '',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
    },
    settings: {
        tickInterval: 100,
        autoSave: true,
        debugMode: false,
    },
    devices: [],
    logic: {
        nodes: [],
        wires: [],
    },
    ui: {
        widgets: [],
        layout: 'grid',
        theme: 'dark',
    },
})

export const createTemperatureMonitorProject = (name: string = 'Temperature Monitor'): DAQProject => {
    const ids = generateIds()
    
    return {
        meta: {
            name,
            version: '1.0.0',
            schemaVersion: '2.0.0',
            description: 'Monitor temperature and trigger alarm when exceeding threshold',
            author: '',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
        },
        settings: {
            tickInterval: 100,
            autoSave: true,
            debugMode: false,
        },
        devices: [],
        logic: {
            nodes: [
                {
                    id: ids.mockDevice,
                    type: 'daq:mock_device',
                    label: 'Temperature Sensor',
                    position: { x: 100, y: 150 },
                    properties: {
                        device_name: 'TempSensor01',
                        wave_type: 'sine',
                        amplitude: 15,
                        offset: 25,
                        frequency: 0.05,
                        interval_ms: 1000,
                        broker_host: 'localhost',
                        broker_port: 1883,
                        topic: 'accudaq/temperature',
                    },
                },
                {
                    id: ids.threshold,
                    type: 'daq:threshold_alarm',
                    label: 'High Temp Alarm',
                    position: { x: 400, y: 150 },
                    properties: {
                        threshold: 30.0,
                        compare_type: 'greater',
                    },
                },
                {
                    id: ids.csvStorage,
                    type: 'daq:csv_storage',
                    label: 'Data Logger',
                    position: { x: 700, y: 100 },
                    properties: {
                        file_path: './data/temperature.csv',
                        append_mode: true,
                        include_timestamp: true,
                        flush_interval: 10,
                    },
                },
                {
                    id: ids.mqttPub,
                    type: 'daq:mqtt_publish',
                    label: 'Alarm Publisher',
                    position: { x: 700, y: 250 },
                    properties: {
                        broker_host: 'localhost',
                        broker_port: 1883,
                        topic: 'accudaq/alarm',
                    },
                },
            ],
            wires: [
                {
                    id: uuidv4(),
                    source: { nodeId: ids.mockDevice, portId: 'value' },
                    target: { nodeId: ids.threshold, portId: 'value' },
                },
                {
                    id: uuidv4(),
                    source: { nodeId: ids.threshold, portId: 'value_out' },
                    target: { nodeId: ids.csvStorage, portId: 'value' },
                },
                {
                    id: uuidv4(),
                    source: { nodeId: ids.threshold, portId: 'alarm' },
                    target: { nodeId: ids.mqttPub, portId: 'data' },
                },
            ],
        },
        ui: {
            widgets: [
                {
                    id: uuidv4(),
                    type: 'line_chart',
                    position: { x: 0, y: 0, w: 6, h: 4 },
                    config: {
                        title: 'Temperature Trend',
                        dataSource: 'accudaq/temperature',
                        color: '#4a90d9',
                    },
                },
                {
                    id: uuidv4(),
                    type: 'gauge',
                    position: { x: 6, y: 0, w: 3, h: 4 },
                    config: {
                        title: 'Current Temperature',
                        dataSource: 'accudaq/temperature',
                        min: 0,
                        max: 50,
                        unit: '°C',
                    },
                },
                {
                    id: uuidv4(),
                    type: 'led',
                    position: { x: 9, y: 0, w: 3, h: 2 },
                    config: {
                        title: 'Alarm Status',
                        dataSource: 'accudaq/alarm',
                        colorOn: '#e74c3c',
                        colorOff: '#27ae60',
                    },
                },
            ],
            layout: 'grid',
            theme: 'dark',
        },
    }
}

export const createDataLoggerProject = (name: string = 'Data Logger'): DAQProject => {
    const ids = {
        mockDevice1: uuidv4(),
        mockDevice2: uuidv4(),
        csvStorage: uuidv4(),
    }
    
    return {
        meta: {
            name,
            version: '1.0.0',
            schemaVersion: '2.0.0',
            description: 'Multi-channel data acquisition and logging',
            author: '',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
        },
        settings: {
            tickInterval: 100,
            autoSave: true,
            debugMode: false,
        },
        devices: [],
        logic: {
            nodes: [
                {
                    id: ids.mockDevice1,
                    type: 'daq:mock_device',
                    label: 'Sensor Channel 1',
                    position: { x: 100, y: 100 },
                    properties: {
                        device_name: 'Channel01',
                        wave_type: 'sine',
                        amplitude: 10,
                        offset: 50,
                        frequency: 0.1,
                        interval_ms: 500,
                        broker_host: 'localhost',
                        broker_port: 1883,
                        topic: 'accudaq/ch1',
                    },
                },
                {
                    id: ids.mockDevice2,
                    type: 'daq:mock_device',
                    label: 'Sensor Channel 2',
                    position: { x: 100, y: 300 },
                    properties: {
                        device_name: 'Channel02',
                        wave_type: 'random',
                        amplitude: 5,
                        offset: 25,
                        frequency: 0.2,
                        interval_ms: 500,
                        broker_host: 'localhost',
                        broker_port: 1883,
                        topic: 'accudaq/ch2',
                    },
                },
                {
                    id: ids.csvStorage,
                    type: 'daq:csv_storage',
                    label: 'Multi-Channel Logger',
                    position: { x: 450, y: 200 },
                    properties: {
                        file_path: './data/multi_channel.csv',
                        append_mode: true,
                        include_timestamp: true,
                        flush_interval: 5,
                    },
                },
            ],
            wires: [
                {
                    id: uuidv4(),
                    source: { nodeId: ids.mockDevice1, portId: 'value' },
                    target: { nodeId: ids.csvStorage, portId: 'value' },
                },
            ],
        },
        ui: {
            widgets: [
                {
                    id: uuidv4(),
                    type: 'line_chart',
                    position: { x: 0, y: 0, w: 12, h: 4 },
                    config: {
                        title: 'Multi-Channel Data',
                        dataSource: 'accudaq/ch1',
                        color: '#3498db',
                    },
                },
            ],
            layout: 'grid',
            theme: 'dark',
        },
    }
}

export const projectTemplates: ProjectTemplate[] = [
    {
        id: 'blank',
        name: 'Blank Project',
        description: 'Start with an empty canvas',
        icon: '📄',
        project: createBlankProject(),
    },
    {
        id: 'temperature_monitor',
        name: 'Temperature Monitor',
        description: 'Monitor temperature with threshold alarm and data logging',
        icon: '🌡️',
        project: createTemperatureMonitorProject(),
    },
    {
        id: 'data_logger',
        name: 'Data Logger',
        description: 'Multi-channel data acquisition and CSV logging',
        icon: '📊',
        project: createDataLoggerProject(),
    },
]

export default projectTemplates

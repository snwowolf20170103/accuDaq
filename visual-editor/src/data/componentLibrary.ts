import { ComponentDefinition } from '../types'

export const componentLibrary: ComponentDefinition[] = [
    // Device Components
    {
        type: 'mock_device',
        name: 'Mock Device',
        category: 'device',
        icon: '🎲',
        description: 'Simulated sensor data',
        inputs: [],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'data', name: 'Data', type: 'object' },
        ],
        defaultProperties: {
            wave_type: 'sine',
            amplitude: 10,
            offset: 25,
            frequency: 0.1,
            interval_ms: 1000,
            device_name: 'Sensor01',
            broker_host: 'localhost',
            broker_port: 1883,
            topic: 'accudaq/demo/sensor',
        },
        propertySchema: [
            { key: 'device_name', label: 'Device Name', type: 'string' },
            { key: 'broker_host', label: 'Broker Host', type: 'string' },
            { key: 'broker_port', label: 'Broker Port', type: 'number' },
            { key: 'topic', label: 'Topic', type: 'string' },
            {
                key: 'wave_type', label: 'Wave Type', type: 'select', options: [
                    { value: 'sine', label: 'Sine Wave' },
                    { value: 'square', label: 'Square Wave' },
                    { value: 'random', label: 'Random' },
                ]
            },
            { key: 'amplitude', label: 'Amplitude', type: 'number' },
            { key: 'offset', label: 'Offset', type: 'number' },
            { key: 'frequency', label: 'Frequency', type: 'number' },
            { key: 'interval_ms', label: 'Interval (ms)', type: 'number' },
        ]
    },

    // Communication Components
    {
        type: 'mqtt_subscribe',
        name: 'MQTT Subscribe',
        category: 'comm',
        icon: '📡',
        description: 'Subscribe to MQTT topic',
        inputs: [],
        outputs: [
            { id: 'data', name: 'Data', type: 'any' },
            { id: 'topic', name: 'Topic', type: 'string' },
        ],
        defaultProperties: {
            broker_host: 'localhost',
            broker_port: 1883,
            topic: 'accudaq/demo/sensor',
        },
        propertySchema: [
            { key: 'broker_host', label: 'Broker Host', type: 'string' },
            { key: 'broker_port', label: 'Broker Port', type: 'number' },
            { key: 'topic', label: 'Topic', type: 'string' },
        ]
    },
    {
        type: 'mqtt_publish',
        name: 'MQTT Publish',
        category: 'comm',
        icon: '📤',
        description: 'Publish to MQTT topic',
        inputs: [
            { id: 'data', name: 'Data', type: 'any' },
        ],
        outputs: [
            { id: 'success', name: 'Success', type: 'boolean' },
        ],
        defaultProperties: {
            broker_host: 'localhost',
            broker_port: 1883,
            topic: 'accudaq/demo/output',
        },
        propertySchema: [
            { key: 'broker_host', label: 'Broker Host', type: 'string' },
            { key: 'broker_port', label: 'Broker Port', type: 'number' },
            { key: 'topic', label: 'Topic', type: 'string' },
        ]
    },

    // Logic Components
    {
        type: 'math',
        name: 'Math Operation',
        category: 'logic',
        icon: '🔢',
        description: 'Mathematical operations',
        inputs: [
            { id: 'input1', name: 'Input 1', type: 'number' },
            { id: 'input2', name: 'Input 2', type: 'number' },
        ],
        outputs: [
            { id: 'result', name: 'Result', type: 'number' },
            { id: 'exceeded', name: 'Exceeded', type: 'boolean' },
        ],
        defaultProperties: {
            operation: 'scale',
            scale: 1.0,
            offset: 0,
            threshold: 100,
        },
        propertySchema: [
            {
                key: 'operation', label: 'Operation', type: 'select', options: [
                    { value: 'add', label: 'Add' },
                    { value: 'subtract', label: 'Subtract' },
                    { value: 'multiply', label: 'Multiply' },
                    { value: 'divide', label: 'Divide' },
                    { value: 'scale', label: 'Scale' },
                ]
            },
            { key: 'scale', label: 'Scale Factor', type: 'number' },
            { key: 'offset', label: 'Offset', type: 'number' },
            { key: 'threshold', label: 'Threshold', type: 'number' },
        ]
    },
    {
        type: 'compare',
        name: 'Compare',
        category: 'logic',
        icon: '⚖️',
        description: 'Compare values',
        inputs: [
            { id: 'input1', name: 'Input 1', type: 'number' },
            { id: 'input2', name: 'Input 2', type: 'number' },
        ],
        outputs: [
            { id: 'result', name: 'Result', type: 'boolean' },
            { id: 'difference', name: 'Difference', type: 'number' },
        ],
        defaultProperties: {
            compare_type: 'greater',
            tolerance: 0.0001,
        },
        propertySchema: [
            {
                key: 'compare_type', label: 'Compare Type', type: 'select', options: [
                    { value: 'equal', label: 'Equal' },
                    { value: 'greater', label: 'Greater Than' },
                    { value: 'less', label: 'Less Than' },
                    { value: 'greater_equal', label: 'Greater or Equal' },
                    { value: 'less_equal', label: 'Less or Equal' },
                ]
            },
            { key: 'tolerance', label: 'Tolerance', type: 'number' },
        ]
    },

    // Storage Components
    {
        type: 'csv_storage',
        name: 'CSV Storage',
        category: 'storage',
        icon: '📁',
        description: 'Save data to CSV file',
        inputs: [
            { id: 'value', name: 'Value', type: 'any' },
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'rows_written', name: 'Rows Written', type: 'number' },
        ],
        defaultProperties: {
            file_path: './data/output.csv',
            append_mode: true,
            include_timestamp: true,
            flush_interval: 10,
        },
        propertySchema: [
            { key: 'file_path', label: 'File Path', type: 'string' },
            { key: 'append_mode', label: 'Append Mode', type: 'boolean' },
            { key: 'include_timestamp', label: 'Include Timestamp', type: 'boolean' },
            { key: 'flush_interval', label: 'Flush Interval', type: 'number' },
        ]
    },
]

export default componentLibrary

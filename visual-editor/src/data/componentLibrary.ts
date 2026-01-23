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
    {
        type: 'custom_script',
        name: 'Custom Script',
        category: 'logic',
        icon: '🧩',
        description: 'User-defined logic with Blockly',
        inputs: [
            { id: 'input1', name: 'Input 1', type: 'number' },
            { id: 'input2', name: 'Input 2', type: 'number' },
        ],
        outputs: [
            { id: 'output1', name: 'Output 1', type: 'number' },
        ],
        defaultProperties: {
            blocklyXml: '',
            generatedCode: '',
        },
        propertySchema: [
            { key: 'blocklyXml', label: 'Blockly XML', type: 'hidden' },
            { key: 'generatedCode', label: 'Generated Code', type: 'code', readonly: true },
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

    // 新增组件 - Modbus TCP
    {
        type: 'modbus_tcp',
        name: 'Modbus TCP',
        category: 'device',
        icon: '🏭',
        description: 'Read from Modbus TCP device',
        inputs: [],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            host: '127.0.0.1',
            port: 502,
            register: 0,
            count: 1,
            slave_id: 1,
            data_type: 'uint16',
        },
        propertySchema: [
            { key: 'host', label: 'Host', type: 'string' },
            { key: 'port', label: 'Port', type: 'number' },
            { key: 'register', label: 'Register Address', type: 'number' },
            { key: 'count', label: 'Register Count', type: 'number' },
            { key: 'slave_id', label: 'Slave ID', type: 'number' },
            {
                key: 'data_type', label: 'Data Type', type: 'select', options: [
                    { value: 'uint16', label: 'Unsigned Int 16' },
                    { value: 'int16', label: 'Signed Int 16' },
                    { value: 'float32', label: 'Float 32' },
                ]
            },
        ]
    },

    // 新增组件 - Threshold Alarm
    {
        type: 'threshold_alarm',
        name: 'Threshold Alarm',
        category: 'logic',
        icon: '🚨',
        description: 'Trigger alarm when value exceeds threshold',
        inputs: [
            { id: 'value', name: 'Value', type: 'number' },
        ],
        outputs: [
            { id: 'alarm', name: 'Alarm', type: 'boolean' },
            { id: 'value_out', name: 'Value Out', type: 'number' },
        ],
        defaultProperties: {
            threshold: 30.0,
            compare_type: 'greater',
        },
        propertySchema: [
            { key: 'threshold', label: 'Threshold', type: 'number' },
            {
                key: 'compare_type', label: 'Compare Type', type: 'select', options: [
                    { value: 'greater', label: 'Greater Than' },
                    { value: 'less', label: 'Less Than' },
                    { value: 'equal', label: 'Equal' },
                    { value: 'greater_equal', label: 'Greater or Equal' },
                    { value: 'less_equal', label: 'Less or Equal' },
                ]
            },
        ]
    },

    // 新增组件 - Debug Print
    {
        type: 'debug_print',
        name: 'Debug Print',
        category: 'logic',
        icon: '🐛',
        description: 'Print values to console for debugging',
        inputs: [
            { id: 'value', name: 'Value', type: 'any' },
        ],
        outputs: [
            { id: 'value_out', name: 'Value Out', type: 'any' },
        ],
        defaultProperties: {
            prefix: 'DEBUG',
            format: 'simple',
        },
        propertySchema: [
            { key: 'prefix', label: 'Prefix', type: 'string' },
            {
                key: 'format', label: 'Format', type: 'select', options: [
                    { value: 'simple', label: 'Simple' },
                    { value: 'json', label: 'JSON' },
                ]
            },
        ]
    },

    // 新增组件 - Global Variable
    {
        type: 'global_variable',
        name: 'Global Variable',
        category: 'logic',
        icon: '📦',
        description: 'Read/Write global variables',
        inputs: [
            { id: 'value_in', name: 'Value In', type: 'any' },
        ],
        outputs: [
            { id: 'value_out', name: 'Value Out', type: 'any' },
        ],
        defaultProperties: {
            variable_name: 'global_var',
            mode: 'read_write',
            initial_value: 0,
        },
        propertySchema: [
            { key: 'variable_name', label: 'Variable Name', type: 'string' },
            {
                key: 'mode', label: 'Mode', type: 'select', options: [
                    { value: 'read', label: 'Read Only' },
                    { value: 'write', label: 'Write Only' },
                    { value: 'read_write', label: 'Read & Write' },
                ]
            },
            { key: 'initial_value', label: 'Initial Value', type: 'number' },
        ]
    },
]

export default componentLibrary

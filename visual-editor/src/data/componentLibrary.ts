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

    // Serial Port Component
    {
        type: 'serial_port',
        name: 'Serial Port',
        category: 'device',
        icon: '🔌',
        description: 'Serial port communication',
        inputs: [
            { id: 'write_data', name: 'Write Data', type: 'string' },
            { id: 'send_trigger', name: 'Send Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'read_data', name: 'Read Data', type: 'string' },
            { id: 'raw_bytes', name: 'Raw Bytes', type: 'array' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
            { id: 'rx_count', name: 'RX Count', type: 'number' },
            { id: 'tx_count', name: 'TX Count', type: 'number' },
        ],
        defaultProperties: {
            port: 'COM1',
            baudrate: 9600,
            bytesize: 8,
            parity: 'N',
            stopbits: 1,
            timeout: 0.5,
            auto_reconnect: true,
            data_format: 'ascii',
        },
        propertySchema: [
            { key: 'port', label: 'Port', type: 'string' },
            {
                key: 'baudrate', label: 'Baud Rate', type: 'select', options: [
                    { value: 9600, label: '9600' },
                    { value: 19200, label: '19200' },
                    { value: 38400, label: '38400' },
                    { value: 57600, label: '57600' },
                    { value: 115200, label: '115200' },
                ]
            },
            { key: 'bytesize', label: 'Data Bits', type: 'number' },
            {
                key: 'parity', label: 'Parity', type: 'select', options: [
                    { value: 'N', label: 'None' },
                    { value: 'E', label: 'Even' },
                    { value: 'O', label: 'Odd' },
                ]
            },
            { key: 'stopbits', label: 'Stop Bits', type: 'number' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
            {
                key: 'data_format', label: 'Data Format', type: 'select', options: [
                    { value: 'ascii', label: 'ASCII' },
                    { value: 'hex', label: 'HEX' },
                    { value: 'raw', label: 'Raw' },
                ]
            },
        ]
    },

    // Modbus RTU Component
    {
        type: 'modbus_rtu',
        name: 'Modbus RTU',
        category: 'device',
        icon: '🏭',
        description: 'Modbus RTU serial communication',
        inputs: [
            { id: 'write_value', name: 'Write Value', type: 'number' },
            { id: 'write_trigger', name: 'Write Trigger', type: 'boolean' },
            { id: 'write_address', name: 'Write Address', type: 'number' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'values', name: 'Values', type: 'array' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            port: 'COM1',
            baudrate: 9600,
            parity: 'N',
            slave_id: 1,
            register_address: 0,
            register_count: 1,
            register_type: 'holding',
            data_type: 'uint16',
            poll_interval_ms: 1000,
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'port', label: 'Port', type: 'string' },
            {
                key: 'baudrate', label: 'Baud Rate', type: 'select', options: [
                    { value: 9600, label: '9600' },
                    { value: 19200, label: '19200' },
                    { value: 38400, label: '38400' },
                    { value: 115200, label: '115200' },
                ]
            },
            {
                key: 'parity', label: 'Parity', type: 'select', options: [
                    { value: 'N', label: 'None' },
                    { value: 'E', label: 'Even' },
                    { value: 'O', label: 'Odd' },
                ]
            },
            { key: 'slave_id', label: 'Slave ID', type: 'number' },
            { key: 'register_address', label: 'Register Address', type: 'number' },
            { key: 'register_count', label: 'Register Count', type: 'number' },
            {
                key: 'register_type', label: 'Register Type', type: 'select', options: [
                    { value: 'holding', label: 'Holding Registers' },
                    { value: 'input', label: 'Input Registers' },
                    { value: 'coil', label: 'Coils' },
                    { value: 'discrete', label: 'Discrete Inputs' },
                ]
            },
            {
                key: 'data_type', label: 'Data Type', type: 'select', options: [
                    { value: 'uint16', label: 'Unsigned Int 16' },
                    { value: 'int16', label: 'Signed Int 16' },
                    { value: 'float32', label: 'Float 32' },
                ]
            },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // SCPI Device Component
    {
        type: 'scpi_device',
        name: 'SCPI Device',
        category: 'device',
        icon: '📟',
        description: 'SCPI/VISA instrument control',
        inputs: [
            { id: 'command', name: 'Command', type: 'string' },
            { id: 'send_trigger', name: 'Send Trigger', type: 'boolean' },
            { id: 'query', name: 'Query', type: 'string' },
            { id: 'query_trigger', name: 'Query Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'response', name: 'Response', type: 'string' },
            { id: 'numeric_value', name: 'Numeric Value', type: 'number' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'idn', name: 'IDN', type: 'string' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            resource_name: 'GPIB0::1::INSTR',
            timeout: 5000,
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'resource_name', label: 'VISA Resource', type: 'string' },
            { key: 'timeout', label: 'Timeout (ms)', type: 'number' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // USB Device Component
    {
        type: 'usb_device',
        name: 'USB Device',
        category: 'device',
        icon: '🔌',
        description: 'USB bulk transfer communication',
        inputs: [
            { id: 'write_data', name: 'Write Data', type: 'array' },
            { id: 'send_trigger', name: 'Send Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'read_data', name: 'Read Data', type: 'array' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'device_info', name: 'Device Info', type: 'object' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            vendor_id: 0,
            product_id: 0,
            interface: 0,
            endpoint_in: 0x81,
            endpoint_out: 0x01,
            timeout: 1000,
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'vendor_id', label: 'Vendor ID (hex)', type: 'string' },
            { key: 'product_id', label: 'Product ID (hex)', type: 'string' },
            { key: 'interface', label: 'Interface', type: 'number' },
            { key: 'endpoint_in', label: 'Endpoint In', type: 'number' },
            { key: 'endpoint_out', label: 'Endpoint Out', type: 'number' },
            { key: 'timeout', label: 'Timeout (ms)', type: 'number' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // USB HID Component
    {
        type: 'usb_hid',
        name: 'USB HID',
        category: 'device',
        icon: '🎮',
        description: 'USB HID device communication',
        inputs: [
            { id: 'write_data', name: 'Write Data', type: 'array' },
            { id: 'send_trigger', name: 'Send Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'read_data', name: 'Read Data', type: 'array' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            vendor_id: 0,
            product_id: 0,
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'vendor_id', label: 'Vendor ID (hex)', type: 'string' },
            { key: 'product_id', label: 'Product ID (hex)', type: 'string' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // Bluetooth RFCOMM Component
    {
        type: 'bluetooth_rfcomm',
        name: 'Bluetooth RFCOMM',
        category: 'device',
        icon: '📶',
        description: 'Classic Bluetooth RFCOMM communication',
        inputs: [
            { id: 'write_data', name: 'Write Data', type: 'string' },
            { id: 'send_trigger', name: 'Send Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'read_data', name: 'Read Data', type: 'string' },
            { id: 'raw_bytes', name: 'Raw Bytes', type: 'array' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            address: '',
            port: 1,
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'address', label: 'Bluetooth Address', type: 'string' },
            { key: 'port', label: 'RFCOMM Port', type: 'number' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // BLE Device Component
    {
        type: 'ble_device',
        name: 'BLE Device',
        category: 'device',
        icon: '📡',
        description: 'Bluetooth Low Energy communication',
        inputs: [
            { id: 'write_value', name: 'Write Value', type: 'array' },
            { id: 'write_trigger', name: 'Write Trigger', type: 'boolean' },
            { id: 'read_trigger', name: 'Read Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'read_value', name: 'Read Value', type: 'array' },
            { id: 'notification', name: 'Notification', type: 'array' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            address: '',
            service_uuid: '',
            characteristic_uuid: '',
            enable_notifications: true,
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'address', label: 'BLE Address', type: 'string' },
            { key: 'service_uuid', label: 'Service UUID', type: 'string' },
            { key: 'characteristic_uuid', label: 'Characteristic UUID', type: 'string' },
            { key: 'enable_notifications', label: 'Enable Notifications', type: 'boolean' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // ============ OPC UA Components ============

    // OPC UA Client Component
    {
        type: 'opc_ua_client',
        name: 'OPC UA Client',
        category: 'device',
        icon: '🏭',
        description: 'Connect to OPC UA Server',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'client_ref', name: 'Client Ref', type: 'any' },  // 组件引用，连接到 Reader
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'server_state', name: 'Server State', type: 'string' },
            { id: 'namespace_array', name: 'Namespaces', type: 'array' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            endpoint: 'opc.tcp://localhost:4840',
            username: '',
            password: '',
            security_policy: '',
            auto_reconnect: true,
            reconnect_interval: 5,
        },
        propertySchema: [
            { key: 'endpoint', label: 'Endpoint URL', type: 'string' },
            { key: 'username', label: 'Username', type: 'string' },
            { key: 'password', label: 'Password', type: 'string' },
            {
                key: 'security_policy', label: 'Security Policy', type: 'select', options: [
                    { value: '', label: 'None' },
                    { value: 'Basic256Sha256', label: 'Basic256Sha256' },
                    { value: 'Basic128Rsa15', label: 'Basic128Rsa15' },
                ]
            },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
            { key: 'reconnect_interval', label: 'Reconnect Interval (s)', type: 'number' },
        ]
    },

    // OPC UA Node Reader Component
    {
        type: 'opc_ua_reader',
        name: 'OPC UA Reader',
        category: 'device',
        icon: '📖',
        description: 'Read OPC UA node values with MQTT forwarding',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'any' },
            { id: 'quality', name: 'Quality', type: 'string' },
            { id: 'timestamp', name: 'Timestamp', type: 'string' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
        ],
        defaultProperties: {
            node_id: 'ns=2;i=1',
            poll_interval_ms: 1000,
            data_type: 'auto',
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'opcua/data',
        },
        propertySchema: [
            { key: 'node_id', label: 'Node ID', type: 'string' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            {
                key: 'data_type', label: 'Data Type', type: 'select', options: [
                    { value: 'auto', label: 'Auto' },
                    { value: 'float', label: 'Float' },
                    { value: 'int', label: 'Integer' },
                    { value: 'string', label: 'String' },
                    { value: 'bool', label: 'Boolean' },
                ]
            },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'string' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'string' },
        ]
    },

    // OPC UA Node Writer Component
    {
        type: 'opc_ua_writer',
        name: 'OPC UA Writer',
        category: 'device',
        icon: '✏️',
        description: 'Write values to OPC UA nodes',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
            { id: 'value', name: 'Value', type: 'any' },
            { id: 'trigger', name: 'Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'success', name: 'Success', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            node_id: 'ns=2;i=1',
            data_type: 'auto',
        },
        propertySchema: [
            { key: 'node_id', label: 'Node ID', type: 'string' },
            {
                key: 'data_type', label: 'Data Type', type: 'select', options: [
                    { value: 'auto', label: 'Auto' },
                    { value: 'float', label: 'Float' },
                    { value: 'int', label: 'Integer' },
                    { value: 'string', label: 'String' },
                    { value: 'bool', label: 'Boolean' },
                ]
            },
        ]
    },

    // OPC UA Subscription Component
    {
        type: 'opc_ua_subscription',
        name: 'OPC UA Subscription',
        category: 'device',
        icon: '🔔',
        description: 'Subscribe to OPC UA node changes with MQTT forwarding',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
        ],
        outputs: [
            { id: 'values', name: 'Values', type: 'object' },
            { id: 'last_value', name: 'Last Value', type: 'number' },
            { id: 'changed', name: 'Changed', type: 'boolean' },
            { id: 'change_count', name: 'Change Count', type: 'number' },
        ],
        defaultProperties: {
            node_ids: ['ns=2;i=1'],
            publish_interval_ms: 500,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'opcua/subscription',
        },
        propertySchema: [
            { key: 'node_ids', label: 'Node IDs (comma separated)', type: 'string' },
            { key: 'publish_interval_ms', label: 'Publish Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'string' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'string' },
        ]
    },

    // MQTT Broker Component
    {
        type: 'mqtt_broker',
        name: 'MQTT Broker',
        category: 'comm',
        icon: '📶',
        description: 'Start a local MQTT Broker',
        inputs: [],
        outputs: [
            { id: 'status', name: 'Status', type: 'string' },
            { id: 'client_count', name: 'Clients', type: 'number' },
        ],
        defaultProperties: {
            port: 1883,
            ws_port: 8083,
            auto_start: true,
        },
        propertySchema: [
            { key: 'port', label: 'TCP Port', type: 'number' },
            { key: 'ws_port', label: 'WebSocket Port', type: 'number' },
            { key: 'auto_start', label: 'Auto Start', type: 'boolean' },
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
            { id: 'data', name: 'Data', type: 'object' },
            { id: 'value', name: 'Value', type: 'any' },
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'row_count', name: 'Row Count', type: 'number' },
            { id: 'success', name: 'Success', type: 'boolean' },
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

    // Redis Cache Component
    {
        type: 'redis_cache',
        name: 'Redis Cache',
        category: 'storage',
        icon: '🔴',
        description: 'Store and retrieve data from Redis cache',
        inputs: [
            { id: 'data', name: 'Data', type: 'any' },
            { id: 'key', name: 'Key', type: 'string' },
            { id: 'operation', name: 'Operation', type: 'string' },
        ],
        outputs: [
            { id: 'result', name: 'Result', type: 'any' },
            { id: 'success', name: 'Success', type: 'boolean' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            host: 'localhost',
            port: 6379,
            password: '',
            db: 0,
            key_prefix: 'daq:',
            default_ttl: 3600,
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'host', label: 'Redis Host', type: 'string' },
            { key: 'port', label: 'Redis Port', type: 'number' },
            { key: 'password', label: 'Password', type: 'password' },
            { key: 'db', label: 'Database Index', type: 'number' },
            { key: 'key_prefix', label: 'Key Prefix', type: 'string' },
            { key: 'default_ttl', label: 'Default TTL (seconds)', type: 'number' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // SQLite Storage Component
    {
        type: 'sqlite_storage',
        name: 'SQLite Storage',
        category: 'storage',
        icon: '💾',
        description: 'Store data to local SQLite database',
        inputs: [
            { id: 'data', name: 'Data', type: 'object' },
            { id: 'query', name: 'Query', type: 'string' },
        ],
        outputs: [
            { id: 'result', name: 'Result', type: 'array' },
            { id: 'row_count', name: 'Row Count', type: 'number' },
            { id: 'success', name: 'Success', type: 'boolean' },
        ],
        defaultProperties: {
            database_path: './data/daq_data.db',
            table_name: 'sensor_data',
            auto_create_table: true,
            include_timestamp: true,
            batch_size: 100,
            flush_interval_ms: 5000,
        },
        propertySchema: [
            { key: 'database_path', label: 'Database Path', type: 'string' },
            { key: 'table_name', label: 'Table Name', type: 'string' },
            { key: 'auto_create_table', label: 'Auto Create Table', type: 'boolean' },
            { key: 'include_timestamp', label: 'Include Timestamp', type: 'boolean' },
            { key: 'batch_size', label: 'Batch Size', type: 'number' },
            { key: 'flush_interval_ms', label: 'Flush Interval (ms)', type: 'number' },
        ]
    },

    // InfluxDB Time-Series Database Component
    {
        type: 'influxdb_storage',
        name: 'InfluxDB',
        category: 'storage',
        icon: '📊',
        description: 'Store time-series data to InfluxDB',
        inputs: [
            { id: 'measurement', name: 'Measurement', type: 'string' },
            { id: 'fields', name: 'Fields', type: 'object' },
            { id: 'tags', name: 'Tags', type: 'object' },
            { id: 'timestamp', name: 'Timestamp', type: 'number' },
        ],
        outputs: [
            { id: 'success', name: 'Success', type: 'boolean' },
            { id: 'write_count', name: 'Write Count', type: 'number' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            url: 'http://localhost:8086',
            token: '',
            org: 'daq_org',
            bucket: 'daq_data',
            measurement: 'sensor_readings',
            batch_size: 1000,
            flush_interval_ms: 1000,
            precision: 'ms',
            auto_reconnect: true,
        },
        propertySchema: [
            { key: 'url', label: 'InfluxDB URL', type: 'string' },
            { key: 'token', label: 'API Token', type: 'password' },
            { key: 'org', label: 'Organization', type: 'string' },
            { key: 'bucket', label: 'Bucket', type: 'string' },
            { key: 'measurement', label: 'Default Measurement', type: 'string' },
            { key: 'batch_size', label: 'Batch Size', type: 'number' },
            { key: 'flush_interval_ms', label: 'Flush Interval (ms)', type: 'number' },
            {
                key: 'precision', label: 'Precision', type: 'select', options: [
                    { value: 'ns', label: 'Nanoseconds' },
                    { value: 'us', label: 'Microseconds' },
                    { value: 'ms', label: 'Milliseconds' },
                    { value: 's', label: 'Seconds' },
                ]
            },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
        ]
    },

    // TimescaleDB Component (PostgreSQL-based time-series)
    {
        type: 'timescaledb_storage',
        name: 'TimescaleDB',
        category: 'storage',
        icon: '⏱️',
        description: 'Store time-series data to TimescaleDB (PostgreSQL)',
        inputs: [
            { id: 'data', name: 'Data', type: 'object' },
            { id: 'table', name: 'Table', type: 'string' },
        ],
        outputs: [
            { id: 'success', name: 'Success', type: 'boolean' },
            { id: 'row_count', name: 'Row Count', type: 'number' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            host: 'localhost',
            port: 5432,
            database: 'daq_timeseries',
            username: 'postgres',
            password: '',
            table_name: 'sensor_data',
            time_column: 'timestamp',
            chunk_interval: '1 day',
            batch_size: 1000,
            auto_create_hypertable: true,
        },
        propertySchema: [
            { key: 'host', label: 'Host', type: 'string' },
            { key: 'port', label: 'Port', type: 'number' },
            { key: 'database', label: 'Database', type: 'string' },
            { key: 'username', label: 'Username', type: 'string' },
            { key: 'password', label: 'Password', type: 'password' },
            { key: 'table_name', label: 'Table Name', type: 'string' },
            { key: 'time_column', label: 'Time Column', type: 'string' },
            { key: 'chunk_interval', label: 'Chunk Interval', type: 'string' },
            { key: 'batch_size', label: 'Batch Size', type: 'number' },
            { key: 'auto_create_hypertable', label: 'Auto Create Hypertable', type: 'boolean' },
        ]
    },

    // 新增组件 - Modbus TCP (增强版)
    {
        type: 'modbus_tcp',
        name: 'Modbus TCP',
        category: 'device',
        icon: '🏭',
        description: 'Modbus TCP 客户端，支持轮询和 MQTT 推送',
        inputs: [
            { id: 'write_value', name: 'Write Value', type: 'number' },
            { id: 'write_trigger', name: 'Write Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'values', name: 'Values', type: 'array' },
            { id: 'data', name: 'Data', type: 'object' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            host: '127.0.0.1',
            port: 502,
            slave_id: 1,
            register_address: 0,
            register_count: 6,
            register_type: 'holding',
            data_type: 'uint16',
            poll_interval_ms: 1000,
            auto_reconnect: true,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'modbus/data',
        },
        propertySchema: [
            { key: 'host', label: 'Host', type: 'string' },
            { key: 'port', label: 'Port', type: 'number' },
            { key: 'slave_id', label: 'Slave ID', type: 'number' },
            { key: 'register_address', label: 'Register Address', type: 'number' },
            { key: 'register_count', label: 'Register Count', type: 'number' },
            {
                key: 'register_type', label: 'Register Type', type: 'select', options: [
                    { value: 'holding', label: 'Holding Registers' },
                    { value: 'input', label: 'Input Registers' },
                ]
            },
            {
                key: 'data_type', label: 'Data Type', type: 'select', options: [
                    { value: 'uint16', label: 'Unsigned Int 16' },
                    { value: 'int16', label: 'Signed Int 16' },
                    { value: 'float32', label: 'Float 32' },
                ]
            },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'auto_reconnect', label: 'Auto Reconnect', type: 'boolean' },
            { key: 'mqtt_enabled', label: 'Enable MQTT Forward', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'string' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'string' },
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

    // Timer 组件
    {
        type: 'timer',
        name: 'Timer',
        category: 'logic',
        icon: '⏱️',
        description: 'Periodic trigger signal generator',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
        ],
        outputs: [
            { id: 'trigger', name: 'Trigger', type: 'boolean' },
            { id: 'elapsed_ms', name: 'Elapsed (ms)', type: 'number' },
            { id: 'tick_count', name: 'Tick Count', type: 'number' },
        ],
        defaultProperties: {
            interval_ms: 1000,
            auto_start: true,
        },
        propertySchema: [
            { key: 'interval_ms', label: 'Interval (ms)', type: 'number' },
            { key: 'auto_start', label: 'Auto Start', type: 'boolean' },
        ]
    },

    // Counter 组件
    {
        type: 'counter',
        name: 'Counter',
        category: 'logic',
        icon: '🔢',
        description: 'Increment/decrement counter',
        inputs: [
            { id: 'increment', name: 'Increment', type: 'boolean' },
            { id: 'decrement', name: 'Decrement', type: 'boolean' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
            { id: 'set_value', name: 'Set Value', type: 'number' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'at_min', name: 'At Min', type: 'boolean' },
            { id: 'at_max', name: 'At Max', type: 'boolean' },
        ],
        defaultProperties: {
            initial_value: 0,
            step: 1,
            min_value: null,
            max_value: null,
        },
        propertySchema: [
            { key: 'initial_value', label: 'Initial Value', type: 'number' },
            { key: 'step', label: 'Step', type: 'number' },
            { key: 'min_value', label: 'Min Value', type: 'number' },
            { key: 'max_value', label: 'Max Value', type: 'number' },
        ]
    },

    // ============ 控制流组件 ============
    // While Loop 组件
    {
        type: 'while_loop',
        name: 'While Loop',
        category: 'logic',
        icon: '🔄',
        description: 'Periodic loop control',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
            { id: 'condition', name: 'Condition', type: 'boolean' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
            { id: 'data_in', name: 'Data In', type: 'any' },
        ],
        outputs: [
            { id: 'loop_body', name: 'Loop Body', type: 'boolean' },
            { id: 'iteration', name: 'Iteration', type: 'number' },
            { id: 'is_running', name: 'Is Running', type: 'boolean' },
            { id: 'data_out', name: 'Data Out', type: 'any' },
            { id: 'completed', name: 'Completed', type: 'boolean' },
        ],
        defaultProperties: {
            max_iterations: 0,
            interval_ms: 100,
            auto_start: false,
        },
        propertySchema: [
            { key: 'max_iterations', label: 'Max Iterations (0=infinite)', type: 'number' },
            { key: 'interval_ms', label: 'Interval (ms)', type: 'number' },
            { key: 'auto_start', label: 'Auto Start', type: 'boolean' },
        ]
    },

    // Conditional 组件
    {
        type: 'conditional',
        name: 'Conditional',
        category: 'logic',
        icon: '🔀',
        description: 'If-else conditional branching',
        inputs: [
            { id: 'condition', name: 'Condition', type: 'boolean' },
            { id: 'value1', name: 'Value 1', type: 'number' },
            { id: 'value2', name: 'Value 2', type: 'number' },
            { id: 'data_in', name: 'Data In', type: 'any' },
        ],
        outputs: [
            { id: 'true_out', name: 'True Out', type: 'any' },
            { id: 'false_out', name: 'False Out', type: 'any' },
            { id: 'result', name: 'Result', type: 'boolean' },
            { id: 'true_trigger', name: 'True Trigger', type: 'boolean' },
            { id: 'false_trigger', name: 'False Trigger', type: 'boolean' },
        ],
        defaultProperties: {
            mode: 'direct',
            compare_type: 'greater',
            logic_type: 'and',
            threshold: 0,
            invert_result: false,
            pass_data_through: true,
        },
        propertySchema: [
            {
                key: 'mode', label: 'Mode', type: 'select', options: [
                    { value: 'direct', label: 'Direct (use condition input)' },
                    { value: 'compare', label: 'Compare (compare value1 & value2)' },
                    { value: 'logic', label: 'Logic (combine conditions)' },
                ]
            },
            {
                key: 'compare_type', label: 'Compare Type', type: 'select', options: [
                    { value: 'equal', label: 'Equal' },
                    { value: 'greater', label: 'Greater Than' },
                    { value: 'less', label: 'Less Than' },
                    { value: 'greater_equal', label: 'Greater or Equal' },
                    { value: 'less_equal', label: 'Less or Equal' },
                    { value: 'not_equal', label: 'Not Equal' },
                ]
            },
            {
                key: 'logic_type', label: 'Logic Type', type: 'select', options: [
                    { value: 'and', label: 'AND' },
                    { value: 'or', label: 'OR' },
                    { value: 'not', label: 'NOT' },
                    { value: 'xor', label: 'XOR' },
                ]
            },
            { key: 'threshold', label: 'Threshold', type: 'number' },
            { key: 'invert_result', label: 'Invert Result', type: 'boolean' },
            { key: 'pass_data_through', label: 'Pass Data Through', type: 'boolean' },
        ]
    },

    // ============ 高级算法组件 ============
    {
        type: 'fft',
        name: 'FFT 频谱分析',
        category: 'algorithm',
        icon: '📊',
        description: '快速傅里叶变换，分析信号频谱',
        inputs: [
            { id: 'signal', name: 'Signal', type: 'number' },
        ],
        outputs: [
            { id: 'frequencies', name: 'Frequencies', type: 'array' },
            { id: 'magnitudes', name: 'Magnitudes', type: 'array' },
            { id: 'dominant_freq', name: 'Dominant Freq', type: 'number' },
            { id: 'ready', name: 'Ready', type: 'boolean' },
        ],
        defaultProperties: {
            window_size: 256,
            sample_rate: 1000,
        },
        propertySchema: [
            {
                key: 'window_size', label: 'Window Size', type: 'select', options: [
                    { value: 64, label: '64' },
                    { value: 128, label: '128' },
                    { value: 256, label: '256' },
                    { value: 512, label: '512' },
                    { value: 1024, label: '1024' },
                ]
            },
            { key: 'sample_rate', label: 'Sample Rate (Hz)', type: 'number' },
        ]
    },
    {
        type: 'moving_average_filter',
        name: '移动平均滤波',
        category: 'algorithm',
        icon: '〰️',
        description: '移动平均滤波器，平滑信号',
        inputs: [
            { id: 'input', name: 'Input', type: 'number' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'number' },
            { id: 'variance', name: 'Variance', type: 'number' },
        ],
        defaultProperties: {
            window_size: 10,
        },
        propertySchema: [
            { key: 'window_size', label: 'Window Size', type: 'number' },
        ]
    },
    {
        type: 'low_pass_filter',
        name: '低通滤波器',
        category: 'algorithm',
        icon: '📉',
        description: '一阶低通滤波器，滤除高频噪声',
        inputs: [
            { id: 'input', name: 'Input', type: 'number' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'number' },
        ],
        defaultProperties: {
            alpha: 0.1,
            cutoff_freq: null,
            sample_rate: 1000,
        },
        propertySchema: [
            { key: 'alpha', label: 'Alpha (0-1)', type: 'number' },
            { key: 'cutoff_freq', label: 'Cutoff Freq (Hz)', type: 'number' },
            { key: 'sample_rate', label: 'Sample Rate (Hz)', type: 'number' },
        ]
    },
    {
        type: 'high_pass_filter',
        name: '高通滤波器',
        category: 'algorithm',
        icon: '📈',
        description: '一阶高通滤波器，滤除低频漂移',
        inputs: [
            { id: 'input', name: 'Input', type: 'number' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'number' },
        ],
        defaultProperties: {
            alpha: 0.9,
            cutoff_freq: null,
            sample_rate: 1000,
        },
        propertySchema: [
            { key: 'alpha', label: 'Alpha (0-1)', type: 'number' },
            { key: 'cutoff_freq', label: 'Cutoff Freq (Hz)', type: 'number' },
            { key: 'sample_rate', label: 'Sample Rate (Hz)', type: 'number' },
        ]
    },
    {
        type: 'pid_controller',
        name: 'PID 控制器',
        category: 'algorithm',
        icon: '🎛️',
        description: 'PID 控制算法，用于闭环控制',
        inputs: [
            { id: 'setpoint', name: 'Setpoint', type: 'number' },
            { id: 'process_value', name: 'Process Value', type: 'number' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'number' },
            { id: 'error', name: 'Error', type: 'number' },
            { id: 'p_term', name: 'P Term', type: 'number' },
            { id: 'i_term', name: 'I Term', type: 'number' },
            { id: 'd_term', name: 'D Term', type: 'number' },
        ],
        defaultProperties: {
            kp: 1.0,
            ki: 0.1,
            kd: 0.01,
            output_min: -100,
            output_max: 100,
            dt: 0.1,
        },
        propertySchema: [
            { key: 'kp', label: 'Kp (Proportional)', type: 'number' },
            { key: 'ki', label: 'Ki (Integral)', type: 'number' },
            { key: 'kd', label: 'Kd (Derivative)', type: 'number' },
            { key: 'output_min', label: 'Output Min', type: 'number' },
            { key: 'output_max', label: 'Output Max', type: 'number' },
            { key: 'dt', label: 'Sample Time (s)', type: 'number' },
        ]
    },
    {
        type: 'kalman_filter',
        name: '卡尔曼滤波',
        category: 'algorithm',
        icon: '🔮',
        description: '卡尔曼滤波器，最优状态估计',
        inputs: [
            { id: 'measurement', name: 'Measurement', type: 'number' },
        ],
        outputs: [
            { id: 'estimate', name: 'Estimate', type: 'number' },
            { id: 'uncertainty', name: 'Uncertainty', type: 'number' },
        ],
        defaultProperties: {
            process_noise: 0.01,
            measurement_noise: 0.1,
            initial_estimate: 0,
            initial_uncertainty: 1.0,
        },
        propertySchema: [
            { key: 'process_noise', label: 'Process Noise (Q)', type: 'number' },
            { key: 'measurement_noise', label: 'Measurement Noise (R)', type: 'number' },
            { key: 'initial_estimate', label: 'Initial Estimate', type: 'number' },
            { key: 'initial_uncertainty', label: 'Initial Uncertainty', type: 'number' },
        ]
    },
    {
        type: 'statistics',
        name: '统计分析',
        category: 'algorithm',
        icon: '📐',
        description: '计算均值、标准差、最大最小值',
        inputs: [
            { id: 'input', name: 'Input', type: 'number' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
        ],
        outputs: [
            { id: 'mean', name: 'Mean', type: 'number' },
            { id: 'std', name: 'Std Dev', type: 'number' },
            { id: 'min', name: 'Min', type: 'number' },
            { id: 'max', name: 'Max', type: 'number' },
            { id: 'count', name: 'Count', type: 'number' },
        ],
        defaultProperties: {
            window_size: 100,
        },
        propertySchema: [
            { key: 'window_size', label: 'Window Size', type: 'number' },
        ]
    },

    // ============ 复杂协议组件 ============
    {
        type: 'ethercat_master',
        name: 'EtherCAT 主站',
        category: 'protocol',
        icon: '🔌',
        description: 'EtherCAT 主站，连接 EtherCAT 从站设备',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'master_ref', name: 'Master Ref', type: 'any' },  // 组件引用，连接到 SlaveIO
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'slave_count', name: 'Slave Count', type: 'number' },
            { id: 'state', name: 'State', type: 'string' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            interface: 'eth0',
            cycle_time_ms: 1,
        },
        propertySchema: [
            { key: 'interface', label: 'Network Interface', type: 'text' },
            { key: 'cycle_time_ms', label: 'Cycle Time (ms)', type: 'number' },
        ]
    },
    {
        type: 'ethercat_slave_io',
        name: 'EtherCAT 从站 I/O',
        category: 'protocol',
        icon: '📥',
        description: 'EtherCAT 从站 I/O 读写，支持 MQTT 转发',
        inputs: [
            { id: 'master', name: 'Master', type: 'any' },
            { id: 'write_data', name: 'Write Data', type: 'array' },
        ],
        outputs: [
            { id: 'read_data', name: 'Read Data', type: 'array' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            slave_index: 0,
            input_size: 8,
            output_size: 8,
            poll_interval_ms: 100,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'ethercat/data',
        },
        propertySchema: [
            { key: 'slave_index', label: 'Slave Index', type: 'number' },
            { key: 'input_size', label: 'Input Size (bytes)', type: 'number' },
            { key: 'output_size', label: 'Output Size (bytes)', type: 'number' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    {
        type: 'canopen_master',
        name: 'CANopen 主站',
        category: 'protocol',
        icon: '🚗',
        description: 'CANopen 网络主站',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'network_ref', name: 'Network Ref', type: 'any' },  // 组件引用，连接到 Node/PDO
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'node_count', name: 'Node Count', type: 'number' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            channel: 'can0',
            bustype: 'socketcan',
            bitrate: 500000,
        },
        propertySchema: [
            { key: 'channel', label: 'CAN Channel', type: 'text' },
            {
                key: 'bustype', label: 'Bus Type', type: 'select', options: [
                    { value: 'socketcan', label: 'SocketCAN' },
                    { value: 'pcan', label: 'PCAN' },
                    { value: 'kvaser', label: 'Kvaser' },
                    { value: 'vector', label: 'Vector' },
                ]
            },
            {
                key: 'bitrate', label: 'Bitrate', type: 'select', options: [
                    { value: 125000, label: '125 kbps' },
                    { value: 250000, label: '250 kbps' },
                    { value: 500000, label: '500 kbps' },
                    { value: 1000000, label: '1 Mbps' },
                ]
            },
        ]
    },
    {
        type: 'canopen_node',
        name: 'CANopen 节点',
        category: 'protocol',
        icon: '📍',
        description: 'CANopen 节点对象字典读写，支持 MQTT 转发',
        inputs: [
            { id: 'network', name: 'Network', type: 'any' },
            { id: 'write_value', name: 'Write Value', type: 'number' },
        ],
        outputs: [
            { id: 'read_value', name: 'Read Value', type: 'number' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'state', name: 'State', type: 'string' },
        ],
        defaultProperties: {
            node_id: 1,
            read_index: '0x6000',
            read_subindex: 0,
            write_index: '0x6200',
            write_subindex: 0,
            poll_interval_ms: 100,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'canopen/data',
        },
        propertySchema: [
            { key: 'node_id', label: 'Node ID', type: 'number' },
            { key: 'read_index', label: 'Read Index (hex)', type: 'text' },
            { key: 'read_subindex', label: 'Read Subindex', type: 'number' },
            { key: 'write_index', label: 'Write Index (hex)', type: 'text' },
            { key: 'write_subindex', label: 'Write Subindex', type: 'number' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    {
        type: 'canopen_pdo',
        name: 'CANopen PDO',
        category: 'protocol',
        icon: '📦',
        description: 'CANopen PDO 过程数据对象读写，支持 MQTT 转发',
        inputs: [
            { id: 'network', name: 'Network', type: 'any' },
            { id: 'tx_data', name: 'TX Data', type: 'array' },
        ],
        outputs: [
            { id: 'rx_data', name: 'RX Data', type: 'array' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            node_id: 1,
            pdo_number: 1,
            poll_interval_ms: 100,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'canopen/pdo',
        },
        propertySchema: [
            { key: 'node_id', label: 'Node ID', type: 'number' },
            { key: 'pdo_number', label: 'PDO Number (1-4)', type: 'number' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    {
        type: 'opcua_client',
        name: 'OPC UA 客户端',
        category: 'protocol',
        icon: '🌐',
        description: 'OPC UA 客户端，连接 OPC UA 服务器',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'server_state', name: 'Server State', type: 'string' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            endpoint: 'opc.tcp://localhost:4840',
            username: '',
            password: '',
        },
        propertySchema: [
            { key: 'endpoint', label: 'Endpoint URL', type: 'text' },
            { key: 'username', label: 'Username', type: 'text' },
            { key: 'password', label: 'Password', type: 'password' },
        ]
    },
    {
        type: 'opcua_node_reader',
        name: 'OPC UA 节点读取',
        category: 'protocol',
        icon: '📖',
        description: '读取 OPC UA 服务器节点值，支持 MQTT 转发',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'quality', name: 'Quality', type: 'string' },
            { id: 'timestamp', name: 'Timestamp', type: 'string' },
        ],
        defaultProperties: {
            node_id: 'ns=2;i=1',
            poll_interval_ms: 1000,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'opcua/data',
        },
        propertySchema: [
            { key: 'node_id', label: 'Node ID', type: 'text' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    {
        type: 'opcua_node_writer',
        name: 'OPC UA 节点写入',
        category: 'protocol',
        icon: '✏️',
        description: '写入值到 OPC UA 服务器节点',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'trigger', name: 'Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'success', name: 'Success', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            node_id: 'ns=2;i=1',
        },
        propertySchema: [
            { key: 'node_id', label: 'Node ID', type: 'text' },
        ]
    },
    {
        type: 'opcua_subscription',
        name: 'OPC UA 订阅',
        category: 'protocol',
        icon: '🔔',
        description: '订阅 OPC UA 节点变化，支持 MQTT 转发',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'changed', name: 'Changed', type: 'boolean' },
        ],
        defaultProperties: {
            node_ids: 'ns=2;i=1',
            publish_interval_ms: 500,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'opcua/subscription',
        },
        propertySchema: [
            { key: 'node_ids', label: 'Node IDs (comma separated)', type: 'text' },
            { key: 'publish_interval_ms', label: 'Publish Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },

    // ============ FPGA 组件 ============
    {
        type: 'fpga_device',
        name: 'FPGA 设备',
        category: 'device',
        icon: '🔲',
        description: 'FPGA 板卡连接管理',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'status', name: 'Status', type: 'string' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            interface: 'simulated',
            device_path: '/dev/xdma0_user',
        },
        propertySchema: [
            {
                key: 'interface', label: 'Interface', type: 'select', options: [
                    { value: 'simulated', label: 'Simulated' },
                    { value: 'pcie', label: 'PCIe' },
                    { value: 'axi', label: 'AXI' },
                ]
            },
            { key: 'device_path', label: 'Device Path', type: 'string' },
        ]
    },
    {
        type: 'fpga_register_read',
        name: 'FPGA 寄存器读取',
        category: 'device',
        icon: '📖',
        description: '读取 FPGA 寄存器',
        inputs: [
            { id: 'fpga', name: 'FPGA', type: 'any' },
            { id: 'trigger', name: 'Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'success', name: 'Success', type: 'boolean' },
        ],
        defaultProperties: {
            address: '0x0000',
            width: 32,
            auto_read: true,
            poll_interval_ms: 100,
        },
        propertySchema: [
            { key: 'address', label: 'Address (hex)', type: 'string' },
            {
                key: 'width', label: 'Width (bits)', type: 'select', options: [
                    { value: '8', label: '8-bit' },
                    { value: '16', label: '16-bit' },
                    { value: '32', label: '32-bit' },
                    { value: '64', label: '64-bit' },
                ]
            },
            { key: 'auto_read', label: 'Auto Read', type: 'boolean' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
        ]
    },
    {
        type: 'fpga_register_write',
        name: 'FPGA 寄存器写入',
        category: 'device',
        icon: '✏️',
        description: '写入 FPGA 寄存器',
        inputs: [
            { id: 'fpga', name: 'FPGA', type: 'any' },
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'trigger', name: 'Trigger', type: 'boolean' },
        ],
        outputs: [
            { id: 'success', name: 'Success', type: 'boolean' },
        ],
        defaultProperties: {
            address: '0x0000',
            width: 32,
        },
        propertySchema: [
            { key: 'address', label: 'Address (hex)', type: 'string' },
            {
                key: 'width', label: 'Width (bits)', type: 'select', options: [
                    { value: '8', label: '8-bit' },
                    { value: '16', label: '16-bit' },
                    { value: '32', label: '32-bit' },
                    { value: '64', label: '64-bit' },
                ]
            },
        ]
    },
    {
        type: 'fpga_adc',
        name: 'FPGA ADC',
        category: 'device',
        icon: '📊',
        description: 'FPGA 模数转换器',
        inputs: [
            { id: 'fpga', name: 'FPGA', type: 'any' },
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'channel_0', name: 'CH0', type: 'number' },
            { id: 'channel_1', name: 'CH1', type: 'number' },
            { id: 'channel_2', name: 'CH2', type: 'number' },
            { id: 'channel_3', name: 'CH3', type: 'number' },
            { id: 'sample_rate', name: 'Sample Rate', type: 'number' },
        ],
        defaultProperties: {
            base_address: '0x1000',
            resolution: 12,
            sample_rate: 100000,
            channels: 4,
        },
        propertySchema: [
            { key: 'base_address', label: 'Base Address (hex)', type: 'string' },
            {
                key: 'resolution', label: 'Resolution (bits)', type: 'select', options: [
                    { value: '8', label: '8-bit' },
                    { value: '10', label: '10-bit' },
                    { value: '12', label: '12-bit' },
                    { value: '14', label: '14-bit' },
                    { value: '16', label: '16-bit' },
                ]
            },
            { key: 'sample_rate', label: 'Sample Rate (SPS)', type: 'number' },
            { key: 'channels', label: 'Channels', type: 'number' },
        ]
    },
    {
        type: 'fpga_dac',
        name: 'FPGA DAC',
        category: 'device',
        icon: '📈',
        description: 'FPGA 数模转换器',
        inputs: [
            { id: 'fpga', name: 'FPGA', type: 'any' },
            { id: 'channel_0', name: 'CH0', type: 'number' },
            { id: 'channel_1', name: 'CH1', type: 'number' },
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'success', name: 'Success', type: 'boolean' },
        ],
        defaultProperties: {
            base_address: '0x2000',
            resolution: 16,
        },
        propertySchema: [
            { key: 'base_address', label: 'Base Address (hex)', type: 'string' },
            {
                key: 'resolution', label: 'Resolution (bits)', type: 'select', options: [
                    { value: '8', label: '8-bit' },
                    { value: '12', label: '12-bit' },
                    { value: '16', label: '16-bit' },
                ]
            },
        ]
    },
    {
        type: 'fpga_pwm',
        name: 'FPGA PWM',
        category: 'device',
        icon: '〰️',
        description: 'FPGA PWM 信号生成',
        inputs: [
            { id: 'fpga', name: 'FPGA', type: 'any' },
            { id: 'duty_cycle', name: 'Duty (%)', type: 'number' },
            { id: 'frequency', name: 'Freq (Hz)', type: 'number' },
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'active', name: 'Active', type: 'boolean' },
        ],
        defaultProperties: {
            base_address: '0x3000',
            channel: 0,
        },
        propertySchema: [
            { key: 'base_address', label: 'Base Address (hex)', type: 'string' },
            { key: 'channel', label: 'Channel', type: 'number' },
        ]
    },
    {
        type: 'fpga_dma',
        name: 'FPGA DMA',
        category: 'device',
        icon: '⚡',
        description: 'FPGA 高速 DMA 传输',
        inputs: [
            { id: 'fpga', name: 'FPGA', type: 'any' },
            { id: 'start', name: 'Start', type: 'boolean' },
            { id: 'direction', name: 'Direction', type: 'string' },
        ],
        outputs: [
            { id: 'data', name: 'Data', type: 'any' },
            { id: 'complete', name: 'Complete', type: 'boolean' },
            { id: 'bytes_transferred', name: 'Bytes', type: 'number' },
        ],
        defaultProperties: {
            buffer_address: '0x10000',
            buffer_size: 4096,
        },
        propertySchema: [
            { key: 'buffer_address', label: 'Buffer Address (hex)', type: 'string' },
            { key: 'buffer_size', label: 'Buffer Size (bytes)', type: 'number' },
        ]
    },

    // Timing Components
    {
        type: 'timed_loop',
        name: 'Timed Loop',
        category: 'control',
        icon: '⏱️',
        description: '高精度定时循环',
        inputs: [
            { id: 'start_trigger', name: 'Start', type: 'boolean' },
            { id: 'stop_trigger', name: 'Stop', type: 'boolean' },
            { id: 'body_complete', name: 'Body Complete', type: 'boolean' },
        ],
        outputs: [
            { id: 'iteration', name: 'Iteration', type: 'number' },
            { id: 'elapsed_time', name: 'Elapsed (ms)', type: 'number' },
            { id: 'running', name: 'Running', type: 'boolean' },
            { id: 'period_actual', name: 'Actual Period', type: 'number' },
            { id: 'overrun_count', name: 'Overruns', type: 'number' },
            { id: 'loop_trigger', name: 'Loop Trigger', type: 'boolean' },
            { id: 'statistics', name: 'Statistics', type: 'object' },
        ],
        defaultProperties: {
            period_ms: 100,
            priority: 5,
            timing_source: 'software',
            max_iterations: 0,
            timeout_action: 'continue',
            auto_start: false,
        },
        propertySchema: [
            { key: 'period_ms', label: 'Period (ms)', type: 'number' },
            { key: 'priority', label: 'Priority (1-10)', type: 'number' },
            {
                key: 'timing_source', label: 'Timing Source', type: 'select', options: [
                    { value: 'software', label: 'Software' },
                    { value: 'hardware', label: 'Hardware' },
                    { value: 'external', label: 'External' },
                ]
            },
            { key: 'max_iterations', label: 'Max Iterations (0=infinite)', type: 'number' },
            {
                key: 'timeout_action', label: 'Timeout Action', type: 'select', options: [
                    { value: 'continue', label: 'Continue' },
                    { value: 'skip', label: 'Skip' },
                    { value: 'error', label: 'Error' },
                ]
            },
            { key: 'auto_start', label: 'Auto Start', type: 'boolean' },
        ]
    },
    {
        type: 'rate_limiter',
        name: 'Rate Limiter',
        category: 'control',
        icon: '🚦',
        description: '数据流速率限制器',
        inputs: [
            { id: 'input', name: 'Input', type: 'any' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'any' },
            { id: 'passed', name: 'Passed', type: 'boolean' },
            { id: 'blocked', name: 'Blocked', type: 'boolean' },
            { id: 'rate', name: 'Rate (per sec)', type: 'number' },
        ],
        defaultProperties: {
            min_interval_ms: 100,
            burst_size: 1,
        },
        propertySchema: [
            { key: 'min_interval_ms', label: 'Min Interval (ms)', type: 'number' },
            { key: 'burst_size', label: 'Burst Size', type: 'number' },
        ]
    },
    {
        type: 'watchdog',
        name: 'Watchdog',
        category: 'control',
        icon: '🐕',
        description: '看门狗定时器',
        inputs: [
            { id: 'feed', name: 'Feed', type: 'any' },
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'timeout', name: 'Timeout', type: 'boolean' },
            { id: 'time_since_feed', name: 'Time Since Feed', type: 'number' },
            { id: 'healthy', name: 'Healthy', type: 'boolean' },
        ],
        defaultProperties: {
            timeout_ms: 5000,
            auto_reset: true,
        },
        propertySchema: [
            { key: 'timeout_ms', label: 'Timeout (ms)', type: 'number' },
            { key: 'auto_reset', label: 'Auto Reset', type: 'boolean' },
        ]
    },
    // Data Probe - for real-time data visualization
    {
        type: 'data_probe',
        name: 'Data Probe',
        category: 'logic',
        icon: '🔍',
        description: 'Monitor data flow in real-time',
        inputs: [
            { id: 'input', name: 'Input', type: 'any' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'any' },
        ],
        defaultProperties: {
            label: 'Probe',
        },
        propertySchema: [
            { key: 'label', label: 'Label', type: 'string' },
        ]
    },

    // ============ 电力协议组件 ============

    // IEC 61850 客户端
    {
        type: 'iec61850_client',
        name: 'IEC 61850 客户端',
        category: 'protocol',
        icon: '⚡',
        description: 'IEC 61850 变电站自动化协议客户端 (MMS)',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'client_ref', name: 'Client Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'ied_name', name: 'IED Name', type: 'string' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            host: '192.168.1.100',
            port: 102,
            ied_name: 'IED1',
        },
        propertySchema: [
            { key: 'host', label: 'IED IP Address', type: 'text' },
            { key: 'port', label: 'MMS Port', type: 'number' },
            { key: 'ied_name', label: 'IED Name', type: 'text' },
        ]
    },
    // IEC 61850 数据读取
    {
        type: 'iec61850_data_reader',
        name: 'IEC 61850 数据读取',
        category: 'protocol',
        icon: '📊',
        description: '读取 IEC 61850 逻辑节点数据对象',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'any' },
            { id: 'quality', name: 'Quality', type: 'string' },
            { id: 'timestamp', name: 'Timestamp', type: 'string' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
        ],
        defaultProperties: {
            logical_device: 'LD0',
            logical_node: 'MMXU1',
            data_object: 'TotW',
            data_attribute: 'mag.f',
            poll_interval_ms: 1000,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'iec61850/data',
        },
        propertySchema: [
            { key: 'logical_device', label: 'Logical Device', type: 'text' },
            { key: 'logical_node', label: 'Logical Node', type: 'text' },
            { key: 'data_object', label: 'Data Object', type: 'text' },
            { key: 'data_attribute', label: 'Data Attribute', type: 'text' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    // IEC 60870-5-104 客户端
    {
        type: 'iec104_client',
        name: 'IEC 104 客户端',
        category: 'protocol',
        icon: '🔋',
        description: 'IEC 60870-5-104 远动规约客户端 (TCP/IP)',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'client_ref', name: 'Client Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            host: '192.168.1.100',
            port: 2404,
            common_address: 1,
            originator_address: 0,
        },
        propertySchema: [
            { key: 'host', label: 'RTU IP Address', type: 'text' },
            { key: 'port', label: 'Port', type: 'number' },
            { key: 'common_address', label: 'Common Address', type: 'number' },
            { key: 'originator_address', label: 'Originator Address', type: 'number' },
        ]
    },
    // IEC 104 数据点
    {
        type: 'iec104_data_point',
        name: 'IEC 104 数据点',
        category: 'protocol',
        icon: '📍',
        description: '读取 IEC 104 遥测/遥信数据点',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
            { id: 'command_value', name: 'Command Value', type: 'number' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'quality', name: 'Quality', type: 'string' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
        ],
        defaultProperties: {
            ioa: 1,
            type_id: 'M_ME_NC_1',
            poll_interval_ms: 1000,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'iec104/data',
        },
        propertySchema: [
            { key: 'ioa', label: 'Information Object Address', type: 'number' },
            {
                key: 'type_id', label: 'Type ID', type: 'select', options: [
                    { value: 'M_SP_NA_1', label: '单点信息 (遥信)' },
                    { value: 'M_DP_NA_1', label: '双点信息' },
                    { value: 'M_ME_NA_1', label: '归一化测量值' },
                    { value: 'M_ME_NC_1', label: '短浮点测量值 (遥测)' },
                    { value: 'M_IT_NA_1', label: '累计量' },
                ]
            },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    // IEC 60870-5-101 主站
    {
        type: 'iec101_master',
        name: 'IEC 101 主站',
        category: 'protocol',
        icon: '📡',
        description: 'IEC 60870-5-101 远动规约主站 (串口)',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'master_ref', name: 'Master Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            serial_port: 'COM1',
            baudrate: 9600,
            link_address: 1,
            common_address: 1,
        },
        propertySchema: [
            { key: 'serial_port', label: 'Serial Port', type: 'text' },
            {
                key: 'baudrate', label: 'Baudrate', type: 'select', options: [
                    { value: 1200, label: '1200' },
                    { value: 2400, label: '2400' },
                    { value: 4800, label: '4800' },
                    { value: 9600, label: '9600' },
                    { value: 19200, label: '19200' },
                ]
            },
            { key: 'link_address', label: 'Link Address', type: 'number' },
            { key: 'common_address', label: 'Common Address', type: 'number' },
        ]
    },
    // IEC 60870-5-103 主站
    {
        type: 'iec103_master',
        name: 'IEC 103 主站',
        category: 'protocol',
        icon: '🛡️',
        description: 'IEC 60870-5-103 继电保护通信主站 (串口)',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'master_ref', name: 'Master Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            serial_port: 'COM1',
            baudrate: 9600,
            asdu_address: 1,
        },
        propertySchema: [
            { key: 'serial_port', label: 'Serial Port', type: 'text' },
            {
                key: 'baudrate', label: 'Baudrate', type: 'select', options: [
                    { value: 9600, label: '9600' },
                    { value: 19200, label: '19200' },
                ]
            },
            { key: 'asdu_address', label: 'ASDU Address', type: 'number' },
        ]
    },
    // IEC 101 数据点
    {
        type: 'iec101_data_point',
        name: 'IEC 101 数据点',
        category: 'protocol',
        icon: '📍',
        description: '读取 IEC 101 遥测/遥信数据，支持 MQTT 转发',
        inputs: [
            { id: 'master', name: 'Master', type: 'any' },
            { id: 'command_value', name: 'Command Value', type: 'number' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'quality', name: 'Quality', type: 'string' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
        ],
        defaultProperties: {
            ioa: 1,
            type_id: 'M_ME_NC_1',
            poll_interval_ms: 1000,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'iec101/data',
        },
        propertySchema: [
            { key: 'ioa', label: 'Information Object Address', type: 'number' },
            {
                key: 'type_id', label: 'Type ID', type: 'select', options: [
                    { value: 'M_SP_NA_1', label: '单点信息 (遥信)' },
                    { value: 'M_DP_NA_1', label: '双点信息' },
                    { value: 'M_ME_NC_1', label: '短浮点测量值 (遥测)' },
                ]
            },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    // IEC 103 数据点
    {
        type: 'iec103_data_point',
        name: 'IEC 103 数据点',
        category: 'protocol',
        icon: '📍',
        description: '读取 IEC 103 继电保护数据，支持 MQTT 转发',
        inputs: [
            { id: 'master', name: 'Master', type: 'any' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'quality', name: 'Quality', type: 'string' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
        ],
        defaultProperties: {
            function_type: 1,
            info_number: 1,
            poll_interval_ms: 1000,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'iec103/data',
        },
        propertySchema: [
            { key: 'function_type', label: 'Function Type', type: 'number' },
            { key: 'info_number', label: 'Information Number', type: 'number' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    // DNP3 主站
    {
        type: 'dnp3_master',
        name: 'DNP3 主站',
        category: 'protocol',
        icon: '🔌',
        description: 'DNP3 远动规约主站 (北美电力标准)',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'master_ref', name: 'Master Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            host: '192.168.1.100',
            port: 20000,
            master_address: 1,
            outstation_address: 10,
        },
        propertySchema: [
            { key: 'host', label: 'Outstation IP', type: 'text' },
            { key: 'port', label: 'Port', type: 'number' },
            { key: 'master_address', label: 'Master Address', type: 'number' },
            { key: 'outstation_address', label: 'Outstation Address', type: 'number' },
        ]
    },
    // DNP3 数据点
    {
        type: 'dnp3_data_point',
        name: 'DNP3 数据点',
        category: 'protocol',
        icon: '📈',
        description: '读取 DNP3 模拟量/二进制输入',
        inputs: [
            { id: 'master', name: 'Master', type: 'any' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'quality', name: 'Quality', type: 'string' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
        ],
        defaultProperties: {
            point_index: 0,
            point_type: 'analog_input',
            poll_interval_ms: 1000,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'dnp3/data',
        },
        propertySchema: [
            { key: 'point_index', label: 'Point Index', type: 'number' },
            {
                key: 'point_type', label: 'Point Type', type: 'select', options: [
                    { value: 'binary_input', label: 'Binary Input (遥信)' },
                    { value: 'analog_input', label: 'Analog Input (遥测)' },
                    { value: 'counter', label: 'Counter (累计量)' },
                ]
            },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },

    // ============ 工厂自动化协议组件 ============

    // Profibus 主站
    {
        type: 'profibus_master',
        name: 'Profibus DP 主站',
        category: 'protocol',
        icon: '🏭',
        description: 'Profibus DP 现场总线主站',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'master_ref', name: 'Master Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'slave_count', name: 'Slave Count', type: 'number' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            interface: 'DP0',
            baudrate: 1500000,
            master_address: 1,
        },
        propertySchema: [
            { key: 'interface', label: 'Profibus Interface', type: 'text' },
            {
                key: 'baudrate', label: 'Baudrate', type: 'select', options: [
                    { value: 93750, label: '93.75 kbps' },
                    { value: 187500, label: '187.5 kbps' },
                    { value: 500000, label: '500 kbps' },
                    { value: 1500000, label: '1.5 Mbps' },
                    { value: 12000000, label: '12 Mbps' },
                ]
            },
            { key: 'master_address', label: 'Master Address', type: 'number' },
        ]
    },
    // Profibus 从站
    {
        type: 'profibus_slave',
        name: 'Profibus DP 从站',
        category: 'protocol',
        icon: '📥',
        description: 'Profibus DP 从站数据读写',
        inputs: [
            { id: 'master', name: 'Master', type: 'any' },
            { id: 'write_data', name: 'Write Data', type: 'array' },
        ],
        outputs: [
            { id: 'read_data', name: 'Read Data', type: 'array' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            slave_address: 3,
            input_size: 8,
            output_size: 8,
            poll_interval_ms: 100,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'profibus/data',
        },
        propertySchema: [
            { key: 'slave_address', label: 'Slave Address', type: 'number' },
            { key: 'input_size', label: 'Input Size (bytes)', type: 'number' },
            { key: 'output_size', label: 'Output Size (bytes)', type: 'number' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },
    // Profinet 控制器
    {
        type: 'profinet_controller',
        name: 'Profinet IO 控制器',
        category: 'protocol',
        icon: '🌐',
        description: 'Profinet IO 工业以太网控制器',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'controller_ref', name: 'Controller Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'device_count', name: 'Device Count', type: 'number' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            interface: 'eth0',
            station_name: 'controller',
        },
        propertySchema: [
            { key: 'interface', label: 'Network Interface', type: 'text' },
            { key: 'station_name', label: 'Station Name', type: 'text' },
        ]
    },
    // Profinet 设备
    {
        type: 'profinet_device',
        name: 'Profinet IO 设备',
        category: 'protocol',
        icon: '📟',
        description: 'Profinet IO 设备数据读写',
        inputs: [
            { id: 'controller', name: 'Controller', type: 'any' },
            { id: 'write_data', name: 'Write Data', type: 'array' },
        ],
        outputs: [
            { id: 'read_data', name: 'Read Data', type: 'array' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
        ],
        defaultProperties: {
            device_name: 'device1',
            slot: 1,
            subslot: 1,
            input_size: 8,
            output_size: 8,
            poll_interval_ms: 100,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'profinet/data',
        },
        propertySchema: [
            { key: 'device_name', label: 'Device Name', type: 'text' },
            { key: 'slot', label: 'Slot', type: 'number' },
            { key: 'subslot', label: 'Subslot', type: 'number' },
            { key: 'input_size', label: 'Input Size (bytes)', type: 'number' },
            { key: 'output_size', label: 'Output Size (bytes)', type: 'number' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },

    // ============ 楼宇自动化协议组件 ============

    // BACnet 客户端
    {
        type: 'bacnet_client',
        name: 'BACnet 客户端',
        category: 'protocol',
        icon: '🏢',
        description: 'BACnet/IP 楼宇自动化协议客户端',
        inputs: [
            { id: 'enable', name: 'Enable', type: 'boolean' },
        ],
        outputs: [
            { id: 'client_ref', name: 'Client Ref', type: 'any' },
            { id: 'connected', name: 'Connected', type: 'boolean' },
            { id: 'device_count', name: 'Device Count', type: 'number' },
            { id: 'error', name: 'Error', type: 'string' },
        ],
        defaultProperties: {
            interface: '0.0.0.0',
            port: 47808,
        },
        propertySchema: [
            { key: 'interface', label: 'Local IP Address', type: 'text' },
            { key: 'port', label: 'BACnet Port', type: 'number' },
        ]
    },
    // BACnet 对象
    {
        type: 'bacnet_object',
        name: 'BACnet 对象',
        category: 'protocol',
        icon: '🌡️',
        description: '读写 BACnet 对象属性 (温度、湿度等)',
        inputs: [
            { id: 'client', name: 'Client', type: 'any' },
            { id: 'write_value', name: 'Write Value', type: 'number' },
        ],
        outputs: [
            { id: 'value', name: 'Value', type: 'number' },
            { id: 'raw_data', name: 'Raw Data', type: 'object' },
        ],
        defaultProperties: {
            device_id: 1234,
            object_type: 'analogInput',
            object_instance: 1,
            property_id: 'presentValue',
            poll_interval_ms: 1000,
            mqtt_enabled: false,
            mqtt_broker: 'localhost',
            mqtt_port: 1883,
            mqtt_topic: 'bacnet/data',
        },
        propertySchema: [
            { key: 'device_id', label: 'Device Instance ID', type: 'number' },
            {
                key: 'object_type', label: 'Object Type', type: 'select', options: [
                    { value: 'analogInput', label: 'Analog Input (温度/湿度)' },
                    { value: 'analogOutput', label: 'Analog Output (设定值)' },
                    { value: 'analogValue', label: 'Analog Value' },
                    { value: 'binaryInput', label: 'Binary Input (开关状态)' },
                    { value: 'binaryOutput', label: 'Binary Output (控制开关)' },
                    { value: 'binaryValue', label: 'Binary Value' },
                    { value: 'multiStateInput', label: 'Multi-State Input' },
                    { value: 'multiStateOutput', label: 'Multi-State Output' },
                ]
            },
            { key: 'object_instance', label: 'Object Instance', type: 'number' },
            { key: 'property_id', label: 'Property ID', type: 'text' },
            { key: 'poll_interval_ms', label: 'Poll Interval (ms)', type: 'number' },
            { key: 'mqtt_enabled', label: 'MQTT Forwarding', type: 'boolean' },
            { key: 'mqtt_broker', label: 'MQTT Broker', type: 'text' },
            { key: 'mqtt_port', label: 'MQTT Port', type: 'number' },
            { key: 'mqtt_topic', label: 'MQTT Topic', type: 'text' },
        ]
    },

    // ============ 算法组件 ============
    {
        type: 'FFT',
        name: 'FFT 频谱分析',
        category: 'algorithm',
        icon: '📊',
        description: '对信号进行快速傅里叶变换，提取频域特征',
        inputs: [
            { id: 'signal', name: 'Input Signal', type: 'number' },
        ],
        outputs: [
            { id: 'frequencies', name: 'Frequencies', type: 'array' },
            { id: 'magnitudes', name: 'Magnitudes', type: 'array' },
            { id: 'dominant_freq', name: 'Dominant Freq', type: 'number' },
            { id: 'ready', name: 'Ready', type: 'boolean' },
        ],
        defaultProperties: {
            window_size: 256,
            sample_rate: 1000,
        },
        propertySchema: [
            { key: 'window_size', label: 'Window Size', type: 'number' },
            { key: 'sample_rate', label: 'Sample Rate (Hz)', type: 'number' },
        ]
    },
    {
        type: 'MovingAverageFilter',
        name: '移动平均滤波',
        category: 'algorithm',
        icon: '〰️',
        description: '平滑输入信号，减少噪声',
        inputs: [
            { id: 'input', name: 'Input', type: 'number' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'number' },
            { id: 'variance', name: 'Variance', type: 'number' },
        ],
        defaultProperties: {
            window_size: 10,
        },
        propertySchema: [
            { key: 'window_size', label: 'Window Size', type: 'number' },
        ]
    },
    {
        type: 'LowPassFilter',
        name: '低通滤波器',
        category: 'algorithm',
        icon: '📉',
        description: '一阶指数低通滤波器',
        inputs: [
            { id: 'input', name: 'Input', type: 'number' },
        ],
        outputs: [
            { id: 'output', name: 'Output', type: 'number' },
        ],
        defaultProperties: {
            alpha: 0.1,
            sample_rate: 1000,
        },
        propertySchema: [
            { key: 'alpha', label: 'Alpha (0-1)', type: 'number' },
            { key: 'cutoff_freq', label: 'Cutoff Freq (Hz)', type: 'number' },
            { key: 'sample_rate', label: 'Sample Rate (Hz)', type: 'number' },
        ]
    },
    {
        type: 'PIDController',
        name: 'PID 控制器',
        category: 'algorithm',
        icon: '⚙️',
        description: '经典 PID 闭环控制算法',
        inputs: [
            { id: 'setpoint', name: 'Setpoint', type: 'number' },
            { id: 'process_value', name: 'Current Value', type: 'number' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
        ],
        outputs: [
            { id: 'output', name: 'Control Output', type: 'number' },
            { id: 'error', name: 'Error', type: 'number' },
            { id: 'p_term', name: 'P Term', type: 'number' },
            { id: 'i_term', name: 'I Term', type: 'number' },
            { id: 'd_term', name: 'D Term', type: 'number' },
        ],
        defaultProperties: {
            kp: 1.0,
            ki: 0.1,
            kd: 0.01,
            dt: 0.1,
        },
        propertySchema: [
            { key: 'kp', label: 'Proportional (Kp)', type: 'number' },
            { key: 'ki', label: 'Integral (Ki)', type: 'number' },
            { key: 'kd', label: 'Derivative (Kd)', type: 'number' },
            { key: 'output_min', label: 'Output Min', type: 'number' },
            { key: 'output_max', label: 'Output Max', type: 'number' },
            { key: 'dt', label: 'Time Step (s)', type: 'number' },
        ]
    },
    {
        type: 'KalmanFilter',
        name: '卡尔曼滤波',
        category: 'algorithm',
        icon: '🎯',
        description: '一维卡尔曼滤波器，用于最优状态估计',
        inputs: [
            { id: 'measurement', name: 'Measurement', type: 'number' },
        ],
        outputs: [
            { id: 'estimate', name: 'Estimate', type: 'number' },
            { id: 'uncertainty', name: 'Uncertainty', type: 'number' },
        ],
        defaultProperties: {
            process_noise: 0.01,
            measurement_noise: 0.1,
            initial_estimate: 0,
            initial_uncertainty: 1,
        },
        propertySchema: [
            { key: 'process_noise', label: 'Process Noise', type: 'number' },
            { key: 'measurement_noise', label: 'Measurement Noise', type: 'number' },
            { key: 'initial_estimate', label: 'Initial Estimate', type: 'number' },
            { key: 'initial_uncertainty', label: 'Initial Uncertainty', type: 'number' },
        ]
    },
    {
        type: 'Statistics',
        name: '统计分析',
        category: 'algorithm',
        icon: '📊',
        description: '计算实时数据的均值、方差、极值等统计信息',
        inputs: [
            { id: 'input', name: 'Input', type: 'number' },
            { id: 'reset', name: 'Reset', type: 'boolean' },
        ],
        outputs: [
            { id: 'mean', name: 'Mean', type: 'number' },
            { id: 'std', name: 'Std Dev', type: 'number' },
            { id: 'min', name: 'Min', type: 'number' },
            { id: 'max', name: 'Max', type: 'number' },
            { id: 'count', name: 'Count', type: 'number' },
        ],
        defaultProperties: {
            window_size: 100,
        },
        propertySchema: [
            { key: 'window_size', label: 'Window Size', type: 'number' },
        ]
    },
]

export default componentLibrary


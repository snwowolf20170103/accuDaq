# DAQ Project Schema Design Notes

This document outlines the design for the `.daq` project file structure. The `.daq` file acts as the single source of truth for a project, containing configuration for Devices, the Logical Block Diagram (LabVIEW mode), and the UI Dashboard (H5 mode).

## 1. Top-Level Structure
The root object should contain:
- `metadata`: Project name, version, author, description.
- `settings`: Global settings (e.g., sample rate defaults, storage paths).
- `devices`: Definitions of hardware connections (Drivers, Connection Strings).
- `variables`: Global variables/Tags that bridge Logic and UI.
- `logic`: The visual programming graph (Nodes and Wires).
- `ui`: The dashboard layout and widget configuration.

## 2. Devices (Connectivity)
Defines *what* we can talk to.
- `id`: Unique identifier (e.g., "dev_temp_sensor").
- `protocol`: "modbus_tcp", "mock", "serial", etc.
- `config`: Protocol-specific parameters (IP, Port, BaudRate).

## 3. Logic (The Graph)
Defines *how* data flows.
### 3.1 Nodes
Representative of a function block.
- `id`: Unique UUID.
- `type`: Component type (e.g., "daq:modbus_read", "math:add", "logic:greater_than").
- `position`: `{x, y}` for rendering on the canvas.
- `properties`: Static configuration (e.g., Modbus Address = 40001, Gain = 2.5). ~Inputs that are constants~.
- `inputs`: Definition of input ports (can be linked).
- `outputs`: Definition of output ports.

### 3.2 Wires
Representative of data flow.
- `source`: `{ nodeId, portId }`.
- `target`: `{ nodeId, portId }`.

## 4. UI (The Dashboard)
Defines *how* data is shown.
- `widgets`: List of visible controls.
- `id`: UUID.
- `type`: "ui:chart", "ui:gauge", "ui:led".
- `position`: Layout info (grid or absolute).
- `binding`: Which variable or node output does this widget control/display?

## 5. Example JSON Structure (Draft)

```json
{
  "project": {
    "name": "Temperature Monitor",
    "version": "1.0.0"
  },
  "devices": [
    {
      "id": "sensor_01",
      "name": "Lab Temp Sensor",
      "protocol": "modbus_tcp",
      "config": {
        "host": "192.168.1.100",
        "port": 502
      }
    }
  ],
  "logic": {
    "nodes": [
      {
        "id": "node_1",
        "type": "daq:modbus_read",
        "position": { "x": 100, "y": 100 },
        "properties": {
          "deviceId": "sensor_01",
          "register": 40001,
          "count": 1
        }
      },
      {
        "id": "node_2",
        "type": "logic:compare_gt",
        "position": { "x": 300, "y": 100 },
        "properties": {
          "threshold": 30.0
        }
      }
    ],
    "wires": [
      {
        "id": "wire_1",
        "source": { "node": "node_1", "port": "out_value" },
        "target": { "node": "node_2", "port": "in_a" }
      }
    ]
  },
  "ui": {
    "widgets": [
      {
        "id": "chart_1",
        "type": "ui:waveform",
        "binding": { "node": "node_1", "port": "out_value" },
        "layout": { "x": 0, "y": 0, "w": 4, "h": 4 }
      }
    ]
  }
}
```

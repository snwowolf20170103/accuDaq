# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**accuDaq** is a visual data acquisition system using a compiler architecture. It allows users to build data flows by dragging components in a visual editor, then compiles `.daq` JSON files into executable Python code.

## Common Commands

### Visual Editor (React Frontend)
```bash
cd visual-editor
npm install          # Install dependencies
npm run dev          # Start development server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
```

### DAQ Core (Python Backend)
```bash
cd daq_core
pip install -r requirements.txt    # Install Python dependencies (paho-mqtt>=2.0.0)

# Compile a .daq file
python compile_now.py              # Compiles test_realtime.daq by default

# Run compiled project
python run_realtime_app.py         # Runs the compiled output
```

### VS Code Extension
```bash
cd vscode-extension
npm install          # Install dependencies
npm run compile      # Compile TypeScript
npm run watch        # Watch mode for development
npm run lint         # Run ESLint
```

## Architecture Overview

### Compiler Architecture (Python - daq_core/)

The system uses a 4-stage compilation pipeline:

1. **Parser** (`compiler/parser.py`): Parses `.daq` JSON files into `DAQProject` data structures
2. **Topology Sort** (`compiler/topology.py`): Analyzes node dependencies using Kahn's algorithm, detects circular dependencies
3. **Code Generator** (`compiler/codegen.py`): Generates executable Python code from the validated project
4. **Compiler** (`compiler/compiler.py`): Orchestrates the above three stages

Output: A complete Python script (e.g., `run_realtime_app.py`) that can be executed directly.

### Component System

All components inherit from `ComponentBase` (in `components/base.py`) and follow this lifecycle:
```
init → configure → start → process → stop → destroy
```

**Component Registry Pattern**: Uses a singleton `ComponentRegistry` to manage all available components. New components register using the `@ComponentRegistry.register` decorator.

**Port System**: Components communicate through typed input/output ports:
- Port types: `number`, `string`, `boolean`, `object`, `array`, `any`
- Connections are validated at compile time
- Data flows through ports in the main engine loop

Available components (in `daq_core/components/`):
- `mock_device.py`: Generates test data (sine/square/random waves)
- `mqtt_client.py`: Subscribes to MQTT topics
- `mqtt_publisher.py`: Publishes data to MQTT topics
- `math_ops.py`: Mathematical operations (scale, add, subtract, multiply, divide)
- `csv_storage.py`: Saves data to CSV files

### Runtime Engine

**DAQEngine** (`engine.py`): Manages component lifecycle and data flow coordination.

Main loop (default 100ms tick):
1. Transfer data between connected components based on wiring
2. Trigger `process()` method on all components
3. Wait for next tick interval

### Visual Editor (React - visual-editor/)

Built with:
- **React 18** + **TypeScript**
- **@xyflow/react** (v12): Flow diagram canvas
- **Recharts**: Real-time data visualization
- **MQTT.js**: Real-time communication with DAQ engine
- **Vite**: Build tool

Key components:
- `App.tsx`: Main application, manages nodes/edges state
- `ComponentLibrary.tsx`: Draggable component palette
- `DAQNode.tsx`: Custom ReactFlow node component
- `PropertyPanel.tsx`: Dynamic property editor for selected nodes
- `Dashboard.tsx`: Real-time monitoring panel with widgets
- `DaqEngine.tsx`: Engine control (compile/start/stop)
- `hooks/useMqtt.ts`: MQTT connection management hook

### Data Flow

**Edit → Compile → Run**:
```
Visual Editor (drag & drop)
  ↓
Export .daq JSON file
  ↓
Parser → Topology Sort → Code Generator
  ↓
Executable Python script
  ↓
DAQEngine executes → MQTT → Dashboard displays
```

## Key Files

### Compilation Pipeline
- `daq_core/compiler/parser.py`: Defines DAQProject, Node, Wire, Device models
- `daq_core/compiler/topology.py`: Dependency analysis and execution order
- `daq_core/compiler/codegen.py`: Maps node types to Python code, generates imports and connections
- `daq_core/compiler/compiler.py`: Main compilation entry point

### Component Development
- `daq_core/components/base.py`: ComponentBase class, Port definition, ComponentRegistry
- `daq_core/engine.py`: DAQEngine runtime with main loop and data transfer logic

### Frontend Core
- `visual-editor/src/types.ts`: TypeScript type definitions (DAQNode, DAQEdge, ComponentDef, etc.)
- `visual-editor/src/data/componentLibrary.ts`: Component metadata (ports, properties, icons)
- `visual-editor/src/App.tsx`: State management for nodes, edges, and project metadata

### Configuration
- `architecture/daq_project_schema.json`: JSON Schema for .daq file format
- `test_realtime.daq`: Example project file showing the structure
- `compile_now.py`: Quick compilation script

## Adding New Components

1. **Backend** (Python):
   - Create new file in `daq_core/components/`
   - Inherit from `ComponentBase`
   - Implement `_setup_ports()`, `start()`, `stop()`, `process()`
   - Register with `@ComponentRegistry.register('component-name')`

2. **Frontend** (TypeScript):
   - Add component definition to `visual-editor/src/data/componentLibrary.ts`
   - Define inputs, outputs, and configurable properties

3. **Code Generator**:
   - Update `NODE_TYPE_MAPPING` in `daq_core/compiler/codegen.py` if using a new node type

4. **Schema** (optional):
   - Update `architecture/daq_project_schema.json` for new node types or properties

## .daq File Format

`.daq` files are JSON with four main sections:
- `meta`: Project metadata (name, version, schema version)
- `devices`: Hardware/data source definitions
- `logic`: Node graph (nodes with positions, types, properties, and wires connecting them)
- `ui`: Dashboard widget configurations

See `architecture/daq_project_schema.json` for the complete schema definition.

## MQTT Communication

- Default broker: `localhost:1883`
- Components publish data to topics that Dashboard widgets subscribe to
- MQTT enables real-time monitoring and distributed system support
- Both Python (paho-mqtt) and TypeScript (mqtt.js) use MQTT protocol


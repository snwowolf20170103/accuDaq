# accuDaq

A Data Acquisition (DAQ) IDE and system with a visual editor, DAQ engine, and dashboard.

## Project Structure

- `visual-editor/`: A React-based node-based editor for designing DAQ workflows.
- `daq_core/`: The Python-based DAQ engine and components.
- `vscode-extension/`: VS Code extension for better integration (in progress).
- `docs/`: Documentation and requirement specifications.
- `architecture/`: Architectural design documents.

## Features

- **Visual Programming**: Create DAQ processes using a drag-and-drop interface.
- **Real-time Monitoring**: Integrated dashboard for data visualization.
- **Flexible Components**: Support for various sensors, MQTT, and data processing nodes.
- **Auto-compilation**: Compile visual workflows into Python scripts.

## Getting Started

### Visual Editor
```bash
cd visual-editor
npm install
npm run dev
```

### DAQ Engine
Follow the instructions in `daq_core/` to set up the Python environment and dependencies.

## License
MIT (or as specified)

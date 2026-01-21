# DAQ IDE - VSCode Extension

A Visual Studio Code extension for developing component-based Data Acquisition (DAQ) systems.

## Features

- **Project Management**: Create and manage `.daq` project files
- **Compilation**: Compile `.daq` projects to executable Python scripts
- **Execution**: Run and monitor DAQ processes directly from VSCode
- **Syntax Highlighting**: JSON-based syntax highlighting for `.daq` files

## Commands

- `DAQ: New Project` - Create a new .daq project file
- `DAQ: Compile Project` - Compile the current .daq file to Python
- `DAQ: Run Project` - Compile and run the DAQ project
- `DAQ: Stop` - Stop the running DAQ process

## Usage

### 1. Development Mode

To test the extension:

1. Open this folder (`vscode-extension`) in VSCode
2. Press `F5` to launch Extension Development Host
3. In the new window, open your DAQ workspace (e.g., `f:\workspaces2025\accuDaq`)

### 2. Create a New Project

1. Press `Ctrl+Shift+P` to open Command Palette
2. Type "DAQ: New Project"
3. Enter a project name
4. A new `.daq` file will be created with a basic template

### 3. Compile a Project

1. Open a `.daq` file in the editor
2. Press `Ctrl+Shift+P` and run "DAQ: Compile Project"
3. Check the "DAQ" output channel for compilation results
4. A `*_generated.py` file will be created

### 4. Run a Project

1. Open a `.daq` file
2. Press `Ctrl+Shift+P` and run "DAQ: Run Project"
3. The project will be compiled and executed
4. Monitor the output in the "DAQ" output channel
5. Status bar shows "DAQ Running" indicator

### 5. Stop a Running Project

1. Press `Ctrl+Shift+P` and run "DAQ: Stop"
2. Or close the Extension Development Host window

## Requirements

- Python 3.x installed and available in PATH
- DAQ Core library (`daq_core`) in the workspace

## Development

### Build

```bash
npm install
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Debug

Press `F5` in VSCode to launch the Extension Development Host.

## Project Structure

```
vscode-extension/
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── projectManager.ts # Project file management
│   ├── compiler.ts       # Compilation service
│   └── executor.ts       # Execution service
├── syntaxes/
│   └── daq.tmLanguage.json # Syntax highlighting
├── package.json          # Extension manifest
└── tsconfig.json         # TypeScript configuration
```

## Known Limitations

- MQTT broker must be running separately for full functionality
- Extension is in development mode (not published to marketplace)
- Limited error handling for edge cases

## Future Enhancements

- Visual node editor integration
- Real-time dashboard preview
- Component library browser
- Schema validation

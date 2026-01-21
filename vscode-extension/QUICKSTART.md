# Quick Start Guide - Testing the DAQ IDE Extension

## Step 1: Open Extension in VSCode

1. Open VSCode
2. File → Open Folder → Select `f:\workspaces2025\accuDaq\vscode-extension`
3. VSCode will open the extension project

## Step 2: Launch Extension Development Host

1. Press `F5` (or Run → Start Debugging)
2. A new VSCode window will open titled "[Extension Development Host]"
3. Check the Debug Console in the original window for any errors

## Step 3: Open DAQ Workspace in Extension Host

In the Extension Development Host window:
1. File → Open Folder → Select `f:\workspaces2025\accuDaq`
2. The workspace should load with all DAQ files

## Step 4: Test "New Project" Command

1. Press `Ctrl+Shift+P` to open Command Palette
2. Type "DAQ: New Project"
3. Enter a name like "test_project"
4. A new `test_project.daq` file should be created and opened
5. Verify it contains the template JSON structure

## Step 5: Test "Compile" Command

1. Open `examples/golden_sample.daq` in the editor
2. Press `Ctrl+Shift+P`
3. Run "DAQ: Compile Project"
4. Open the "DAQ" output channel (View → Output, select "DAQ" from dropdown)
5. Verify compilation succeeds
6. Check that `examples/golden_sample_generated.py` was created/updated

## Step 6: Test "Run" Command

1. With `examples/golden_sample.daq` still open
2. Press `Ctrl+Shift+P`
3. Run "DAQ: Run Project"
4. Check the "DAQ" output channel for execution logs
5. Look at the status bar (bottom left) - should show "DAQ Running"
6. You should see DAQ engine initialization logs

## Step 7: Test "Stop" Command

1. While DAQ is running
2. Press `Ctrl+Shift+P`
3. Run "DAQ: Stop"
4. Verify the process terminates
5. Status bar should change to "DAQ Stopped"

## Expected Results

✅ All commands execute without errors
✅ Output channel shows appropriate logs
✅ File operations work correctly
✅ Process management is stable
✅ Status bar updates correctly

## Troubleshooting

### "Python not found"
- Ensure Python is installed and in PATH
- Try running `python --version` in terminal

### "No workspace folder found"
- Make sure you opened the DAQ workspace folder in Extension Host

### "Compilation failed"
- Check the DAQ output channel for error details
- Verify `daq_core` module is accessible

### Extension doesn't load
- Check Debug Console in the original VSCode window
- Look for TypeScript compilation errors
- Try running `npm run compile` in the extension folder

## Next Steps

After successful testing:
1. Create more complex .daq projects
2. Test with MQTT broker running
3. Verify data flow through components
4. Test error handling scenarios

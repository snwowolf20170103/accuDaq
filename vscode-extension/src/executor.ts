import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

export class ExecutorService {
    private currentProcess: child_process.ChildProcess | null = null;
    private statusBarItem: vscode.StatusBarItem;

    constructor(private outputChannel: vscode.OutputChannel) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.text = "$(circle-outline) DAQ Stopped";
        this.statusBarItem.show();
    }

    async run(daqFilePath: string): Promise<void> {
        if (this.currentProcess) {
            vscode.window.showWarningMessage('DAQ is already running. Stop it first.');
            return;
        }

        // First compile the project
        const CompilerService = require('./compiler').CompilerService;
        const compiler = new CompilerService(this.outputChannel);
        const generatedPath = await compiler.compile(daqFilePath);

        if (!generatedPath) {
            return;
        }

        this.outputChannel.show();
        this.outputChannel.appendLine('='.repeat(60));
        this.outputChannel.appendLine('Starting DAQ execution...');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        // Find Python
        const pythonPath = await this.findPython();
        if (!pythonPath) {
            vscode.window.showErrorMessage('Python not found');
            return;
        }

        // Set PYTHONPATH and run
        const env = { ...process.env };
        env.PYTHONPATH = workspaceRoot;

        this.currentProcess = child_process.spawn(pythonPath, [generatedPath], {
            cwd: workspaceRoot,
            env: env
        });

        this.statusBarItem.text = "$(debug-start) DAQ Running";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');

        this.currentProcess.stdout?.on('data', (data) => {
            this.outputChannel.append(data.toString());
        });

        this.currentProcess.stderr?.on('data', (data) => {
            this.outputChannel.append(data.toString());
        });

        this.currentProcess.on('close', (code) => {
            this.outputChannel.appendLine('='.repeat(60));
            this.outputChannel.appendLine(`DAQ process exited with code ${code}`);
            this.currentProcess = null;
            this.statusBarItem.text = "$(circle-outline) DAQ Stopped";
            this.statusBarItem.backgroundColor = undefined;
        });

        this.currentProcess.on('error', (error) => {
            this.outputChannel.appendLine(`Error: ${error.message}`);
            vscode.window.showErrorMessage(`Execution error: ${error.message}`);
            this.currentProcess = null;
            this.statusBarItem.text = "$(circle-outline) DAQ Stopped";
            this.statusBarItem.backgroundColor = undefined;
        });

        vscode.window.showInformationMessage('DAQ started. Press Ctrl+C in output or use "DAQ: Stop" to terminate.');
    }

    async stop(): Promise<void> {
        if (!this.currentProcess) {
            vscode.window.showInformationMessage('No DAQ process is running');
            return;
        }

        this.outputChannel.appendLine('Stopping DAQ process...');

        // Send SIGTERM on Unix, or kill on Windows
        if (process.platform === 'win32') {
            child_process.exec(`taskkill /pid ${this.currentProcess.pid} /T /F`);
        } else {
            this.currentProcess.kill('SIGTERM');
        }

        this.currentProcess = null;
        this.statusBarItem.text = "$(circle-outline) DAQ Stopped";
        this.statusBarItem.backgroundColor = undefined;

        vscode.window.showInformationMessage('DAQ stopped');
    }

    dispose(): void {
        if (this.currentProcess) {
            this.currentProcess.kill();
        }
        this.statusBarItem.dispose();
    }

    private async findPython(): Promise<string | null> {
        const pythonCommands = ['python', 'python3', 'py'];

        for (const cmd of pythonCommands) {
            try {
                const result = child_process.spawnSync(cmd, ['--version']);
                if (result.status === 0) {
                    return cmd;
                }
            } catch (error) {
                // Continue
            }
        }

        return null;
    }
}

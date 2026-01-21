import * as vscode from 'vscode';
import { ProjectManager } from './projectManager';
import { CompilerService } from './compiler';
import { ExecutorService } from './executor';

let outputChannel: vscode.OutputChannel;
let projectManager: ProjectManager;
let compilerService: CompilerService;
let executorService: ExecutorService;

export function activate(context: vscode.ExtensionContext) {
    console.log('DAQ IDE extension is now active');

    // Create output channel
    outputChannel = vscode.window.createOutputChannel('DAQ');
    context.subscriptions.push(outputChannel);

    // Initialize services
    projectManager = new ProjectManager(outputChannel);
    compilerService = new CompilerService(outputChannel);
    executorService = new ExecutorService(outputChannel);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('daq.newProject', async () => {
            await projectManager.createNewProject();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('daq.compile', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !activeEditor.document.fileName.endsWith('.daq')) {
                vscode.window.showErrorMessage('Please open a .daq file first');
                return;
            }
            await compilerService.compile(activeEditor.document.fileName);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('daq.run', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || !activeEditor.document.fileName.endsWith('.daq')) {
                vscode.window.showErrorMessage('Please open a .daq file first');
                return;
            }
            await executorService.run(activeEditor.document.fileName);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('daq.stop', async () => {
            await executorService.stop();
        })
    );

    outputChannel.appendLine('DAQ IDE initialized successfully');
}

export function deactivate() {
    if (executorService) {
        executorService.dispose();
    }
}

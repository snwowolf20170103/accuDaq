import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ProjectManager {
    constructor(private outputChannel: vscode.OutputChannel) { }

    async createNewProject(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a workspace folder first');
            return;
        }

        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'my_daq_project',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Project name cannot be empty';
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                    return 'Project name can only contain letters, numbers, hyphens and underscores';
                }
                return null;
            }
        });

        if (!projectName) {
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const projectPath = path.join(workspaceRoot, `${projectName}.daq`);

        if (fs.existsSync(projectPath)) {
            vscode.window.showErrorMessage(`File ${projectName}.daq already exists`);
            return;
        }

        const template = this.getProjectTemplate(projectName);

        try {
            fs.writeFileSync(projectPath, JSON.stringify(template, null, 2), 'utf-8');
            this.outputChannel.appendLine(`Created new project: ${projectPath}`);

            const document = await vscode.workspace.openTextDocument(projectPath);
            await vscode.window.showTextDocument(document);

            vscode.window.showInformationMessage(`Created DAQ project: ${projectName}.daq`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error}`);
        }
    }

    private getProjectTemplate(projectName: string): any {
        return {
            "meta": {
                "name": projectName,
                "description": "New DAQ project",
                "version": "1.0.0",
                "schemaVersion": "0.1.0"
            },
            "devices": [],
            "logic": {
                "nodes": [],
                "wires": []
            },
            "ui": {
                "widgets": []
            }
        };
    }
}

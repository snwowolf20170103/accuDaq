import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';

export class CompilerService {
    constructor(private outputChannel: vscode.OutputChannel) { }

    async compile(daqFilePath: string): Promise<string | null> {
        this.outputChannel.show();
        this.outputChannel.appendLine('='.repeat(60));
        this.outputChannel.appendLine('Starting DAQ compilation...');
        this.outputChannel.appendLine(`Input: ${daqFilePath}`);

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder found');
            return null;
        }

        // Generate output path
        const outputPath = daqFilePath.replace('.daq', '_generated.py');
        this.outputChannel.appendLine(`Output: ${outputPath}`);

        // Find Python executable
        const pythonPath = await this.findPython();
        if (!pythonPath) {
            vscode.window.showErrorMessage('Python not found. Please install Python 3.x');
            return null;
        }

        // Construct compiler command
        const compilerScript = `
import sys
sys.path.insert(0, '${workspaceRoot.replace(/\\/g, '\\\\')}')
from daq_core.compiler import DAQCompiler
compiler = DAQCompiler()
success, result = compiler.compile_file('${daqFilePath.replace(/\\/g, '\\\\')}', '${outputPath.replace(/\\/g, '\\\\')}')
if success:
    print('Compilation successful')
    sys.exit(0)
else:
    print(f'Compilation failed: {result}')
    sys.exit(1)
`;

        return new Promise((resolve, reject) => {
            const process = child_process.spawn(pythonPath, ['-c', compilerScript], {
                cwd: workspaceRoot
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                this.outputChannel.append(text);
            });

            process.stderr.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                this.outputChannel.append(text);
            });

            process.on('close', (code) => {
                this.outputChannel.appendLine('='.repeat(60));
                if (code === 0) {
                    this.outputChannel.appendLine('✅ Compilation completed successfully');
                    vscode.window.showInformationMessage('DAQ project compiled successfully');
                    resolve(outputPath);
                } else {
                    this.outputChannel.appendLine('❌ Compilation failed');
                    vscode.window.showErrorMessage('DAQ compilation failed. Check output for details.');
                    resolve(null);
                }
            });

            process.on('error', (error) => {
                this.outputChannel.appendLine(`Error: ${error.message}`);
                vscode.window.showErrorMessage(`Compilation error: ${error.message}`);
                resolve(null);
            });
        });
    }

    private async findPython(): Promise<string | null> {
        // Try common Python commands
        const pythonCommands = ['python', 'python3', 'py'];

        for (const cmd of pythonCommands) {
            try {
                const result = child_process.spawnSync(cmd, ['--version']);
                if (result.status === 0) {
                    return cmd;
                }
            } catch (error) {
                // Continue to next command
            }
        }

        return null;
    }
}

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { ChildProcess, spawn } from 'child_process'
import treeKill from 'tree-kill'

// Track the running engine process
let engineProcess: ChildProcess | null = null;

// PID file for cross-session tracking (handles Vite restarts)
const PID_FILE_PATH = path.resolve(__dirname, '../.daq-engine.pid');

// Helper: Kill process by PID using tree-kill (cross-platform)
const killProcessTree = (pid: number): Promise<void> => {
    return new Promise((resolve) => {
        treeKill(pid, 'SIGKILL', (err) => {
            if (err) console.log('[Cleanup] Process gone or error:', err.message);
            resolve();
        });
    });
};

// Helper: Get PID from file or memory
const getActivePid = (): number | null => {
    if (engineProcess?.pid) return engineProcess.pid;
    if (fs.existsSync(PID_FILE_PATH)) {
        try {
            return parseInt(fs.readFileSync(PID_FILE_PATH, 'utf-8').trim(), 10);
        } catch { return null; }
    }
    return null;
};

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'daq-api-server',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url?.startsWith('/api/download-csv')) {
                        // Parse query parameter for file path
                        const url = new URL(req.url, 'http://localhost');
                        let csvPath = url.searchParams.get('path') || './data/output.csv';

                        // Resolve relative to project root
                        const filePath = path.resolve(__dirname, '..', csvPath);
                        const fileName = path.basename(filePath);

                        if (fs.existsSync(filePath)) {
                            res.setHeader('Content-Type', 'text/csv');
                            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
                            const fileStream = fs.createReadStream(filePath);
                            fileStream.pipe(res);
                        } else {
                            res.statusCode = 404;
                            res.end('File not found: ' + filePath);
                        }
                    } else if (req.url === '/api/compile' && req.method === 'POST') {
                        let body = '';
                        req.on('data', chunk => { body += chunk.toString(); });
                        req.on('end', async () => {
                            try {
                                const project = JSON.parse(body);
                                const projectPath = path.resolve(__dirname, '../test_realtime.daq');
                                fs.writeFileSync(projectPath, JSON.stringify(project, null, 4));

                                // Execute compilation using child_process to avoid complex TS/Py imports in Vite
                                const { execSync } = await import('child_process');
                                try {
                                    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
                                    execSync(`${pythonPath} compile_now.py`, { cwd: path.resolve(__dirname, '..') });
                                    res.statusCode = 200;
                                    res.end('Success');
                                } catch (execErr: any) {
                                    res.statusCode = 500;
                                    res.end('Compilation error: ' + execErr.message);
                                }
                            } catch (err: any) {
                                res.statusCode = 400;
                                res.end('Invalid JSON: ' + err.message);
                            }
                        });
                    } else if (req.url === '/api/engine/start' && req.method === 'POST') {
                        // Start the Python DAQ engine
                        // Step 1: Cleanup any existing process (handles zombie processes)
                        const existingPid = getActivePid();
                        const startEngine = async () => {
                            if (existingPid) {
                                await killProcessTree(existingPid);
                                try { fs.unlinkSync(PID_FILE_PATH); } catch { }
                            }
                            engineProcess = null;

                            try {
                                const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
                                const scriptPath = path.resolve(__dirname, '../run_realtime_app.py');

                                if (!fs.existsSync(scriptPath)) {
                                    res.statusCode = 404;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: 'run_realtime_app.py not found. Please compile first.' }));
                                    return;
                                }

                                engineProcess = spawn(pythonPath, [scriptPath], {
                                    cwd: path.resolve(__dirname, '..'),
                                    stdio: ['ignore', 'pipe', 'pipe']
                                });

                                // Save PID to file for cross-session tracking
                                if (engineProcess.pid) {
                                    fs.writeFileSync(PID_FILE_PATH, String(engineProcess.pid));
                                }

                                engineProcess.stdout?.on('data', (data) => {
                                    console.log(`[DAQ Engine] ${data.toString()}`);
                                });

                                engineProcess.stderr?.on('data', (data) => {
                                    console.error(`[DAQ Engine Error] ${data.toString()}`);
                                });

                                engineProcess.on('close', (code) => {
                                    console.log(`[DAQ Engine] Process exited with code ${code}`);
                                    engineProcess = null;
                                    try { fs.unlinkSync(PID_FILE_PATH); } catch { }
                                });

                                engineProcess.on('error', (err) => {
                                    console.error(`[DAQ Engine] Failed to start: ${err.message}`);
                                    engineProcess = null;
                                    try { fs.unlinkSync(PID_FILE_PATH); } catch { }
                                });

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ status: 'started', pid: engineProcess.pid }));
                            } catch (err: any) {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: err.message }));
                            }
                        };
                        startEngine();
                    } else if (req.url === '/api/engine/stop' && req.method === 'POST') {
                        // Stop the Python DAQ engine (cross-platform with tree-kill)
                        const stopEngine = async () => {
                            const pid = getActivePid();
                            if (pid) {
                                await killProcessTree(pid);
                            }
                            engineProcess = null;
                            try { fs.unlinkSync(PID_FILE_PATH); } catch { }

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ status: 'stopped' }));
                        };
                        stopEngine();
                    } else if (req.url === '/api/engine/status' && req.method === 'GET') {
                        // Check engine status
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            running: engineProcess !== null,
                            pid: engineProcess?.pid || null
                        }));
                    } else {
                        next();
                    }
                });
            }
        }
    ],
    server: {
        port: 3000,
        open: true
    }
})


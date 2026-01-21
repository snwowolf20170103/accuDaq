import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { ChildProcess, spawn } from 'child_process'

// Track the running engine process
let engineProcess: ChildProcess | null = null;

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
                        if (engineProcess) {
                            res.statusCode = 400;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Engine already running' }));
                            return;
                        }

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

                            engineProcess.stdout?.on('data', (data) => {
                                console.log(`[DAQ Engine] ${data.toString()}`);
                            });

                            engineProcess.stderr?.on('data', (data) => {
                                console.error(`[DAQ Engine Error] ${data.toString()}`);
                            });

                            engineProcess.on('close', (code) => {
                                console.log(`[DAQ Engine] Process exited with code ${code}`);
                                engineProcess = null;
                            });

                            engineProcess.on('error', (err) => {
                                console.error(`[DAQ Engine] Failed to start: ${err.message}`);
                                engineProcess = null;
                            });

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ status: 'started', pid: engineProcess.pid }));
                        } catch (err: any) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    } else if (req.url === '/api/engine/stop' && req.method === 'POST') {
                        // Stop the Python DAQ engine
                        if (!engineProcess) {
                            res.statusCode = 400;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'No engine running' }));
                            return;
                        }

                        try {
                            // On Windows, use taskkill to ensure child processes are also terminated
                            if (process.platform === 'win32') {
                                const { execSync } = require('child_process');
                                execSync(`taskkill /pid ${engineProcess.pid} /T /F`, { stdio: 'ignore' });
                            } else {
                                engineProcess.kill('SIGTERM');
                            }
                            engineProcess = null;

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ status: 'stopped' }));
                        } catch (err: any) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err.message }));
                        }
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


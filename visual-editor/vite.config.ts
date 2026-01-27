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
                    } else if (req.url?.startsWith('/api/projects') && req.method === 'GET') {
                        // List all saved projects
                        const projectsDir = path.resolve(__dirname, '../projects');
                        if (!fs.existsSync(projectsDir)) {
                            fs.mkdirSync(projectsDir, { recursive: true });
                        }

                        try {
                            const files = fs.readdirSync(projectsDir)
                                .filter(f => f.endsWith('.daq'))
                                .map(fileName => {
                                    const filePath = path.join(projectsDir, fileName);
                                    const stats = fs.statSync(filePath);
                                    let projectName = fileName.replace('.daq', '');

                                    try {
                                        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                                        projectName = content.meta?.name || projectName;
                                    } catch { }

                                    return {
                                        fileName,
                                        name: projectName,
                                        modifiedAt: stats.mtime.toISOString()
                                    };
                                })
                                .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ projects: files }));
                        } catch (err: any) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    } else if (req.url?.startsWith('/api/project/save') && req.method === 'POST') {
                        // Save project to server
                        let body = '';
                        req.on('data', chunk => { body += chunk.toString(); });
                        req.on('end', () => {
                            try {
                                const { name, project } = JSON.parse(body);
                                const projectsDir = path.resolve(__dirname, '../projects');
                                if (!fs.existsSync(projectsDir)) {
                                    fs.mkdirSync(projectsDir, { recursive: true });
                                }

                                const sanitizedName = name.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');
                                const fileName = `${sanitizedName}.daq`;
                                const filePath = path.join(projectsDir, fileName);

                                fs.writeFileSync(filePath, JSON.stringify(project, null, 2));

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, fileName }));
                            } catch (err: any) {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: err.message }));
                            }
                        });
                    } else if (req.url?.startsWith('/api/project/load') && req.method === 'GET') {
                        // Load project from server
                        const url = new URL(req.url, 'http://localhost');
                        const fileName = url.searchParams.get('file');

                        if (!fileName) {
                            res.statusCode = 400;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Missing file parameter' }));
                            return;
                        }

                        const projectsDir = path.resolve(__dirname, '../projects');
                        const filePath = path.join(projectsDir, fileName);

                        if (!fs.existsSync(filePath)) {
                            res.statusCode = 404;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Project not found' }));
                            return;
                        }

                        try {
                            const content = fs.readFileSync(filePath, 'utf-8');
                            const project = JSON.parse(content);
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ project }));
                        } catch (err: any) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    } else if (req.url?.startsWith('/api/project/import') && req.method === 'POST') {
                        // Import project (upload to server)
                        let body = '';
                        req.on('data', chunk => { body += chunk.toString(); });
                        req.on('end', () => {
                            try {
                                const project = JSON.parse(body);
                                const projectsDir = path.resolve(__dirname, '../projects');
                                if (!fs.existsSync(projectsDir)) {
                                    fs.mkdirSync(projectsDir, { recursive: true });
                                }

                                const projectName = project.meta?.name || 'Imported_Project';
                                const sanitizedName = projectName.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');

                                // Generate unique filename if exists
                                let fileName = `${sanitizedName}.daq`;
                                let counter = 1;
                                while (fs.existsSync(path.join(projectsDir, fileName))) {
                                    fileName = `${sanitizedName}_${counter}.daq`;
                                    counter++;
                                }

                                const filePath = path.join(projectsDir, fileName);
                                fs.writeFileSync(filePath, JSON.stringify(project, null, 2));

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, fileName }));
                            } catch (err: any) {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: err.message }));
                            }
                        });
                    } else if (req.url?.startsWith('/api/project/export') && req.method === 'GET') {
                        // Export/download project from server
                        const url = new URL(req.url, 'http://localhost');
                        const fileName = url.searchParams.get('file');

                        if (!fileName) {
                            res.statusCode = 400;
                            res.end('Missing file parameter');
                            return;
                        }

                        const projectsDir = path.resolve(__dirname, '../projects');
                        const filePath = path.join(projectsDir, fileName);

                        if (!fs.existsSync(filePath)) {
                            res.statusCode = 404;
                            res.end('Project not found');
                            return;
                        }

                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                        const fileStream = fs.createReadStream(filePath);
                        fileStream.pipe(res);
                    } else if (req.url?.startsWith('/api/project/delete') && req.method === 'DELETE') {
                        // Delete project from server
                        const url = new URL(req.url, 'http://localhost');
                        const fileName = url.searchParams.get('file');

                        if (!fileName) {
                            res.statusCode = 400;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Missing file parameter' }));
                            return;
                        }

                        const projectsDir = path.resolve(__dirname, '../projects');
                        const filePath = path.join(projectsDir, fileName);

                        if (!fs.existsSync(filePath)) {
                            res.statusCode = 404;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Project not found' }));
                            return;
                        }

                        try {
                            fs.unlinkSync(filePath);
                            res.statusCode = 200;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        } catch (err: any) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    } else if (req.url?.startsWith('/api/project/rename') && req.method === 'POST') {
                        // Rename project
                        let body = '';
                        req.on('data', chunk => { body += chunk.toString(); });
                        req.on('end', () => {
                            try {
                                const { oldFile, newName } = JSON.parse(body);
                                const projectsDir = path.resolve(__dirname, '../projects');
                                const oldPath = path.join(projectsDir, oldFile);

                                if (!fs.existsSync(oldPath)) {
                                    res.statusCode = 404;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: 'Project not found' }));
                                    return;
                                }

                                const sanitizedName = newName.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');
                                const newFileName = `${sanitizedName}.daq`;
                                const newPath = path.join(projectsDir, newFileName);

                                if (fs.existsSync(newPath) && oldPath !== newPath) {
                                    res.statusCode = 400;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: '项目名称已存在' }));
                                    return;
                                }

                                // Update project meta name
                                const content = JSON.parse(fs.readFileSync(oldPath, 'utf-8'));
                                if (content.meta) {
                                    content.meta.name = newName;
                                }
                                fs.writeFileSync(newPath, JSON.stringify(content, null, 2));

                                if (oldPath !== newPath) {
                                    fs.unlinkSync(oldPath);
                                }

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, fileName: newFileName }));
                            } catch (err: any) {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: err.message }));
                            }
                        });
                    } else if (req.url?.startsWith('/api/project/duplicate') && req.method === 'POST') {
                        // Duplicate project
                        let body = '';
                        req.on('data', chunk => { body += chunk.toString(); });
                        req.on('end', () => {
                            try {
                                const { sourceFile, newName } = JSON.parse(body);
                                const projectsDir = path.resolve(__dirname, '../projects');
                                const sourcePath = path.join(projectsDir, sourceFile);

                                if (!fs.existsSync(sourcePath)) {
                                    res.statusCode = 404;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: 'Source project not found' }));
                                    return;
                                }

                                const sanitizedName = newName.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');
                                const newFileName = `${sanitizedName}.daq`;
                                const newPath = path.join(projectsDir, newFileName);

                                if (fs.existsSync(newPath)) {
                                    res.statusCode = 400;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ error: '项目名称已存在' }));
                                    return;
                                }

                                const content = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
                                if (content.meta) {
                                    content.meta.name = newName;
                                }
                                fs.writeFileSync(newPath, JSON.stringify(content, null, 2));

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, fileName: newFileName }));
                            } catch (err: any) {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: err.message }));
                            }
                        });
                    } else if (req.url === '/api/edge/data/start' && req.method === 'POST') {
                        // Start tracking edge data via MQTT
                        if (!global.edgeDataCache) {
                            global.edgeDataCache = {};
                            import('mqtt').then(({ connect }) => {
                                // Connect to local broker
                                const client = connect('mqtt://localhost:1883');

                                client.on('connect', () => {
                                    console.log('[Vite] Connected to MQTT broker');
                                    // Subscribe to all topics to capture data flow
                                    // In a real app, the engine should publish specific debug topics
                                    // Here we simulate by listening to all and mapping to edges if possible
                                    client.subscribe('#');
                                });

                                client.on('message', (topic, message) => {
                                    try {
                                        // Simple mapping: if topic contains node ID, map to outgoing edges
                                        // Strategy: The backend engine should ideally publish to accudaq/debug/edge/{edgeId}
                                        // For now, we will assume the topic string might contain edge ID or we map node outputs

                                        // Store raw data for debugging
                                        const payload = message.toString();

                                        // Parsed value
                                        let value;
                                        try { value = JSON.parse(payload); } catch { value = payload; }

                                        // If we have a specific debug topic convention
                                        if (topic.startsWith('accudaq/debug/')) {
                                            const id = topic.split('/').pop();
                                            if (id) {
                                                global.edgeDataCache[id] = value;
                                            }
                                        }
                                    } catch (err) {
                                        console.error('[Vite] MQTT message error:', err);
                                    }
                                });

                                global.mqttClient = client;
                            }).catch(err => {
                                console.error('[Vite] Failed to load mqtt module:', err);
                            });
                        }

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ status: 'started' }));

                    } else if (req.url === '/api/edge/data' && req.method === 'GET') {
                        // Return cached edge data
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(global.edgeDataCache || {}));

                    } else {
                        next();
                    }
                });
            }
        }
    ],
    server: {
        port: 3000,
        strictPort: true, // Fail if port 3000 is occupied
        open: true
    }
})


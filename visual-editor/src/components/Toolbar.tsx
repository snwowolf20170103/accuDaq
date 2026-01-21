interface ToolbarProps {
    onExport: () => void
    onImport: () => void
    onCompile: () => void
    onDelete: () => void
    hasSelection: boolean
    isRunning: boolean
    onToggleRun: () => void
    csvPath?: string
}

const Toolbar = ({ onExport, onImport, onCompile, onDelete, hasSelection, csvPath }: ToolbarProps) => {
    return (
        <div className="canvas-toolbar">
            <button className="toolbar-btn primary" onClick={onExport}>
                💾 Export Project
            </button>

            <button className="toolbar-btn secondary" onClick={onImport} style={{ background: '#34495e', marginLeft: 10 }}>
                📂 Import Project
            </button>

            <button className="toolbar-btn primary" onClick={onCompile} style={{ background: '#9b59b6', marginLeft: 10 }}>
                ⚙️ Compile
            </button>

            <button
                className="toolbar-btn"
                onClick={async () => {
                    try {
                        const pathParam = csvPath ? `?path=${encodeURIComponent(csvPath)}` : '';
                        const response = await fetch(`/api/download-csv${pathParam}`);
                        if (!response.ok) throw new Error('Download failed');

                        const blob = await response.blob();

                        // Try to use the File System Access API if supported
                        if ('showSaveFilePicker' in window) {
                            try {
                                const handle = await (window as any).showSaveFilePicker({
                                    suggestedName: 'mqtt_data.csv',
                                    types: [{
                                        description: 'CSV File',
                                        accept: { 'text/csv': ['.csv'] },
                                    }],
                                });
                                const writable = await handle.createWritable();
                                await writable.write(blob);
                                await writable.close();
                                return;
                            } catch (err: any) {
                                // User cancelled or other error, fallback to default download if not a cancellation
                                if (err.name !== 'AbortError') {
                                    console.warn('File picker failed, falling back to default download', err);
                                } else {
                                    return; // User cancelled
                                }
                            }
                        }

                        // Fallback: Create detailed anchor tag download
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'mqtt_data.csv';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);

                    } catch (error) {
                        console.error('Download error:', error);
                        alert('Failed to download CSV');
                    }
                }}
                style={{ background: '#27ae60', marginLeft: 10 }}
            >
                📥 Download CSV
            </button>

            <div className="toolbar-separator" />

            <button
                className="toolbar-btn danger"
                onClick={onDelete}
                disabled={!hasSelection}
                style={{ opacity: hasSelection ? 1 : 0.5 }}
            >
                🗑️ Delete
            </button>

            <div className="toolbar-separator" />

            <span style={{ color: '#888', fontSize: 13 }}>
                Drag components from the left panel onto the canvas
            </span>
        </div>
    )
}

export default Toolbar

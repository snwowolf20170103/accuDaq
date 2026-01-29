
import { useState, useEffect } from 'react'
import './NewProjectDialog.css' // Reuse the same CSS for consistency

interface SaveProjectDialogProps {
    isOpen: boolean
    onClose: () => void
    onSave: (filename: string) => void
    currentName: string
}

const SaveProjectDialog = ({ isOpen, onClose, onSave, currentName }: SaveProjectDialogProps) => {
    const [fileName, setFileName] = useState<string>('')

    useEffect(() => {
        if (isOpen) {
            setFileName(currentName || 'project')
        }
    }, [isOpen, currentName])

    if (!isOpen) return null

    const handleSave = () => {
        if (!fileName.trim()) {
            alert('Please enter a directory name')
            return
        }
        let finalName = fileName.trim()
        if (!finalName.endsWith('.daq')) {
            finalName += '.daq'
        }
        onSave(finalName)
        onClose()
    }

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="dialog-header">
                    <h2>💾 Save Project</h2>
                    <button className="dialog-close" onClick={onClose}>×</button>
                </div>

                <div className="dialog-body">
                    <div className="form-group">
                        <label>File Name (.daq)</label>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="Enter file name"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave()
                                if (e.key === 'Escape') onClose()
                            }}
                        />
                        <p style={{ fontSize: '0.8em', color: '#888', marginTop: '5px' }}>
                            The project will be saved with this filename.
                        </p>
                    </div>
                </div>

                <div className="dialog-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SaveProjectDialog

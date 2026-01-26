import { useState } from 'react'
import { projectTemplates, createBlankProject, createTemperatureMonitorProject, createDataLoggerProject } from '../data/projectTemplates'
import { DAQProject } from '../types'
import './NewProjectDialog.css'

interface NewProjectDialogProps {
    isOpen: boolean
    onClose: () => void
    onCreateProject: (project: DAQProject) => void
}

const NewProjectDialog = ({ isOpen, onClose, onCreateProject }: NewProjectDialogProps) => {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')
    const [projectName, setProjectName] = useState<string>('New Project')

    if (!isOpen) return null

    const handleCreate = () => {
        let project: DAQProject
        
        switch (selectedTemplate) {
            case 'temperature_monitor':
                project = createTemperatureMonitorProject(projectName)
                break
            case 'data_logger':
                project = createDataLoggerProject(projectName)
                break
            default:
                project = createBlankProject(projectName)
        }
        
        project.meta.name = projectName
        onCreateProject(project)
        onClose()
        
        // Reset state
        setSelectedTemplate('blank')
        setProjectName('New Project')
    }

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>🚀 Create New Project</h2>
                    <button className="dialog-close" onClick={onClose}>×</button>
                </div>
                
                <div className="dialog-body">
                    <div className="form-group">
                        <label>Project Name</label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Enter project name"
                            autoFocus
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Select Template</label>
                        <div className="template-grid">
                            {projectTemplates.map((template) => (
                                <div
                                    key={template.id}
                                    className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedTemplate(template.id)}
                                >
                                    <div className="template-icon">{template.icon}</div>
                                    <div className="template-info">
                                        <h3>{template.name}</h3>
                                        <p>{template.description}</p>
                                    </div>
                                    {selectedTemplate === template.id && (
                                        <div className="template-check">✓</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="dialog-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={handleCreate}>
                        Create Project
                    </button>
                </div>
            </div>
        </div>
    )
}

export default NewProjectDialog

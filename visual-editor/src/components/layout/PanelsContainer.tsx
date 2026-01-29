/**
 * PanelsContainer - Extracted container for lazy-loaded views
 * Manages the conditional rendering of different application panels
 * Isolates the loading suspicion and view switching logic
 */
import React, { memo, Suspense, lazy } from 'react'
import { EditorMode } from '../../types'
import { EditorCanvas } from './EditorCanvas'
import CodeView from '../CodeView'

// Re-using the types from parent for now, could be moved to shared types
type ViewType = 'editor' | 'dashboard' | 'flowdesigner' | 'industry' | 'blockly' | 'commlog' | 'replay' | 'history' | 'scheduler'

// Lazy loaded components (hoisted from App.tsx)
const DashboardDesigner = lazy(() => import('../DashboardDesigner'))
const FlowDesigner = lazy(() => import('../FlowDesigner'))
const IndustryWidgets = lazy(() => import('../IndustryWidgets'))
const BlocklyEditor = lazy(() => import('../BlocklyEditor'))
const CommLogViewer = lazy(() => import('../CommLogViewer'))
const DataReplayPanel = lazy(() => import('../DataReplayPanel'))
const HistoryDataViewer = lazy(() => import('../HistoryDataViewer'))
const TaskSchedulerPanel = lazy(() => import('../TaskSchedulerPanel'))

// Loading fallback component
const PanelLoader = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#888'
    }}>
        <div className="loading-spinner"></div>
        <span style={{ marginLeft: 10 }}>Loading Module...</span>
    </div>
)

interface PanelsContainerProps {
    view: ViewType
    editorMode: EditorMode
    onSetEditorMode: (mode: EditorMode) => void
    // EditorCanvas props
    editorCanvasProps: React.ComponentProps<typeof EditorCanvas>
    // Dashboard props
    dashboardProps: {
        editMode: boolean
        isRunning: boolean
        widgets: any
        layout: any
        availableOutputs: any
        onWidgetsChange: (widgets: any) => void
        onLayoutChange: (layout: any) => void
    }
    // Shared props
    onSetView: (view: ViewType) => void
}

function PanelsContainerComponent({
    view,
    editorMode,
    onSetEditorMode,
    editorCanvasProps,
    dashboardProps,
    onSetView
}: PanelsContainerProps) {

    // Render logic per view
    const renderContent = () => {
        switch (view) {
            case 'editor':
                if (editorMode === 'visual') {
                    return <EditorCanvas {...editorCanvasProps} />
                } else {
                    return (
                        <CodeView
                            nodes={editorCanvasProps.nodes}
                            edges={editorCanvasProps.edges}
                            onBack={() => onSetEditorMode('visual')}
                        />
                    )
                }

            case 'dashboard':
                return (
                    <Suspense fallback={<PanelLoader />}>
                        <DashboardDesigner
                            editMode={dashboardProps.editMode}
                            isRunning={dashboardProps.isRunning}
                            widgets={dashboardProps.widgets}
                            layout={dashboardProps.layout}
                            availableOutputs={dashboardProps.availableOutputs}
                            onWidgetsChange={dashboardProps.onWidgetsChange}
                            onLayoutChange={dashboardProps.onLayoutChange}
                        />
                    </Suspense>
                )

            case 'flowdesigner':
                return (
                    <Suspense fallback={<PanelLoader />}>
                        <FlowDesigner
                            onFlowChange={(flow) => {
                                console.log('Flow updated:', flow)
                            }}
                            onNodeSelect={(node) => {
                                console.log('Node selected:', node)
                            }}
                        />
                    </Suspense>
                )

            case 'industry':
                return <Suspense fallback={<PanelLoader />}><IndustryWidgets /></Suspense>

            case 'blockly':
                return <Suspense fallback={<PanelLoader />}><BlocklyEditor /></Suspense>

            case 'commlog':
                return <Suspense fallback={<PanelLoader />}><CommLogViewer onClose={() => onSetView('flowdesigner')} /></Suspense>

            case 'replay':
                return <Suspense fallback={<PanelLoader />}><DataReplayPanel /></Suspense>

            case 'history':
                return <Suspense fallback={<PanelLoader />}><HistoryDataViewer /></Suspense>

            case 'scheduler':
                return <Suspense fallback={<PanelLoader />}><TaskSchedulerPanel /></Suspense>

            default:
                return null
        }
    }

    return (
        <div style={{ flex: 1, display: 'flex', minHeight: 0, height: '100%' }}>
            {renderContent()}
        </div>
    )
}

export const PanelsContainer = memo(PanelsContainerComponent)
export default PanelsContainer

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge } from '@xyflow/react';
import { memo } from 'react';

interface DataEdgeData {
    value?: any;
    showValue?: boolean;
    [key: string]: any;
}

interface DataFlowEdgeProps {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: any;
    targetPosition: any;
    data?: DataEdgeData;
    selected?: boolean;
    markerEnd?: string;
}

const DataFlowEdge = memo(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    markerEnd,
}: DataFlowEdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const value = data?.value;
    const showValue = data?.showValue !== false;

    // Format the value for display
    const formatValue = (val: any): string => {
        if (val === undefined || val === null) return '—';
        if (typeof val === 'boolean') return val ? '✓' : '✗';
        if (typeof val === 'number') return val.toFixed(2);
        if (typeof val === 'object') return JSON.stringify(val).slice(0, 20) + '...';
        return String(val).slice(0, 15);
    };

    const displayValue = formatValue(value);
    const hasValue = value !== undefined && value !== null;

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    stroke: selected ? '#3b82f6' : (hasValue ? '#22c55e' : '#64748b'),
                    strokeWidth: selected ? 3 : 2,
                    animation: hasValue ? 'flowPulse 1s ease-in-out infinite' : 'none',
                }}
            />
            {showValue && hasValue && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                            color: '#22c55e',
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: '1px solid #475569',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            zIndex: 1000,
                            whiteSpace: 'nowrap',
                        }}
                        className="edge-data-label nodrag nopan"
                    >
                        {displayValue}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
});

DataFlowEdge.displayName = 'DataFlowEdge';

export default DataFlowEdge;

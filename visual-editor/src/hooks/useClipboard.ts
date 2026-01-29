import { useState, useCallback } from 'react';
import { Node, Edge, XYPosition } from '@xyflow/react';

interface ClipboardData {
    nodes: Node[];
    edges: Edge[];
}

export const useClipboard = () => {
    const [clipboard, setClipboard] = useState<ClipboardData | null>(null);

    const copy = useCallback((nodes: Node[], edges: Edge[]) => {
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));

        // Only get edges that connect two selected nodes
        const selectedEdges = edges.filter(e =>
            selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
        );

        if (selectedNodes.length > 0) {
            setClipboard({
                nodes: JSON.parse(JSON.stringify(selectedNodes)),
                edges: JSON.parse(JSON.stringify(selectedEdges))
            });
            console.log('Copied', selectedNodes.length, 'nodes');
        }
    }, []);

    const paste = useCallback((
        currentNodes: Node[],
        currentEdges: Edge[],
        screenCenter: XYPosition = { x: 0, y: 0 }
    ): { nodes: Node[], edges: Edge[] } | null => {
        if (!clipboard) return null;

        const { nodes: copiedNodes, edges: copiedEdges } = clipboard;

        // Generate mapping from old ID to new ID
        const idMap = new Map<string, string>();
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        // Calculate center of copied nodes to offset correctly
        if (copiedNodes.length > 0) {
            const minX = Math.min(...copiedNodes.map(n => n.position.x));
            const minY = Math.min(...copiedNodes.map(n => n.position.y));
            const maxX = Math.max(...copiedNodes.map(n => n.position.x));
            const maxY = Math.max(...copiedNodes.map(n => n.position.y));

            const groupWidth = maxX - minX;
            const groupHeight = maxY - minY;

            copiedNodes.forEach(node => {
                const newId = `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                idMap.set(node.id, newId);

                // Calculate relative position within the group
                const relX = node.position.x - minX;
                const relY = node.position.y - minY;

                // Position relative to screen center (centering the group)
                // If screenCenter is 0,0 (default), it falls back to original behavior + offset
                let newX, newY;

                if (screenCenter.x === 0 && screenCenter.y === 0) {
                    newX = node.position.x + 50;
                    newY = node.position.y + 50;
                } else {
                    newX = screenCenter.x - (groupWidth / 2) + relX;
                    newY = screenCenter.y - (groupHeight / 2) + relY;
                }

                newNodes.push({
                    ...node,
                    id: newId,
                    position: { x: newX, y: newY },
                    selected: true
                });
            });

            copiedEdges.forEach(edge => {
                const source = idMap.get(edge.source);
                const target = idMap.get(edge.target);

                if (source && target) {
                    newEdges.push({
                        ...edge,
                        id: `e_${source}_${target}_${Math.random().toString(36).substr(2, 5)}`,
                        source,
                        target,
                        selected: false
                    });
                }
            });
        }

        // Deselect current nodes
        const updatedCurrentNodes = currentNodes.map(n => ({ ...n, selected: false }));

        return {
            nodes: [...updatedCurrentNodes, ...newNodes],
            edges: [...currentEdges, ...newEdges]
        };

    }, [clipboard]);

    return { copy, paste, hasCopied: !!clipboard };
};

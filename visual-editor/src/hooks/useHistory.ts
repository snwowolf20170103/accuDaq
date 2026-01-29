import { useCallback, useRef, useEffect, useState } from 'react';
import { Node, Edge } from '@xyflow/react';

interface HistoryState {
    nodes: Node[];
    edges: Edge[];
}

const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_MS = 300; // Debounce time to group rapid changes

export const useHistory = (currentNodes: Node[], currentEdges: Edge[]) => {
    const historyRef = useRef<HistoryState[]>([]);
    const pointerRef = useRef<number>(-1);
    const isUndoRedoRef = useRef<boolean>(false); // Flag to prevent saving during undo/redo
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedStateRef = useRef<string>('');

    // Use state for canUndo/canRedo to trigger re-renders
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    // Helper to update can states
    const updateCanStates = useCallback(() => {
        setCanUndo(pointerRef.current > 0);
        setCanRedo(pointerRef.current < historyRef.current.length - 1);
    }, []);

    // Auto-save snapshots when nodes/edges change (with debounce)
    useEffect(() => {
        // Skip if this change is from undo/redo
        if (isUndoRedoRef.current) {
            isUndoRedoRef.current = false;
            return;
        }

        // Skip empty state
        if (currentNodes.length === 0 && currentEdges.length === 0) {
            return;
        }

        // Debounce to avoid too many snapshots during rapid changes
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            const currentState = JSON.stringify({ nodes: currentNodes, edges: currentEdges });

            // Skip if state hasn't changed
            if (currentState === lastSavedStateRef.current) {
                return;
            }

            // Truncate any future states if we're in the middle of history
            const newHistory = historyRef.current.slice(0, pointerRef.current + 1);

            // Add new state
            newHistory.push({
                nodes: JSON.parse(JSON.stringify(currentNodes)),
                edges: JSON.parse(JSON.stringify(currentEdges))
            });

            // Limit history size
            if (newHistory.length > MAX_HISTORY_SIZE) {
                newHistory.shift();
            } else {
                pointerRef.current += 1;
            }

            historyRef.current = newHistory;
            lastSavedStateRef.current = currentState;
            updateCanStates();

            console.log(`[History] Auto-saved. Stack: ${newHistory.length}, Pointer: ${pointerRef.current}`);
        }, DEBOUNCE_MS);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [currentNodes, currentEdges, updateCanStates]);

    const undo = useCallback((): HistoryState | null => {
        if (pointerRef.current <= 0) {
            console.log('[History] Cannot undo - at beginning');
            return null;
        }

        isUndoRedoRef.current = true; // Set flag to skip auto-save
        pointerRef.current -= 1;
        const state = historyRef.current[pointerRef.current];
        updateCanStates();

        if (state) {
            lastSavedStateRef.current = JSON.stringify(state);
            console.log(`[History] Undo → Pointer: ${pointerRef.current}/${historyRef.current.length - 1}`);
            return {
                nodes: JSON.parse(JSON.stringify(state.nodes)),
                edges: JSON.parse(JSON.stringify(state.edges))
            };
        }
        return null;
    }, [updateCanStates]);

    const redo = useCallback((): HistoryState | null => {
        if (pointerRef.current >= historyRef.current.length - 1) {
            console.log('[History] Cannot redo - at end');
            return null;
        }

        isUndoRedoRef.current = true; // Set flag to skip auto-save
        pointerRef.current += 1;
        const state = historyRef.current[pointerRef.current];
        updateCanStates();

        if (state) {
            lastSavedStateRef.current = JSON.stringify(state);
            console.log(`[History] Redo → Pointer: ${pointerRef.current}/${historyRef.current.length - 1}`);
            return {
                nodes: JSON.parse(JSON.stringify(state.nodes)),
                edges: JSON.parse(JSON.stringify(state.edges))
            };
        }
        return null;
    }, [updateCanStates]);

    // Manual snapshot (kept for explicit saves, but not typically needed)
    const takeSnapshot = useCallback(() => {
        // Force immediate snapshot
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        const currentState = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
        if (currentState === lastSavedStateRef.current) {
            return;
        }

        const newHistory = historyRef.current.slice(0, pointerRef.current + 1);
        newHistory.push({
            nodes: JSON.parse(JSON.stringify(currentNodes)),
            edges: JSON.parse(JSON.stringify(currentEdges))
        });

        if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
        } else {
            pointerRef.current += 1;
        }

        historyRef.current = newHistory;
        lastSavedStateRef.current = currentState;
        updateCanStates();

        console.log(`[History] Manual snapshot. Stack: ${newHistory.length}, Pointer: ${pointerRef.current}`);
    }, [currentNodes, currentEdges, updateCanStates]);

    return {
        takeSnapshot,
        undo,
        redo,
        canUndo,
        canRedo
    };
};

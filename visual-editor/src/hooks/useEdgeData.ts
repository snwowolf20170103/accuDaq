/**
 * Custom hook for fetching edge data using SWR
 * Replaces manual polling with automatic revalidation and caching
 */
import useSWR from 'swr'
import { useMemo } from 'react'

interface EdgeDataMap {
    [edgeId: string]: any
}

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch edge data')
    return res.json()
})

interface UseEdgeDataOptions {
    enabled?: boolean
    refreshInterval?: number
}

export function useEdgeData(
    edges: Array<{ id: string; source: string; sourceHandle?: string | null; target: string; targetHandle?: string | null }>,
    options: UseEdgeDataOptions = {}
) {
    const { enabled = true, refreshInterval = 500 } = options

    const { data: backendData, error, isLoading } = useSWR<Record<string, any>>(
        enabled ? '/api/edge/data' : null,
        fetcher,
        {
            refreshInterval,
            dedupingInterval: 100,
            revalidateOnFocus: false, // Don't refetch when window regains focus (continuous data stream)
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 1000,
        }
    )

    // Transform backend data to edge ID map with stable reference (Vercel: rerender-memo)
    const edgeDataMap: EdgeDataMap = useMemo(() => {
        const result: EdgeDataMap = {}

        if (backendData && edges.length > 0) {
            const hasBackendData = Object.keys(backendData).length > 0

            edges.forEach(edge => {
                // Key format from backend: source___sourceHandle___target___targetHandle
                const key = `${edge.source}___${edge.sourceHandle || ''}___${edge.target}___${edge.targetHandle || ''}`

                if (backendData[key] !== undefined) {
                    result[edge.id] = backendData[key]
                } else if (!hasBackendData) {
                    // Simulation fallback when no backend data available
                    const sourceHandle = edge.sourceHandle || ''
                    let value: any

                    if (sourceHandle.includes('value') || sourceHandle.includes('result')) {
                        value = Math.round((Math.sin(Date.now() / 1000) + 1) * 50 * 100) / 100
                    } else if (sourceHandle.includes('alarm')) {
                        value = Math.random() > 0.7
                    } else {
                        value = Math.round(Math.random() * 100)
                    }
                    result[edge.id] = value
                }
            })
        }

        return result
    }, [backendData, edges])

    return {
        edgeDataMap,
        isLoading,
        error,
    }
}

// Helper to start edge data tracking on the backend
export async function startEdgeDataTracking() {
    try {
        await fetch('/api/edge/data/start', { method: 'POST' })
    } catch (err) {
        console.warn('Failed to start edge data tracking:', err)
    }
}

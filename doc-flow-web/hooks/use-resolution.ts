'use client';

/**
 * useResolution Hook
 *
 * Hook para gerenciar resolução de documentos com React Query e Realtime.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface UnresolvedDocument {
    id: string;
    filename: string;
    status: string;
    created_at: string;
    error?: string;
}

export interface ResolutionCandidate {
    manifestItemId: string;
    documentCode: string;
    documentTitle?: string;
    similarity: number;
    source: 'extraction' | 'manual' | 'suggestion';
}

export interface ResolutionStats {
    total: number;
    unresolved: number;
    resolved: number;
    rejected: number;
    byConfidence: {
        high: number;
        medium: number;
        low: number;
    };
}

export interface UseResolutionOptions {
    contractId: string;
    enableRealtime?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useResolution({ contractId, enableRealtime = true }: UseResolutionOptions) {
    const queryClient = useQueryClient();
    const supabase = createClient();

    // ========== QUERIES ==========

    // Fetch documentos não resolvidos + stats
    const resolutionQuery = useQuery({
        queryKey: ['resolution', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/resolution?stats=true`);
            if (!res.ok) throw new Error('Failed to fetch resolution data');
            return res.json();
        },
    });

    // ========== MUTATIONS ==========

    // Resolver manualmente
    const resolveMutation = useMutation({
        mutationFn: async ({
            documentId,
            manifestItemId,
        }: {
            documentId: string;
            manifestItemId: string;
        }) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, manifestItemId }),
            });
            if (!res.ok) throw new Error('Resolve failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
            queryClient.invalidateQueries({ queryKey: ['validated-documents', contractId] });
        },
    });

    // Rejeitar
    const rejectMutation = useMutation({
        mutationFn: async ({
            documentId,
            reason,
        }: {
            documentId: string;
            reason?: string;
        }) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, action: 'reject', reason }),
            });
            if (!res.ok) throw new Error('Reject failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
        },
    });

    // Auto-resolver em lote
    const autoResolveMutation = useMutation({
        mutationFn: async ({
            documentIds,
            threshold = 0.9,
        }: {
            documentIds: string[];
            threshold?: number;
        }) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentIds,
                    action: 'auto',
                    autoResolveThreshold: threshold,
                }),
            });
            if (!res.ok) throw new Error('Auto-resolve failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
            queryClient.invalidateQueries({ queryKey: ['validated-documents', contractId] });
        },
    });

    // Rejeitar em lote
    const bulkRejectMutation = useMutation({
        mutationFn: async (documentIds: string[]) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentIds, action: 'reject' }),
            });
            if (!res.ok) throw new Error('Bulk reject failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
        },
    });

    // ========== FETCH CANDIDATES ==========

    const fetchCandidates = async (documentId: string, limit = 10): Promise<ResolutionCandidate[]> => {
        const res = await fetch(
            `/api/validation/${contractId}/resolution/${documentId}/candidates?limit=${limit}`
        );
        if (!res.ok) throw new Error('Failed to fetch candidates');
        const data = await res.json();
        return data.candidates;
    };

    // ========== REALTIME ==========

    useEffect(() => {
        if (!enableRealtime) return;

        const channel = supabase
            .channel(`resolution:${contractId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'validated_documents',
                    filter: `contract_id=eq.${contractId}`,
                },
                (payload) => {
                    // Only invalidate if status changed
                    if (payload.old && payload.new && payload.old.status !== payload.new.status) {
                        queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [contractId, enableRealtime, queryClient, supabase]);

    // ========== COMPUTED ==========

    const unresolvedDocuments: UnresolvedDocument[] = resolutionQuery.data?.documents || [];
    const stats: ResolutionStats | null = resolutionQuery.data?.stats || null;

    return {
        // Data
        unresolvedDocuments,
        unresolvedCount: unresolvedDocuments.length,
        stats,

        // Loading states
        isLoading: resolutionQuery.isLoading,
        isResolving: resolveMutation.isPending,
        isRejecting: rejectMutation.isPending,
        isAutoResolving: autoResolveMutation.isPending,

        // Errors
        error: resolutionQuery.error,

        // Actions
        resolve: resolveMutation.mutateAsync,
        reject: rejectMutation.mutateAsync,
        autoResolve: autoResolveMutation.mutateAsync,
        bulkReject: bulkRejectMutation.mutateAsync,
        fetchCandidates,

        // Refetch
        refetch: resolutionQuery.refetch,
    };
}

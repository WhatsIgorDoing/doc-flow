'use client';

/**
 * useBatches Hook
 *
 * Hook para gerenciar GRDTs (batches) com React Query e Realtime.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Batch {
    id: string;
    name: string;
    description?: string;
    grdt_number?: string;
    total_items: number;
    valid_count: number;
    invalid_count: number;
    pending_count: number;
    validated_at?: string;
    created_at: string;
}

export interface UseBatchesOptions {
    contractId: string;
    enableRealtime?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useBatches({ contractId, enableRealtime = true }: UseBatchesOptions) {
    const queryClient = useQueryClient();
    const supabase = createClient();

    // ========== QUERIES ==========

    // Fetch batches
    const batchesQuery = useQuery({
        queryKey: ['batches', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/batches`);
            if (!res.ok) throw new Error('Failed to fetch batches');
            return res.json();
        },
    });

    // Fetch documentos não atribuídos
    const unassignedQuery = useQuery({
        queryKey: ['unassigned-documents', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/documents?unassigned=true`);
            if (!res.ok) throw new Error('Failed to fetch unassigned');
            return res.json();
        },
    });

    // ========== MUTATIONS ==========

    // Criar batch
    const createMutation = useMutation({
        mutationFn: async ({ name, description }: { name: string; description?: string }) => {
            const res = await fetch(`/api/validation/${contractId}/batches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description }),
            });
            if (!res.ok) throw new Error('Create failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
        },
    });

    // Deletar batch
    const deleteMutation = useMutation({
        mutationFn: async (batchId: string) => {
            const res = await fetch(`/api/validation/${contractId}/batches/${batchId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Delete failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
            queryClient.invalidateQueries({ queryKey: ['unassigned-documents', contractId] });
        },
    });

    // Finalizar batch
    const finalizeMutation = useMutation({
        mutationFn: async (batchId: string) => {
            const res = await fetch(`/api/validation/${contractId}/batches/${batchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'finalize' }),
            });
            if (!res.ok) throw new Error('Finalize failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
        },
    });

    // Atribuir documentos
    const assignMutation = useMutation({
        mutationFn: async ({
            batchId,
            documentIds,
        }: {
            batchId: string;
            documentIds: string[];
        }) => {
            const res = await fetch(`/api/validation/${contractId}/batches/${batchId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_ids: documentIds }),
            });
            if (!res.ok) throw new Error('Assign failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
            queryClient.invalidateQueries({ queryKey: ['unassigned-documents', contractId] });
        },
    });

    // Auto-agrupar
    const autoGroupMutation = useMutation({
        mutationFn: async (maxPerBatch: number = 50) => {
            const res = await fetch(`/api/validation/${contractId}/batches/auto-group`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxPerBatch }),
            });
            if (!res.ok) throw new Error('Auto-group failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
            queryClient.invalidateQueries({ queryKey: ['unassigned-documents', contractId] });
        },
    });

    // ========== REALTIME ==========

    useEffect(() => {
        if (!enableRealtime) return;

        const channel = supabase
            .channel(`validation_batches:${contractId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'validation_batches',
                    filter: `contract_id=eq.${contractId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [contractId, enableRealtime, queryClient, supabase]);

    // ========== COMPUTED ==========

    const batches: Batch[] = batchesQuery.data?.batches || [];
    const unassignedDocuments = unassignedQuery.data?.documents || [];
    const activeBatches = batches.filter((b) => !b.validated_at);
    const finalizedBatches = batches.filter((b) => b.validated_at);

    return {
        // Data
        batches,
        activeBatches,
        finalizedBatches,
        unassignedDocuments,
        unassignedCount: unassignedDocuments.length,

        // Loading states
        isLoading: batchesQuery.isLoading,
        isCreating: createMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isAssigning: assignMutation.isPending,
        isAutoGrouping: autoGroupMutation.isPending,

        // Errors
        error: batchesQuery.error,

        // Actions
        createBatch: createMutation.mutateAsync,
        deleteBatch: deleteMutation.mutateAsync,
        finalizeBatch: finalizeMutation.mutateAsync,
        assignDocuments: assignMutation.mutateAsync,
        autoGroup: autoGroupMutation.mutateAsync,

        // Refetch
        refetch: () => {
            batchesQuery.refetch();
            unassignedQuery.refetch();
        },
    };
}

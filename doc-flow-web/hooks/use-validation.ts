'use client';

/**
 * useValidation Hook
 *
 * Hook para gerenciar estado de validação de documentos.
 * Integra com React Query e Supabase Realtime.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ValidationStatus } from '@/lib/validator/types/validator-types';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationJobStatus {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    total_files: number;
    processed_files: number;
    current_file?: string;
    error?: string;
    created_at: string;
    completed_at?: string;
}

export interface ValidatedDocument {
    id: string;
    filename: string;
    status: ValidationStatus;
    matched_document_code?: string;
    manifest_item_id?: string;
    confidence: number;
    error?: string;
    batch_id?: string;
    grd_number?: string;
    validation_date: string;
}

export interface UseValidationOptions {
    contractId: string;
    enableRealtime?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useValidation({ contractId, enableRealtime = true }: UseValidationOptions) {
    const queryClient = useQueryClient();
    const supabase = createClient();

    // ========== QUERIES ==========

    // Fetch documentos validados
    const documentsQuery = useQuery({
        queryKey: ['validated-documents', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/documents`);
            if (!res.ok) throw new Error('Failed to fetch documents');
            return res.json();
        },
    });

    // Fetch jobs de validação
    const jobsQuery = useQuery({
        queryKey: ['validation-jobs', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/jobs`);
            if (!res.ok) throw new Error('Failed to fetch jobs');
            return res.json();
        },
    });

    // Fetch estatísticas
    const statsQuery = useQuery({
        queryKey: ['validation-stats', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/resolution?stats=true`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            return data.stats;
        },
    });

    // ========== MUTATIONS ==========

    // Validar arquivos
    const validateMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await fetch(`/api/validation/${contractId}/validate`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error('Validation failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['validated-documents', contractId] });
            queryClient.invalidateQueries({ queryKey: ['validation-jobs', contractId] });
            queryClient.invalidateQueries({ queryKey: ['validation-stats', contractId] });
        },
    });

    // Atualizar status do documento
    const updateDocumentMutation = useMutation({
        mutationFn: async ({
            documentId,
            status,
            manifestItemId,
        }: {
            documentId: string;
            status: ValidationStatus;
            manifestItemId?: string;
        }) => {
            const res = await fetch(`/api/validation/${contractId}/documents`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, status, manifestItemId }),
            });
            if (!res.ok) throw new Error('Update failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['validated-documents', contractId] });
            queryClient.invalidateQueries({ queryKey: ['validation-stats', contractId] });
        },
    });

    // Cancelar job
    const cancelJobMutation = useMutation({
        mutationFn: async (jobId: string) => {
            const res = await fetch(`/api/validation/${contractId}/jobs?jobId=${jobId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Cancel failed');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['validation-jobs', contractId] });
        },
    });

    // ========== REALTIME ==========

    useEffect(() => {
        if (!enableRealtime) return;

        // Subscribe to validated_documents changes
        const documentsChannel = supabase
            .channel(`validated_documents:${contractId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'validated_documents',
                    filter: `contract_id=eq.${contractId}`,
                },
                () => {
                    // Invalidate queries on any change
                    queryClient.invalidateQueries({ queryKey: ['validated-documents', contractId] });
                    queryClient.invalidateQueries({ queryKey: ['validation-stats', contractId] });
                }
            )
            .subscribe();

        // Subscribe to validation_jobs changes
        const jobsChannel = supabase
            .channel(`validation_jobs:${contractId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'validation_jobs',
                    filter: `contract_id=eq.${contractId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['validation-jobs', contractId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(documentsChannel);
            supabase.removeChannel(jobsChannel);
        };
    }, [contractId, enableRealtime, queryClient, supabase]);

    // ========== COMPUTED ==========

    const documents: ValidatedDocument[] = documentsQuery.data?.documents || [];
    const jobs: ValidationJobStatus[] = jobsQuery.data?.jobs || [];
    const activeJob = jobs.find((j) => j.status === 'processing' || j.status === 'pending');

    const stats = statsQuery.data || {
        total: 0,
        unresolved: 0,
        resolved: 0,
        rejected: 0,
    };

    return {
        // Data
        documents,
        jobs,
        activeJob,
        stats,

        // Loading states
        isLoading: documentsQuery.isLoading || jobsQuery.isLoading,
        isValidating: validateMutation.isPending,

        // Errors
        error: documentsQuery.error || jobsQuery.error,

        // Actions
        validate: validateMutation.mutateAsync,
        updateDocument: updateDocumentMutation.mutateAsync,
        cancelJob: cancelJobMutation.mutateAsync,

        // Refetch
        refetch: () => {
            documentsQuery.refetch();
            jobsQuery.refetch();
            statsQuery.refetch();
        },
    };
}

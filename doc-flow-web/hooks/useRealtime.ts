'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to poll for document updates
 * Realtime temporarily disabled - using polling instead
 */
export function useRealtimeDocuments(contractId: string) {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Simple polling every 5 seconds
        console.log('🔄 Polling enabled for contract:', contractId);

        const pollingInterval = setInterval(() => {
            console.log('🔄 Polling for document updates...');
            queryClient.invalidateQueries({
                queryKey: ['validated-documents', contractId],
            });
        }, 5000);

        return () => {
            console.log('🔌 Stopping polling');
            clearInterval(pollingInterval);
        };
    }, [contractId, queryClient]);
}

/**
 * Hook to poll for manifest items updates
 * Realtime temporarily disabled - using polling instead
 */
export function useRealtimeManifest(contractId: string) {
    const queryClient = useQueryClient();

    useEffect(() => {
        console.log('🔄 Polling enabled for manifest:', contractId);

        const pollingInterval = setInterval(() => {
            queryClient.invalidateQueries({
                queryKey: ['manifest', contractId],
            });
        }, 10000); // Poll every 10 seconds

        return () => {
            clearInterval(pollingInterval);
        };
    }, [contractId, queryClient]);
}

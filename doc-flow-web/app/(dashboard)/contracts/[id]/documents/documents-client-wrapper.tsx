'use client';

import { useRealtimeDocuments } from '@/hooks/useRealtime';
import { DocumentsTable } from './documents-table';
import type { ValidatedDocument } from '@/types/database';

interface DocumentsClientWrapperProps {
    contractId: string;
    initialDocuments: ValidatedDocument[];
}

export function DocumentsClientWrapper({
    contractId,
    initialDocuments
}: DocumentsClientWrapperProps) {
    // Enable realtime updates
    useRealtimeDocuments(contractId);

    return <DocumentsTable documents={initialDocuments} contractId={contractId} />;
}

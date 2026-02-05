'use client';

import { useRealtimeDocuments } from '@/hooks/useRealtime';
import { DocumentsTable } from './documents-table';
import type { ValidatedDocumentWithRelations } from '@/types/database';

interface DocumentsClientWrapperProps {
    contractId: string;
    initialDocuments: ValidatedDocumentWithRelations[];
}

export function DocumentsClientWrapper({
    contractId,
    initialDocuments
}: DocumentsClientWrapperProps) {
    // Enable realtime updates
    useRealtimeDocuments(contractId);

    return <DocumentsTable documents={initialDocuments} contractId={contractId} />;
}

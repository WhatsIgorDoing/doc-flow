'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface BatchSelectorProps {
    documentId: string;
    contractId: string;
    currentBatchId: string | null;
}

interface Batch {
    id: string;
    name: string;
}

export function BatchSelector({
    documentId,
    contractId,
    currentBatchId
}: BatchSelectorProps) {
    const queryClient = useQueryClient();

    // Fetch batches for this contract
    const { data: batchesData } = useQuery({
        queryKey: ['batches', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/contracts/${contractId}/batches`);
            if (!res.ok) throw new Error('Failed to fetch batches');
            return res.json();
        },
    });

    const batches: Batch[] = batchesData?.batches || [];

    // Mutation to update document batch
    const updateBatch = useMutation({
        mutationFn: async (batchId: string | null) => {
            const res = await fetch(`/api/documents/${documentId}/batch`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch_id: batchId }),
            });

            if (!res.ok) throw new Error('Failed to update batch');
            return res.json();
        },
        onSuccess: () => {
            // Invalidate both documents and batches to refresh stats
            queryClient.invalidateQueries({ queryKey: ['validated-documents', contractId] });
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
            toast.success('Lote atualizado');
        },
        onError: () => {
            toast.error('Erro ao atualizar lote');
        },
    });

    return (
        <Select
            value={currentBatchId || 'none'}
            onValueChange={(value) => {
                const batchId = value === 'none' ? null : value;
                updateBatch.mutate(batchId);
            }}
            disabled={updateBatch.isPending}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sem lote" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">Sem lote</SelectItem>
                {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

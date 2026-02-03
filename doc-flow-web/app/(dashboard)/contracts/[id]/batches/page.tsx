'use client';

import { use } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, FolderOpen, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BatchDialog } from '@/components/batches/BatchDialog';
import { DeleteBatchDialog } from '@/components/batches/DeleteBatchDialog';
import { toast } from 'sonner';

interface Batch {
    id: string;
    name: string;
    description: string | null;
    validated_at: string;
    total_items: number;
    valid_count: number;
    invalid_count: number;
    pending_count: number;
    created_at: string;
}

export default function BatchesPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: contractId } = use(params);
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['batches', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/contracts/${contractId}/batches`);
            if (!res.ok) throw new Error('Failed to fetch batches');
            return res.json();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (batchId: string) => {
            const res = await fetch(
                `/api/contracts/${contractId}/batches/${batchId}`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('Failed to delete batch');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
            toast.success('Lote deletado com sucesso');
            setDeleteDialogOpen(false);
            setSelectedBatch(null);
        },
        onError: () => {
            toast.error('Erro ao deletar lote');
        },
    });

    const handleEdit = (batch: Batch) => {
        setSelectedBatch(batch);
        setDialogOpen(true);
    };

    const handleDelete = (batch: Batch) => {
        setSelectedBatch(batch);
        setDeleteDialogOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedBatch(null);
        setDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div>
                <Skeleton className="h-8 w-64 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    const batches: Batch[] = data?.batches || [];

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Lotes de Validação</h1>
                    <p className="text-gray-600 mt-2">
                        Organize documentos validados por lotes
                    </p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lote
                </Button>
            </div>

            {batches.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FolderOpen className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Nenhum lote criado
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Crie seu primeiro lote para organizar documentos
                        </p>
                        <Button onClick={handleCreateNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Primeiro Lote
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {batches.map((batch) => {
                        const successRate = batch.total_items > 0
                            ? Math.round((batch.valid_count / batch.total_items) * 100)
                            : 0;

                        return (
                            <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg mb-2">
                                                {batch.name}
                                            </CardTitle>
                                            {batch.description && (
                                                <p className="text-sm text-gray-500 line-clamp-2">
                                                    {batch.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(batch)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(batch)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {new Date(batch.validated_at).toLocaleDateString('pt-BR')}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-gray-50 p-2 rounded">
                                                <p className="text-gray-600">Total</p>
                                                <p className="font-bold text-lg">{batch.total_items}</p>
                                            </div>
                                            <div className="bg-green-50 p-2 rounded">
                                                <p className="text-green-600">Válidos</p>
                                                <p className="font-bold text-lg text-green-700">
                                                    {batch.valid_count}
                                                </p>
                                            </div>
                                            <div className="bg-red-50 p-2 rounded">
                                                <p className="text-red-600">Inválidos</p>
                                                <p className="font-bold text-lg text-red-700">
                                                    {batch.invalid_count}
                                                </p>
                                            </div>
                                            <div className="bg-yellow-50 p-2 rounded">
                                                <p className="text-yellow-600">Pendentes</p>
                                                <p className="font-bold text-lg text-yellow-700">
                                                    {batch.pending_count}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Taxa de Sucesso</span>
                                                <Badge variant={
                                                    successRate >= 90 ? 'default' :
                                                        successRate >= 70 ? 'secondary' :
                                                            'destructive'
                                                }>
                                                    {successRate}%
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <BatchDialog
                contractId={contractId}
                batch={selectedBatch}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />

            <DeleteBatchDialog
                batch={selectedBatch}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => selectedBatch && deleteMutation.mutate(selectedBatch.id)}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}

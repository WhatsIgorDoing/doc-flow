'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, FolderOpen, Trash2, Edit, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BatchDialog } from '@/components/batches/BatchDialog';
import { DeleteBatchDialog } from '@/components/batches/DeleteBatchDialog';
import { BatchDetail } from '@/components/batches/BatchDetail';
import { AnalyticsDashboard } from '@/components/batches/AnalyticsDashboard';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);
    const [batchToEdit, setBatchToEdit] = useState<Batch | null>(null);

    // Fetch Batches
    const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
        queryKey: ['batches', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/contracts/${contractId}/batches`);
            if (!res.ok) throw new Error('Failed to fetch batches');
            return res.json();
        },
    });

    // Fetch Unassigned Docs (needed for Create Dialog)
    const { data: unassignedData } = useQuery({
        queryKey: ['unassigned-docs', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/documents?unassigned=true`);
            if (!res.ok) throw new Error('Failed to fetch unassigned docs');
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
            queryClient.invalidateQueries({ queryKey: ['unassigned-docs', contractId] });
            toast.success('Lote deletado com sucesso');
            setDeleteDialogOpen(false);
            setBatchToDelete(null);
            if (selectedBatchId === batchToDelete?.id) {
                setSelectedBatchId(null);
            }
        },
        onError: () => {
            toast.error('Erro ao deletar lote');
        },
    });

    const handleCreateNew = () => {
        setBatchToEdit(null);
        setDialogOpen(true);
    };

    const handleEdit = (e: React.MouseEvent, batch: Batch) => {
        e.stopPropagation();
        setBatchToEdit(batch);
        setDialogOpen(true);
    };

    const handleDelete = (e: React.MouseEvent, batch: Batch) => {
        e.stopPropagation();
        setBatchToDelete(batch);
        setDeleteDialogOpen(true);
    };

    const batches: Batch[] = batchesData?.batches || [];

    return (
        <div className="flex h-[calc(100vh-3.5rem)] -m-8 overflow-hidden bg-background">
            {/* Sidebar (Master) */}
            <div className="w-1/3 min-w-[320px] border-r flex flex-col bg-slate-50/50">
                <div className="p-4 border-b space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Lotes</h2>
                        <Button size="sm" onClick={handleCreateNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Lote
                        </Button>
                    </div>
                    {/* Inbox / Unassigned Summary */}
                    <button
                        onClick={() => setSelectedBatchId(null)}
                        className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                            selectedBatchId === null
                                ? "bg-white border-primary shadow-sm"
                                : "hover:bg-white/50 border-transparent hover:border-border"
                        )}
                    >
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <LayoutDashboard className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Painel Geral</p>
                            <p className="text-xs text-muted-foreground">Analytics & Métricas</p>
                        </div>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoadingBatches ? (
                        [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)
                    ) : batches.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            Nenhum lote criado.
                        </div>
                    ) : (
                        batches.map((batch) => (
                            <div
                                key={batch.id}
                                onClick={() => setSelectedBatchId(batch.id)}
                                className={cn(
                                    "group relative p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md",
                                    selectedBatchId === batch.id
                                        ? "bg-white border-primary shadow-sm ring-1 ring-primary"
                                        : "bg-white border-border hover:border-primary/50"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium truncate pr-6 text-foreground">{batch.name}</h3>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2 bg-white/80 rounded-md shadow-sm">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleEdit(e, batch)}>
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleDelete(e, batch)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(batch.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] h-5">
                                            {batch.total_items} itens
                                        </Badge>
                                        <div className={cn("h-2 w-2 rounded-full", batch.validated_at ? "bg-emerald-500" : "bg-amber-500")} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Content (Detail) */}
            <div className="flex-1 bg-background overflow-hidden">
                {selectedBatchId ? (
                    <BatchDetail
                        key={selectedBatchId} // Force remount on change
                        contractId={contractId}
                        batchId={selectedBatchId}
                    />
                ) : (
                    <AnalyticsDashboard contractId={contractId} />
                )}
            </div>

            {/* Dialogs */}
            <BatchDialog
                contractId={contractId}
                batch={batchToEdit}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                selectedDocumentIds={[]} // Main creation doesn't pre-select docs from this view
            />

            <DeleteBatchDialog
                batch={batchToDelete}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => batchToDelete && deleteMutation.mutate(batchToDelete.id)}
                isDeleting={deleteMutation.isPending}
            />
        </div>
    );
}

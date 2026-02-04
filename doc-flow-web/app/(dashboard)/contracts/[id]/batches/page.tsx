'use client';

import { use } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, FolderOpen, Trash2, Edit, FileText, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BatchDialog } from '@/components/batches/BatchDialog';
import { DeleteBatchDialog } from '@/components/batches/DeleteBatchDialog';
import { BatchExportButton } from '@/components/batches/BatchExportButton';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

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

interface UnassignedDocument {
    id: string;
    filename: string;
    status: string;
    validation_date: string;
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
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

    // 1. Fetch Batches
    const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
        queryKey: ['batches', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/contracts/${contractId}/batches`);
            if (!res.ok) throw new Error('Failed to fetch batches');
            return res.json();
        },
    });

    // 2. Fetch Unassigned Documents
    const { data: unassignedData, isLoading: isLoadingDocs } = useQuery({
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
            queryClient.invalidateQueries({ queryKey: ['unassigned-docs', contractId] }); // Docs return to pool
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
        setSelectedDocs([]); // Edit doesn't change docs here
        setDialogOpen(true);
    };

    const handleDelete = (batch: Batch) => {
        setSelectedBatch(batch);
        setDeleteDialogOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedBatch(null);
        // If we clicked "Create Batch" from the top button, we might want to clear selection or keep it?
        // Let's assume top button = empty batch or whatever is selected.
        // Actually, logical flow: Select docs -> Click "Create with Selected"
        // But we also need "Create Empty". 
        // We'll use the same dialog.
        setDialogOpen(true);
    };

    const handleCreateWithSelection = () => {
        if (selectedDocs.length === 0) {
            toast.error('Selecione pelo menos um documento');
            return;
        }
        setSelectedBatch(null);
        setDialogOpen(true);
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked && unassignedData?.documents) {
            setSelectedDocs(unassignedData.documents.map((d: any) => d.id));
        } else {
            setSelectedDocs([]);
        }
    };

    const toggleSelectDoc = (docId: string) => {
        setSelectedDocs(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    if (isLoadingBatches || isLoadingDocs) {
        return (
            <div>
                <Skeleton className="h-8 w-64 mb-8" />
                <Skeleton className="h-64 w-full mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    const batches: Batch[] = batchesData?.batches || [];
    const unassignedDocs: UnassignedDocument[] = unassignedData?.documents || [];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Lotes de Validação</h1>
                    <p className="text-gray-600 mt-2">
                        Organize e exporte documentos validados
                    </p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lote (Vazio)
                </Button>
            </div>

            {/* UNASSIGNED DOCUMENTS SECTION */}
            <Card className="border-blue-100 bg-blue-50/30">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Documentos Disponíveis ({unassignedDocs.length})
                            </CardTitle>
                            <CardDescription>
                                Documentos validados aguardando atribuição a um lote.
                            </CardDescription>
                        </div>
                        <Button
                            onClick={handleCreateWithSelection}
                            disabled={selectedDocs.length === 0}
                            className={selectedDocs.length > 0 ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Lote com Seleção ({selectedDocs.length})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {unassignedDocs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p>Todos os documentos validados já estão em lotes.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-md border shadow-sm max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10">
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={unassignedDocs.length > 0 && selectedDocs.length === unassignedDocs.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Arquivo</TableHead>
                                        <TableHead>Data Validação</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unassignedDocs.map((doc) => (
                                        <TableRow key={doc.id} className="hover:bg-gray-50">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedDocs.includes(doc.id)}
                                                    onCheckedChange={() => toggleSelectDoc(doc.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{doc.filename}</TableCell>
                                            <TableCell>
                                                {doc.validation_date ? new Date(doc.validation_date).toLocaleDateString('pt-BR') : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                                                    {doc.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* BATCHES LIST SECTION */}
            {batches.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FolderOpen className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Nenhum lote criado
                        </h3>
                        <p className="text-gray-500 mb-4">
                            Crie seu primeiro lote acima usando os documentos disponíveis.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {batches.map((batch) => {
                        const successRate = batch.total_items > 0
                            ? Math.round((batch.valid_count / batch.total_items) * 100)
                            : 0;

                        return (
                            <Card key={batch.id} className="hover:shadow-lg transition-shadow flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg mb-1 truncate" title={batch.name}>
                                                {batch.name}
                                            </CardTitle>
                                            {batch.description && (
                                                <p className="text-sm text-gray-500 line-clamp-2" title={batch.description}>
                                                    {batch.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 -mr-2">
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
                                <CardContent className="flex-1 flex flex-col gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            {new Date(batch.validated_at).toLocaleDateString('pt-BR')}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-gray-50 p-2 rounded">
                                                <p className="text-gray-600 text-xs">Total</p>
                                                <p className="font-bold text-lg">{batch.total_items}</p>
                                            </div>
                                            <div className="bg-green-50 p-2 rounded">
                                                <p className="text-green-600 text-xs">Válidos</p>
                                                <p className="font-bold text-lg text-green-700">
                                                    {batch.valid_count}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Qualidade</span>
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

                                    <div className="mt-auto pt-2">
                                        <BatchExportButton
                                            contractId={contractId}
                                            batchId={batch.id}
                                            batchName={batch.name}
                                        />
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
                selectedDocumentIds={selectedDocs}
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

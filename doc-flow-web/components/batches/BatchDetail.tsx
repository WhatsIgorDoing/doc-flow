'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    FileText,
    CheckCircle,
    AlertTriangle,
    Trash2,
    Plus,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DocumentAssignment } from '@/components/batches/document-assignment';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface BatchDetailProps {
    contractId: string;
    batchId: string;
    onClose?: () => void;
}

export function BatchDetail({ contractId, batchId, onClose }: BatchDetailProps) {
    const queryClient = useQueryClient();
    const [showAssignDialog, setShowAssignDialog] = useState(false);

    // Fetch batch com documentos
    const { data, isLoading, error } = useQuery({
        queryKey: ['batch', batchId],
        queryFn: async () => {
            const res = await fetch(
                `/api/validation/${contractId}/batches/${batchId}?includeDocuments=true`
            );
            if (!res.ok) throw new Error('Failed to fetch batch');
            return res.json();
        },
    });

    // Fetch documentos não atribuídos
    const { data: unassignedData } = useQuery({
        queryKey: ['unassigned-documents', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/documents?unassigned=true`);
            if (!res.ok) throw new Error('Failed to fetch documents');
            return res.json();
        },
        enabled: showAssignDialog,
    });

    // Mutation para atribuir documentos
    const assignMutation = useMutation({
        mutationFn: async (documentIds: string[]) => {
            const res = await fetch(
                `/api/validation/${contractId}/batches/${batchId}/assign`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ document_ids: documentIds }),
                }
            );
            if (!res.ok) throw new Error('Failed to assign documents');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
            queryClient.invalidateQueries({ queryKey: ['unassigned-documents', contractId] });
            toast.success('Documentos atribuídos com sucesso');
            setShowAssignDialog(false);
        },
        onError: () => {
            toast.error('Erro ao atribuir documentos');
        },
    });

    // Mutation para remover documento
    const removeMutation = useMutation({
        mutationFn: async (documentIds: string[]) => {
            const res = await fetch(
                `/api/validation/${contractId}/batches/${batchId}/assign`,
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ document_ids: documentIds }),
                }
            );
            if (!res.ok) throw new Error('Failed to remove documents');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
            toast.success('Documento removido do lote');
        },
        onError: () => {
            toast.error('Erro ao remover documento');
        },
    });

    // Mutation para finalizar batch
    const finalizeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(
                `/api/validation/${contractId}/batches/${batchId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'finalize' }),
                }
            );
            if (!res.ok) throw new Error('Failed to finalize batch');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
            toast.success('GRDT finalizada com sucesso');
        },
        onError: () => {
            toast.error('Erro ao finalizar GRDT');
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (error || !data?.batch) {
        return (
            <div className="text-center py-12 p-6">
                <p className="text-red-500">Erro ao carregar batch</p>
                <Button variant="outline" className="mt-4" onClick={onClose}>
                    Voltar
                </Button>
            </div>
        );
    }

    const { batch, documents } = data;
    const isFinalized = !!batch.validated_at;

    return (
        <div className="space-y-6 p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold">{batch.name}</h1>
                        {batch.grdt_number && (
                            <p className="text-sm text-muted-foreground font-mono">
                                {batch.grdt_number}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isFinalized && (
                        <>
                            <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar
                            </Button>
                            <Button
                                onClick={() => finalizeMutation.mutate()}
                                disabled={finalizeMutation.isPending || documents.length === 0}
                            >
                                {finalizeMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Finalizar
                            </Button>
                        </>
                    )}
                    {isFinalized && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Finalizado
                        </Badge>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total" value={batch.total_items} />
                <StatCard
                    label="Válidos"
                    value={batch.valid_count}
                    className="bg-green-50 text-green-800"
                />
                <StatCard
                    label="Pendentes"
                    value={batch.pending_count}
                    className="bg-yellow-50 text-yellow-800"
                />
                <StatCard
                    label="Inválidos"
                    value={batch.invalid_count}
                    className="bg-red-50 text-red-800"
                />
            </div>

            {/* Documents list */}
            <Card>
                <CardHeader>
                    <CardTitle>Documentos ({documents.length})</CardTitle>
                    <CardDescription>
                        Documentos incluídos nesta GRDT
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {documents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>Nenhum documento nesta GRDT</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Arquivo</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map((doc: { id: string; filename: string; status: string }) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-mono text-sm truncate max-w-[200px]" title={doc.filename}>
                                            {doc.filename}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={(doc.status as string).toLowerCase() as any}>
                                                {doc.status}
                                            </StatusBadge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!isFinalized && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeMutation.mutate([doc.id])}
                                                    disabled={removeMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Assign dialog */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Adicionar Documentos</DialogTitle>
                        <DialogDescription>
                            Selecione documentos para adicionar à GRDT "{batch.name}"
                        </DialogDescription>
                    </DialogHeader>
                    <DocumentAssignment
                        documents={unassignedData?.documents || []}
                        batchName={batch.name}
                        onAssign={(ids) => assignMutation.mutateAsync(ids)}
                        isLoading={assignMutation.isPending}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatCard({
    label,
    value,
    className,
}: {
    label: string;
    value: number;
    className?: string;
}) {
    return (
        <Card className={className}>
            <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
        </Card>
    );
}

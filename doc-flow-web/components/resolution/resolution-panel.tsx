'use client';

/**
 * ResolutionPanel Component
 *
 * Painel principal para resolução de documentos não reconhecidos.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowRight,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ResolutionDialog, type ResolutionCandidate } from './resolution-dialog';

// ============================================================================
// TYPES
// ============================================================================

export interface UnresolvedDocument {
    id: string;
    filename: string;
    status: string;
    created_at: string;
    error?: string;
}

export interface ResolutionPanelProps {
    contractId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResolutionPanel({ contractId }: ResolutionPanelProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDocument, setSelectedDocument] = useState<UnresolvedDocument | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Fetch documentos não resolvidos e estatísticas
    const { data, isLoading, error } = useQuery({
        queryKey: ['resolution', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/validation/${contractId}/resolution?stats=true`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
    });

    // Mutation para resolução em lote (auto)
    const autoResolveMutation = useMutation({
        mutationFn: async (documentIds: string[]) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentIds,
                    action: 'auto',
                    autoResolveThreshold: 0.9,
                }),
            });
            if (!res.ok) throw new Error('Failed to auto-resolve');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
            toast.success(`${data.resolved} documentos resolvidos, ${data.pending} pendentes`);
            setSelectedIds(new Set());
        },
        onError: () => {
            toast.error('Erro ao resolver automaticamente');
        },
    });

    // Mutation para rejeição em lote
    const rejectMutation = useMutation({
        mutationFn: async (documentIds: string[]) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentIds,
                    action: 'reject',
                }),
            });
            if (!res.ok) throw new Error('Failed to reject');
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
            toast.success(`${data.rejected} documentos rejeitados`);
            setSelectedIds(new Set());
        },
        onError: () => {
            toast.error('Erro ao rejeitar documentos');
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-red-500">
                    Erro ao carregar documentos para resolução
                </CardContent>
            </Card>
        );
    }

    const documents: UnresolvedDocument[] = data?.documents || [];
    const stats = data?.stats;

    // Filtrar por busca
    const filteredDocuments = searchQuery
        ? documents.filter((d) =>
            d.filename.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : documents;

    // Toggle seleção
    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Selecionar todos
    const selectAll = () => {
        setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    };

    return (
        <div className="space-y-6">
            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        label="Total"
                        value={stats.total}
                        description="Documentos processados"
                    />
                    <StatCard
                        label="Não Resolvidos"
                        value={stats.unresolved}
                        variant="warning"
                        description="Aguardando resolução"
                    />
                    <StatCard
                        label="Resolvidos"
                        value={stats.resolved}
                        variant="success"
                        description="Verificados e associados"
                    />
                    <StatCard
                        label="Rejeitados"
                        value={stats.rejected}
                        variant="error"
                        description="Arquivos não pertinentes"
                    />
                </div>
            )}

            {/* Actions bar */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Documentos para Resolução</CardTitle>
                            <CardDescription>
                                {documents.length} documento(s) aguardando resolução manual
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => autoResolveMutation.mutate(Array.from(selectedIds))}
                                disabled={selectedIds.size === 0 || autoResolveMutation.isPending}
                            >
                                {autoResolveMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-4 w-4" />
                                )}
                                Auto-resolver ({selectedIds.size})
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => rejectMutation.mutate(Array.from(selectedIds))}
                                disabled={selectedIds.size === 0 || rejectMutation.isPending}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Rejeitar ({selectedIds.size})
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search and select */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome de arquivo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={selectAll}>
                            Selecionar todos
                        </Button>
                    </div>

                    {/* Document list */}
                    {filteredDocuments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>Nenhum documento pendente de resolução!</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedIds.has(doc.id)
                                            ? 'bg-primary/10 border-primary'
                                            : 'hover:bg-muted'
                                        }`}
                                    onClick={() => toggleSelection(doc.id)}
                                >
                                    {/* Checkbox visual */}
                                    <div
                                        className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${selectedIds.has(doc.id)
                                                ? 'bg-primary border-primary text-primary-foreground'
                                                : 'border-input'
                                            }`}
                                    >
                                        {selectedIds.has(doc.id) && <CheckCircle className="h-3 w-3" />}
                                    </div>

                                    {/* File info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-mono text-sm truncate">{doc.filename}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(doc.created_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>

                                    {/* Status badge */}
                                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                        <AlertTriangle className="mr-1 h-3 w-3" />
                                        Não Reconhecido
                                    </Badge>

                                    {/* Resolve button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDocument(doc);
                                        }}
                                    >
                                        Resolver
                                        <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Resolution dialog */}
            {selectedDocument && (
                <ResolutionDialog
                    open={!!selectedDocument}
                    onOpenChange={(open) => !open && setSelectedDocument(null)}
                    contractId={contractId}
                    document={selectedDocument}
                    onResolved={() => {
                        queryClient.invalidateQueries({ queryKey: ['resolution', contractId] });
                        setSelectedDocument(null);
                        toast.success('Documento resolvido com sucesso!');
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({
    label,
    value,
    description,
    variant = 'default',
}: {
    label: string;
    value: number;
    description?: string;
    variant?: 'default' | 'success' | 'warning' | 'error';
}) {
    const variantStyles = {
        default: 'bg-slate-50',
        success: 'bg-green-50 text-green-800',
        warning: 'bg-orange-50 text-orange-800',
        error: 'bg-red-50 text-red-800',
    };

    return (
        <Card className={variantStyles[variant]}>
            <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm font-medium">{label}</p>
                {description && (
                    <p className="text-xs opacity-70 mt-1">{description}</p>
                )}
            </CardContent>
        </Card>
    );
}

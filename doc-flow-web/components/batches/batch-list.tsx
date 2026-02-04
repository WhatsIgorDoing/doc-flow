'use client';

/**
 * BatchList Component
 *
 * Lista de GRDTs do contrato com ações.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
    FolderOpen,
    Plus,
    Trash2,
    CheckCircle,
    Clock,
    FileText,
    MoreVertical,
    Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface Batch {
    id: string;
    name: string;
    grdt_number?: string;
    description?: string;
    total_items: number;
    valid_count: number;
    invalid_count: number;
    pending_count: number;
    validated_at?: string;
    created_at: string;
}

export interface BatchListProps {
    batches: Batch[];
    contractId: string;
    onCreateBatch?: () => void;
    onDeleteBatch?: (batchId: string) => void;
    onFinalizeBatch?: (batchId: string) => void;
    onAutoGroup?: () => void;
    isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BatchList({
    batches,
    contractId,
    onCreateBatch,
    onDeleteBatch,
    onFinalizeBatch,
    onAutoGroup,
    isLoading,
}: BatchListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const getBatchStatus = (batch: Batch) => {
        if (batch.validated_at) {
            return { label: 'Finalizado', color: 'bg-green-100 text-green-800' };
        }
        if (batch.pending_count > 0) {
            return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' };
        }
        if (batch.total_items === 0) {
            return { label: 'Vazio', color: 'bg-gray-100 text-gray-800' };
        }
        return { label: 'Pronto', color: 'bg-blue-100 text-blue-800' };
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">GRDTs ({batches.length})</h2>
                    <p className="text-sm text-muted-foreground">
                        Guias de Remessa de Documentos Técnicos
                    </p>
                </div>
                <div className="flex gap-2">
                    {onAutoGroup && (
                        <Button variant="outline" onClick={onAutoGroup} disabled={isLoading}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Auto-agrupar
                        </Button>
                    )}
                    {onCreateBatch && (
                        <Button onClick={onCreateBatch} disabled={isLoading}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nova GRDT
                        </Button>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {batches.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma GRDT criada</h3>
                        <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                            Crie uma nova GRDT para organizar documentos validados em lotes para envio.
                        </p>
                        {onCreateBatch && (
                            <Button onClick={onCreateBatch}>
                                <Plus className="mr-2 h-4 w-4" />
                                Criar primeira GRDT
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Batch list */}
            <div className="grid gap-4">
                {batches.map((batch) => {
                    const status = getBatchStatus(batch);
                    const progress =
                        batch.total_items > 0
                            ? Math.round((batch.valid_count / batch.total_items) * 100)
                            : 0;

                    return (
                        <Card
                            key={batch.id}
                            className={cn(
                                'transition-shadow hover:shadow-md',
                                batch.validated_at && 'border-green-200 bg-green-50/50'
                            )}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base">
                                                <Link
                                                    href={`/contracts/${contractId}/batches/${batch.id}`}
                                                    className="hover:underline"
                                                >
                                                    {batch.name}
                                                </Link>
                                            </CardTitle>
                                            <Badge variant="outline" className={status.color}>
                                                {status.label}
                                            </Badge>
                                        </div>
                                        {batch.grdt_number && (
                                            <CardDescription className="font-mono">
                                                {batch.grdt_number}
                                            </CardDescription>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/contracts/${contractId}/batches/${batch.id}`}>
                                                    <FileText className="mr-2 h-4 w-4" />
                                                    Ver detalhes
                                                </Link>
                                            </DropdownMenuItem>
                                            {!batch.validated_at && onFinalizeBatch && (
                                                <DropdownMenuItem onClick={() => onFinalizeBatch(batch.id)}>
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Finalizar
                                                </DropdownMenuItem>
                                            )}
                                            {onDeleteBatch && (
                                                <DropdownMenuItem
                                                    onClick={() => onDeleteBatch(batch.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-4 text-center text-sm">
                                    <div>
                                        <p className="text-2xl font-bold">{batch.total_items}</p>
                                        <p className="text-muted-foreground">Total</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-600">{batch.valid_count}</p>
                                        <p className="text-muted-foreground">Válidos</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-yellow-600">{batch.pending_count}</p>
                                        <p className="text-muted-foreground">Pendentes</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-600">{batch.invalid_count}</p>
                                        <p className="text-muted-foreground">Inválidos</p>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                {batch.total_items > 0 && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>Progresso</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-500 transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Timestamp */}
                                <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {batch.validated_at ? (
                                        <span>
                                            Finalizado em {new Date(batch.validated_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    ) : (
                                        <span>
                                            Criado em {new Date(batch.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

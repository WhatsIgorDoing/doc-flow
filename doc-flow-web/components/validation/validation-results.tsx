'use client';

/**
 * ValidationResults Component
 *
 * Exibe resultados da validação em formato de tabela.
 * Mostra status, match e ações disponíveis.
 */

import React, { useState } from 'react';
import {
    CheckCircle,
    AlertTriangle,
    HelpCircle,
    XCircle,
    ChevronDown,
    ChevronUp,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

export interface ValidationResultItem {
    filename: string;
    status: 'VALIDATED' | 'NEEDS_SUFFIX' | 'UNRECOGNIZED' | 'ERROR' | 'PENDING';
    matched_document_code?: string;
    matched_manifest_item_id?: string;
    confidence: number;
    error?: string;
}

export interface ValidationResultsProps {
    results: ValidationResultItem[];
    summary?: {
        total: number;
        validated: number;
        needsSuffix: number;
        unrecognized: number;
        errors: number;
    };
    onResolve?: (filename: string) => void;
    onRetry?: (filename: string) => void;
}

type StatusFilter = 'ALL' | 'VALIDATED' | 'NEEDS_SUFFIX' | 'UNRECOGNIZED' | 'ERROR';
type SortField = 'filename' | 'status' | 'confidence';
type SortOrder = 'asc' | 'desc';

// ============================================================================
// HELPERS
// ============================================================================

const STATUS_CONFIG = {
    VALIDATED: {
        label: 'Validado',
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-100 text-green-800',
    },
    NEEDS_SUFFIX: {
        label: 'Precisa Sufixo',
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100 text-yellow-800',
    },
    UNRECOGNIZED: {
        label: 'Não Reconhecido',
        icon: HelpCircle,
        color: 'text-orange-500',
        bgColor: 'bg-orange-100 text-orange-800',
    },
    ERROR: {
        label: 'Erro',
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-100 text-red-800',
    },
    PENDING: {
        label: 'Pendente',
        icon: HelpCircle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100 text-gray-800',
    },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ValidationResults({
    results,
    summary,
    onResolve,
    onRetry,
}: ValidationResultsProps) {
    const [filter, setFilter] = useState<StatusFilter>('ALL');
    const [sortField, setSortField] = useState<SortField>('status');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Filter results
    const filteredResults =
        filter === 'ALL'
            ? results
            : results.filter((r) => r.status === filter);

    // Sort results
    const sortedResults = [...filteredResults].sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
            case 'filename':
                comparison = a.filename.localeCompare(b.filename);
                break;
            case 'status':
                const statusOrder = ['ERROR', 'UNRECOGNIZED', 'NEEDS_SUFFIX', 'PENDING', 'VALIDATED'];
                comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
                break;
            case 'confidence':
                comparison = a.confidence - b.confidence;
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Toggle row expansion
    const toggleRow = (filename: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(filename)) {
                next.delete(filename);
            } else {
                next.add(filename);
            }
            return next;
        });
    };

    // Toggle sort
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
        ) : (
            <ChevronDown className="h-4 w-4" />
        );
    };

    return (
        <div className="space-y-4">
            {/* Summary */}
            {summary && (
                <div className="grid grid-cols-5 gap-4">
                    <SummaryCard
                        label="Total"
                        value={summary.total}
                        className="bg-slate-100"
                    />
                    <SummaryCard
                        label="Validados"
                        value={summary.validated}
                        className="bg-green-100 text-green-800"
                    />
                    <SummaryCard
                        label="Precisa Sufixo"
                        value={summary.needsSuffix}
                        className="bg-yellow-100 text-yellow-800"
                    />
                    <SummaryCard
                        label="Não Reconhecidos"
                        value={summary.unrecognized}
                        className="bg-orange-100 text-orange-800"
                    />
                    <SummaryCard
                        label="Erros"
                        value={summary.errors}
                        className="bg-red-100 text-red-800"
                    />
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center justify-between">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            {filter === 'ALL' ? 'Todos os Status' : STATUS_CONFIG[filter].label}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setFilter('ALL')}>
                            Todos ({results.length})
                        </DropdownMenuItem>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                            const count = results.filter((r) => r.status === key).length;
                            if (count === 0) return null;
                            return (
                                <DropdownMenuItem key={key} onClick={() => setFilter(key as StatusFilter)}>
                                    <config.icon className={cn('mr-2 h-4 w-4', config.color)} />
                                    {config.label} ({count})
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                <p className="text-sm text-muted-foreground">
                    Exibindo {sortedResults.length} de {results.length} resultados
                </p>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('filename')}
                            >
                                <div className="flex items-center gap-1">
                                    Arquivo <SortIcon field="filename" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-1">
                                    Status <SortIcon field="status" />
                                </div>
                            </TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 text-right"
                                onClick={() => handleSort('confidence')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Confiança <SortIcon field="confidence" />
                                </div>
                            </TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedResults.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Nenhum resultado encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedResults.map((result, index) => {
                                const config = STATUS_CONFIG[result.status];
                                const isExpanded = expandedRows.has(result.filename);

                                return (
                                    <React.Fragment key={`${result.filename}-${index}`}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(result.filename)}
                                        >
                                            <TableCell className="font-mono text-sm">
                                                {result.filename}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={config.bgColor}>
                                                    <config.icon className={cn('mr-1 h-3 w-3', config.color)} />
                                                    {config.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {result.matched_document_code ? (
                                                    <span className="font-mono text-sm">
                                                        {result.matched_document_code}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {result.confidence > 0 ? (
                                                    <span
                                                        className={cn(
                                                            'font-medium',
                                                            result.confidence >= 0.9
                                                                ? 'text-green-600'
                                                                : result.confidence >= 0.7
                                                                    ? 'text-yellow-600'
                                                                    : 'text-red-600'
                                                        )}
                                                    >
                                                        {(result.confidence * 100).toFixed(0)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {result.status === 'UNRECOGNIZED' && onResolve && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onResolve(result.filename);
                                                        }}
                                                    >
                                                        Resolver
                                                    </Button>
                                                )}
                                                {result.status === 'ERROR' && onRetry && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRetry(result.filename);
                                                        }}
                                                    >
                                                        Tentar Novamente
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && result.error && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="bg-red-50 text-red-700 text-sm">
                                                    <strong>Erro:</strong> {result.error}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SummaryCard({
    label,
    value,
    className,
}: {
    label: string;
    value: number;
    className?: string;
}) {
    return (
        <div className={cn('p-4 rounded-lg text-center', className)}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm">{label}</p>
        </div>
    );
}

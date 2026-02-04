'use client';

/**
 * ResolutionDialog Component
 *
 * Dialog para resolver um documento não reconhecido.
 * Mostra candidatos e permite seleção manual.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Search,
    CheckCircle,
    FileText,
    Loader2,
    ArrowRight,
    BarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolutionCandidate {
    manifestItemId: string;
    documentCode: string;
    documentTitle?: string;
    similarity: number;
    source: 'extraction' | 'manual' | 'suggestion';
}

export interface ResolutionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contractId: string;
    document: {
        id: string;
        filename: string;
    };
    onResolved: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResolutionDialog({
    open,
    onOpenChange,
    contractId,
    document,
    onResolved,
}: ResolutionDialogProps) {
    const [selectedCandidate, setSelectedCandidate] = useState<ResolutionCandidate | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch candidatos
    const { data, isLoading } = useQuery({
        queryKey: ['candidates', contractId, document.id, debouncedQuery],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('limit', '20');
            if (debouncedQuery) params.set('search', debouncedQuery);

            const res = await fetch(
                `/api/validation/${contractId}/resolution/${document.id}/candidates?${params.toString()}`
            );
            if (!res.ok) throw new Error('Failed to fetch candidates');
            return res.json();
        },
        enabled: open,
    });

    // Mutation para resolver
    const resolveMutation = useMutation({
        mutationFn: async ({ documentId, manifestItemId }: { documentId: string; manifestItemId: string }) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, manifestItemId }),
            });
            if (!res.ok) throw new Error('Failed to resolve');
            return res.json();
        },
        onSuccess: () => {
            onResolved();
        },
    });

    // Mutation para rejeitar
    const rejectMutation = useMutation({
        mutationFn: async (documentId: string) => {
            const res = await fetch(`/api/validation/${contractId}/resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentId,
                    action: 'reject',
                    reason: 'Documento não pertence ao manifesto',
                }),
            });
            if (!res.ok) throw new Error('Failed to reject');
            return res.json();
        },
        onSuccess: () => {
            onResolved();
        },
    });

    const candidates: ResolutionCandidate[] = data?.candidates || [];

    // Server-side filtered now
    const filteredCandidates = candidates;

    const handleResolve = () => {
        if (selectedCandidate) {
            resolveMutation.mutate({
                documentId: document.id,
                manifestItemId: selectedCandidate.manifestItemId,
            });
        }
    };

    const getSimilarityColor = (similarity: number) => {
        if (similarity >= 0.9) return 'text-green-600';
        if (similarity >= 0.7) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'extraction':
                return { label: 'OCR', color: 'bg-blue-100 text-blue-800' };
            case 'suggestion':
                return { label: 'Sugerido', color: 'bg-purple-100 text-purple-800' };
            default:
                return { label: 'Manual', color: 'bg-gray-100 text-gray-800' };
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Resolver Documento</DialogTitle>
                    <DialogDescription>
                        Selecione o item do manifesto correspondente ao arquivo
                    </DialogDescription>
                </DialogHeader>

                {/* Document info */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate">{document.filename}</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por código ou título..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>

                {/* Candidates list */}
                <div className="flex-1 overflow-y-auto border rounded-lg">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : filteredCandidates.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p>Nenhum candidato encontrado</p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {filteredCandidates.map((candidate) => {
                                const isSelected = selectedCandidate?.manifestItemId === candidate.manifestItemId;
                                const sourceInfo = getSourceLabel(candidate.source);

                                return (
                                    <li
                                        key={candidate.manifestItemId}
                                        onClick={() => setSelectedCandidate(candidate)}
                                        className={cn(
                                            'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                                            isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                                        )}
                                    >
                                        {/* Selection indicator */}
                                        <div
                                            className={cn(
                                                'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                                                isSelected
                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                    : 'border-gray-300'
                                            )}
                                        >
                                            {isSelected && <CheckCircle className="h-3 w-3" />}
                                        </div>

                                        {/* Candidate info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-sm font-medium">
                                                {candidate.documentCode}
                                            </p>
                                            {candidate.documentTitle && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {candidate.documentTitle}
                                                </p>
                                            )}
                                        </div>

                                        {/* Source badge */}
                                        <Badge variant="outline" className={sourceInfo.color}>
                                            {sourceInfo.label}
                                        </Badge>

                                        {/* Similarity */}
                                        {candidate.similarity > 0 && (
                                            <div className="flex items-center gap-1">
                                                <BarChart className="h-3 w-3 text-muted-foreground" />
                                                <span
                                                    className={cn(
                                                        'text-sm font-medium',
                                                        getSimilarityColor(candidate.similarity)
                                                    )}
                                                >
                                                    {Math.round(candidate.similarity * 100)}%
                                                </span>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(document.id)}
                        disabled={rejectMutation.isPending}
                    >
                        {rejectMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Rejeitar Documento
                    </Button>
                    <Button
                        onClick={handleResolve}
                        disabled={!selectedCandidate || resolveMutation.isPending}
                    >
                        {resolveMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Associar ao Manifesto
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

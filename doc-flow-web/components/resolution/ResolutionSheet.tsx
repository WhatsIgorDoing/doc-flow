'use client';

/**
 * ResolutionSheet Component
 *
 * Drawer (Sheet) para resolver um documento não reconhecido.
 * Substitui o antigo ResolutionDialog para oferecer uma experiência de "Focus Mode".
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
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export interface ResolutionSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contractId: string;
    document: {
        id: string;
        filename: string;
    } | null;
    onResolved: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResolutionSheet({
    open,
    onOpenChange,
    contractId,
    document,
    onResolved,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
}: ResolutionSheetProps) {
    const [selectedCandidate, setSelectedCandidate] = useState<ResolutionCandidate | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Reset state when document changes
    useEffect(() => {
        setSelectedCandidate(null);
        setSearchQuery('');
        setDebouncedQuery('');
    }, [document]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch candidatos
    const { data, isLoading } = useQuery({
        queryKey: ['candidates', contractId, document?.id, debouncedQuery],
        queryFn: async () => {
            if (!document) return { candidates: [] };

            const params = new URLSearchParams();
            params.set('limit', '20');
            if (debouncedQuery) params.set('search', debouncedQuery);

            const res = await fetch(
                `/api/validation/${contractId}/resolution/${document.id}/candidates?${params.toString()}`
            );
            if (!res.ok) throw new Error('Failed to fetch candidates');
            return res.json();
        },
        enabled: open && !!document,
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
            // Delight: Humanized Feedback
            if (selectedCandidate && selectedCandidate.similarity >= 0.9) {
                toast.success('✨ Match perfeito! Documento associado.', {
                    description: `${document?.filename} -> ${selectedCandidate.documentCode}`
                });
            } else {
                toast.success('Documento associado com sucesso.');
            }
            onResolved();
            onOpenChange(false);
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
            toast.success('Documento rejeitado.');
            onResolved();
            onOpenChange(false);
        },
    });

    const candidates: ResolutionCandidate[] = data?.candidates || [];
    const filteredCandidates = candidates;

    const handleResolve = () => {
        if (selectedCandidate && document) {
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

    if (!document) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col p-0 bg-white shadow-xl">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>Resolver Documento</SheetTitle>
                    <SheetDescription>
                        Associe este arquivo a um item do manifesto.
                    </SheetDescription>
                </SheetHeader>

                {/* Document Preview Header with Navigation */}
                <div className="bg-muted/30 px-6 py-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-white p-2 rounded-md shadow-sm border shrink-0">
                            <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate max-w-[200px] sm:max-w-[300px]" title={document.filename}>
                                {document.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                    Não Reconhecido
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">ID: {document.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onPrevious}
                            disabled={!hasPrevious}
                            title="Anterior"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onNext}
                            disabled={!hasNext}
                            title="Próximo"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Search Bar */}
                    <div className="px-6 py-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código (N-1710) ou título..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Candidates List */}
                    <ScrollArea className="flex-1 px-6 pb-4">
                        {isLoading ? (
                            <div className="space-y-3 pt-2">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        ) : filteredCandidates.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                                <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm font-medium">Nenhum item do manifesto encontrado</p>
                                <p className="text-xs mt-1">Tente buscar por outro termo.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredCandidates.some(c => c.source !== 'manual') && (
                                    <div className="pb-2">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 pl-1">
                                            Sugestões Inteligentes
                                        </h4>
                                        <div className="space-y-2">
                                            {filteredCandidates.filter(c => c.source !== 'manual').map((candidate) => (
                                                <CandidateItem
                                                    key={candidate.manifestItemId}
                                                    candidate={candidate}
                                                    isSelected={selectedCandidate?.manifestItemId === candidate.manifestItemId}
                                                    onSelect={() => setSelectedCandidate(candidate)}
                                                    getSimilarityColor={getSimilarityColor}
                                                    getSourceLabel={getSourceLabel}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(filteredCandidates.some(c => c.source === 'manual') || filteredCandidates.length === 0) && (
                                    <div className="pt-2">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 pl-1">
                                            Outros Resultados
                                        </h4>
                                        <div className="space-y-2">
                                            {filteredCandidates.filter(c => c.source === 'manual').map((candidate) => (
                                                <CandidateItem
                                                    key={candidate.manifestItemId}
                                                    candidate={candidate}
                                                    isSelected={selectedCandidate?.manifestItemId === candidate.manifestItemId}
                                                    onSelect={() => setSelectedCandidate(candidate)}
                                                    getSimilarityColor={getSimilarityColor}
                                                    getSourceLabel={getSourceLabel}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <SheetFooter className="px-6 py-4 border-t gap-2 bg-muted/10">
                    <Button
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                        onClick={() => rejectMutation.mutate(document.id)}
                        disabled={rejectMutation.isPending}
                    >
                        {rejectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                        Rejeitar
                    </Button>
                    <Button
                        className="flex-1 sm:flex-none"
                        onClick={handleResolve}
                        disabled={!selectedCandidate || resolveMutation.isPending}
                    >
                        {resolveMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                        )}
                        Associar e Validar
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

function CandidateItem({
    candidate,
    isSelected,
    onSelect,
    getSimilarityColor,
    getSourceLabel
}: {
    candidate: ResolutionCandidate;
    isSelected: boolean;
    onSelect: () => void;
    getSimilarityColor: (s: number) => string;
    getSourceLabel: (s: string) => { label: string; color: string };
}) {
    const sourceInfo = getSourceLabel(candidate.source);

    return (
        <div
            onClick={onSelect}
            className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                isSelected
                    ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                    : 'border-transparent bg-white hover:border-slate-200 hover:shadow-sm'
            )}
        >
            {/* Selection indicator */}
            <div
                className={cn(
                    'flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
                    isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                )}
            >
                {isSelected && <CheckCircle className="h-3 w-3" />}
            </div>

            {/* Candidate info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <p className="font-mono text-sm font-semibold text-slate-900">
                        {candidate.documentCode}
                    </p>
                    {candidate.similarity > 0 && (
                        <div
                            className="flex items-center gap-1"
                            title={`Confiança: ${Math.round(candidate.similarity * 100)}%`}
                        >
                            <BarChart className="h-3 w-3 text-slate-400" />
                            <span
                                className={cn(
                                    'text-xs font-bold',
                                    getSimilarityColor(candidate.similarity)
                                )}
                            >
                                {Math.round(candidate.similarity * 100)}%
                            </span>
                        </div>
                    )}
                </div>

                {candidate.documentTitle && (
                    <p className="text-xs text-slate-500 truncate mb-1.5" title={candidate.documentTitle}>
                        {candidate.documentTitle}
                    </p>
                )}

                <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-normal", sourceInfo.color)}>
                    {sourceInfo.label}
                </Badge>
            </div>
        </div>
    );
}

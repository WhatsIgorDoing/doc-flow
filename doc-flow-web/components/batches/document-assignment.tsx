'use client';

/**
 * DocumentAssignment Component
 *
 * Componente para atribuir documentos a uma GRDT.
 * Mostra documentos não atribuídos e permite seleção.
 */

import { useState, useMemo } from 'react';
import { Check, Search, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface UnassignedDocument {
    id: string;
    filename: string;
    status: string;
    manifest_item_id?: string;
    validation_date?: string;
}

export interface DocumentAssignmentProps {
    documents: UnassignedDocument[];
    batchName: string;
    onAssign: (documentIds: string[]) => Promise<void>;
    isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DocumentAssignment({
    documents,
    batchName,
    onAssign,
    isLoading,
}: DocumentAssignmentProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Filtrar documentos
    const filteredDocuments = useMemo(() => {
        if (!searchQuery) return documents;
        const query = searchQuery.toLowerCase();
        return documents.filter((doc) =>
            doc.filename.toLowerCase().includes(query)
        );
    }, [documents, searchQuery]);

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

    // Desmarcar todos
    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    // Atribuir selecionados
    const handleAssign = async () => {
        if (selectedIds.size === 0) return;

        setIsAssigning(true);
        try {
            await onAssign(Array.from(selectedIds));
            setSelectedIds(new Set());
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Documentos Disponíveis</CardTitle>
                <CardDescription>
                    Selecione documentos para atribuir à GRDT "{batchName}"
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search and actions */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar documentos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={selectAll}>
                        Todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                        Nenhum
                    </Button>
                </div>

                {/* Document list */}
                <div className="border rounded-lg max-h-80 overflow-y-auto">
                    {filteredDocuments.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                            {searchQuery
                                ? 'Nenhum documento encontrado'
                                : 'Todos os documentos já estão atribuídos'}
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {filteredDocuments.map((doc) => {
                                const isSelected = selectedIds.has(doc.id);

                                return (
                                    <li
                                        key={doc.id}
                                        onClick={() => toggleSelection(doc.id)}
                                        className={cn(
                                            'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                                            isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex h-5 w-5 items-center justify-center rounded border transition-colors',
                                                isSelected
                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                    : 'border-input'
                                            )}
                                        >
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-sm truncate">{doc.filename}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Status: {doc.status}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Summary and action */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                        {selectedIds.size} de {filteredDocuments.length} selecionados
                    </p>
                    <Button
                        onClick={handleAssign}
                        disabled={selectedIds.size === 0 || isAssigning || isLoading}
                    >
                        {isAssigning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Atribuindo...
                            </>
                        ) : (
                            <>
                                Atribuir à GRDT
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

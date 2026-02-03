'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Search } from 'lucide-react';
import { ManifestItemDialog } from './ManifestItemDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface ManifestItem {
    id: string;
    document_code: string;
    revision: string | null;
    title: string | null;
    document_type: string | null;
    category: string | null;
    expected_delivery_date: string | null;
    responsible_email: string | null;
    created_at: string;
}

interface ManifestTableProps {
    contractId: string;
}

async function fetchManifest(contractId: string, page: number, search: string) {
    const url = new URL(`/api/contracts/${contractId}/manifest`, window.location.origin);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('limit', '50');
    if (search) url.searchParams.set('search', search);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch manifest');
    return res.json();
}

export function ManifestTable({ contractId }: ManifestTableProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState<ManifestItem | null>(null);
    const [deleteItem, setDeleteItem] = useState<ManifestItem | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['manifest', contractId, page, search],
        queryFn: () => fetchManifest(contractId, page, search)
    });

    if (isLoading) {
        return <div className="text-center py-8">Carregando...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-600">
                Erro ao carregar manifesto: {(error as Error).message}
            </div>
        );
    }

    const items: ManifestItem[] = data?.data || [];
    const pagination = data?.pagination;

    const getCategoryBadge = (category: string | null) => {
        if (!category) return <Badge variant="secondary">Sem categoria</Badge>;

        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
            'Technical': 'default',
            'Management': 'secondary',
            'Quality': 'outline',
        };

        return <Badge variant={variants[category] || 'secondary'}>{category}</Badge>;
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Buscar por código, título ou tipo..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className="max-w-sm"
                />
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Revisão</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-500">
                                    Nenhum item encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium font-mono text-sm">
                                        {item.document_code}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {item.revision || '-'}
                                    </TableCell>
                                    <TableCell className="max-w-md truncate">
                                        {item.title || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {item.document_type || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {getCategoryBadge(item.category)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {item.responsible_email || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditItem(item)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDeleteItem(item)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Página {pagination.page} de {pagination.totalPages} ({pagination.total} itens)
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                        >
                            Próxima
                        </Button>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            {editItem && (
                <ManifestItemDialog
                    contractId={contractId}
                    item={editItem}
                    open={true}
                    onOpenChange={(open) => !open && setEditItem(null)}
                />
            )}

            {deleteItem && (
                <DeleteConfirmDialog
                    contractId={contractId}
                    item={deleteItem}
                    open={true}
                    onOpenChange={(open) => !open && setDeleteItem(null)}
                />
            )}
        </div>
    );
}

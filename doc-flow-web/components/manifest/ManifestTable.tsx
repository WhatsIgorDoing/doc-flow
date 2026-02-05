'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Pencil, Trash2, Search, FileSpreadsheet, Download } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManifestItemDialog } from './ManifestItemDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ExcelImportSheet } from './ExcelImportSheet';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ManifestItem {
    id: string;
    // Mapped Fields
    index?: number;
    document_code: string; // DOCUMENTO N-1710
    revision: string | null; // REVISÃO
    title: string | null; // TÍTULO
    unit: string | null; // UNIDADE/ÁREA
    discipline: string | null; // DISCIPLINA
    scope: string | null; // ESCOPO
    purpose: string | null; // PROPÓSITO DE EMISSÃO
    expected_delivery_date: string | null; // DATA PREVISTA DE EMISSÃO
    actual_delivery_date?: string | null; // DATA EFETIVA DE EMISSÃO
    n1710?: boolean; // N-1710
    iso9001?: boolean; // ISO 9001
    grdt?: string | null; // GRDT
    status?: string | null; // STATUS
    for_construction?: boolean; // PARA CONTRUÇÃO
    released_revision?: string | null; // REVISÃO QUE ESTÁ LIBERADA
    issuer?: string | null; // EMISSOR
    who?: string | null; // QUEM?
    deadline?: string | null; // PRAZO
    status_sigem?: string | null; // STATUS SIGEM
    remarks?: string | null; // OBSERVAÇÕES
    taxonomy?: string | null; // TAXONOMIA/CONSAG
    allocation_sigem?: string | null; // ALOCAÇÃO SIGEM
    pw?: string | null; // PW

    // Existing/Legacy
    document_type: string | null;
    category: string | null;
    responsible_email: string | null;
    created_at: string;
}

interface ManifestTableProps {
    contractId: string;
}

// ... fetchManifest stays same ...
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
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState<ManifestItem | null>(null);
    const [deleteItem, setDeleteItem] = useState<ManifestItem | null>(null);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['manifest', contractId, page, search],
        queryFn: () => fetchManifest(contractId, page, search)
    });

    const handleImportComplete = () => {
        queryClient.invalidateQueries({ queryKey: ['manifest'] });
        setIsImportOpen(false);
    };

    const handleExport = (discipline: string) => {
        const url = `/api/contracts/${contractId}/manifest/export?discipline=${discipline}`;
        window.open(url, '_blank');
    };

    if (isLoading) {
        return <div className="text-center py-8">Carregando...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-600">
                Erro ao carregar lista de documentos: {(error as Error).message}
            </div>
        );
    }

    const items: ManifestItem[] = data?.data || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar documentos..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Exportar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Selecione o Modelo</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport('quality')}>
                                Qualidade (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('commissioning')}>
                                Comissionamento (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport('cv')}>
                                Currículos (.xlsx)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800">
                        <FileSpreadsheet className="h-4 w-4" />
                        Importar Excel
                    </Button>
                </div>
            </div>

            {/* Table Container with Horizontal Scroll */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="min-w-max">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[80px] font-bold text-xs uppercase tracking-wider text-slate-700">Item</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[200px]">Documento N-1710</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Revisão</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[300px]">Título</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Unidade/Área</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Disciplina</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Escopo</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Propósito de Emissão</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Data Prevista</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Data Efetiva</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">N-1710</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">ISO 9001</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">GRDT</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Status</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Para Construção</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Rev. Liberada</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Emissor</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Quem?</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Prazo</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Status SIGEM</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[200px]">Observações</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Taxonomia/Consag</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">Alocação SIGEM</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">PW</TableHead>
                                    <TableHead className="text-right sticky right-0 bg-slate-50 shadow-l-md">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={25} className="text-center text-gray-500 py-8">
                                            Nenhum documento encontrado na lista
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item, idx) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-mono text-xs text-muted-foreground">{(page - 1) * 50 + idx + 1}</TableCell>
                                            <TableCell className="font-mono font-medium text-blue-700">{item.document_code}</TableCell>
                                            <TableCell className="text-center">{item.revision || '-'}</TableCell>
                                            <TableCell title={item.title || ''}>{item.title || '-'}</TableCell>
                                            <TableCell>{item.unit || '-'}</TableCell>
                                            <TableCell>{item.discipline || '-'}</TableCell>
                                            <TableCell>{item.scope || '-'}</TableCell>
                                            <TableCell>{item.purpose || '-'}</TableCell>
                                            <TableCell>{item.expected_delivery_date ? new Date(item.expected_delivery_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                                            <TableCell>{item.actual_delivery_date || '-'}</TableCell>
                                            <TableCell className="text-center">{item.n1710 ? 'Sim' : 'Não'}</TableCell>
                                            <TableCell className="text-center">{item.iso9001 ? 'Sim' : 'Não'}</TableCell>
                                            <TableCell>{item.grdt || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {item.status || 'Pendente'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">{item.for_construction ? 'Sim' : 'Não'}</TableCell>
                                            <TableCell className="text-center">{item.released_revision || '-'}</TableCell>
                                            <TableCell>{item.issuer || '-'}</TableCell>
                                            <TableCell>{item.who || '-'}</TableCell>
                                            <TableCell>{item.deadline || '-'}</TableCell>
                                            <TableCell>{item.status_sigem || '-'}</TableCell>
                                            <TableCell className="truncate max-w-[200px]" title={item.remarks || ''}>{item.remarks || '-'}</TableCell>
                                            <TableCell>{item.taxonomy || '-'}</TableCell>
                                            <TableCell>{item.allocation_sigem || '-'}</TableCell>
                                            <TableCell>{item.pw || '-'}</TableCell>
                                            <TableCell className="text-right sticky right-0 bg-white drop-shadow-sm border-l">
                                                <div className="flex justify-end gap-1 px-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
                                                        <Pencil className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteItem(item)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
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

            <ExcelImportSheet
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                contractId={contractId}
                onImportComplete={handleImportComplete}
            />
        </div>
    );
}

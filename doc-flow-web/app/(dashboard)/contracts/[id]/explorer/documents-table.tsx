'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { ValidatedDocument, ValidatedDocumentWithRelations } from '@/types/database';
import type { UploadResults } from '@/components/validation/file-uploader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ZenTable,
    ZenTableHeader,
    ZenTableBody,
    ZenTableRow,
    ZenTableHead,
    ZenTableCell,
} from '@/components/ui/ZenTable';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileUploader } from '@/components/validation'; // Reuse existing uploader
import { UploadCloud, FolderSearch, MoreHorizontal, FileSpreadsheet, Download, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';


interface DocumentsTableProps {
    documents: ValidatedDocumentWithRelations[];
    contractId: string;
}

// ... (previous imports)
import { ResolutionSheet } from '@/components/resolution/ResolutionSheet';

// ... (props interface)

export function DocumentsTable({ documents, contractId }: DocumentsTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Initial Filter logic
    const filteredDocs = documents.filter((doc) => {
        const matchesSearch = doc.filename
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        // Handle pending status normalization
        const docStatus = (doc.status || '').toLowerCase() === 'pending' ? 'processing' : doc.status;

        const matchesStatus =
            statusFilter === 'ALL' || docStatus === statusFilter || (statusFilter === 'VALIDATED' && doc.status === 'VALIDATED') || (statusFilter === 'UNRECOGNIZED' && doc.status === 'UNRECOGNIZED') || (statusFilter === 'ERROR' && doc.status === 'ERROR');

        // Simple filter for now until we normalize statuses
        if (statusFilter === 'ALL') return matchesSearch;
        return matchesSearch && doc.status === statusFilter;
    });

    // Sub-set of docs that need triage (for navigation)
    const triageDocs = filteredDocs.filter(d => ['UNRECOGNIZED', 'ERROR', 'NEEDS_SUFFIX'].includes(d.status));

    // Triage State derived from URL
    const documentId = searchParams.get('documentId');
    const triageDocument = documentId ? documents.find(d => d.id === documentId) || null : null;

    const updateUrl = (docId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (docId) {
            params.set('documentId', docId);
        } else {
            params.delete('documentId');
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleResolveClick = (doc: ValidatedDocumentWithRelations, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent row click double-fire
        updateUrl(doc.id);
    };

    const handleRowClick = (doc: ValidatedDocumentWithRelations) => {
        // Only open triage for relevant statuses, otherwise maybe preview (future)
        if (['UNRECOGNIZED', 'ERROR', 'NEEDS_SUFFIX'].includes(doc.status)) {
            updateUrl(doc.id);
        }
    };

    const handleNext = () => {
        if (!triageDocument) return;
        const currentIndex = triageDocs.findIndex(d => d.id === triageDocument.id);
        if (currentIndex !== -1 && currentIndex < triageDocs.length - 1) {
            updateUrl(triageDocs[currentIndex + 1].id);
        }
    };

    const handlePrevious = () => {
        if (!triageDocument) return;
        const currentIndex = triageDocs.findIndex(d => d.id === triageDocument.id);
        if (currentIndex > 0) {
            updateUrl(triageDocs[currentIndex - 1].id);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
        } else {
            setSelectedDocs(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSet = new Set(selectedDocs);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedDocs(newSet);
    };

    // ... (rest of handlers)

    const canGoNext = triageDocument ? triageDocs.findIndex(d => d.id === triageDocument.id) < triageDocs.length - 1 : false;
    const canGoPrev = triageDocument ? triageDocs.findIndex(d => d.id === triageDocument.id) > 0 : false;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <FolderSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar documentos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-muted/20"
                        />
                    </div>
                    <div className="w-[180px]">
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">Todos os status</option>
                            <option value="VALIDATED">Validados</option>
                            <option value="processing">Processando</option>
                            <option value="UNRECOGNIZED">Não Reconhecidos</option>
                            <option value="NEEDS_SUFFIX">Requer Sufixo</option>
                            <option value="ERROR">Com Erro</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {selectedDocs.size > 0 && (
                        <div className="mr-2 text-sm text-muted-foreground">
                            {selectedDocs.size} selecionado(s)
                        </div>
                    )}
                    <Sheet open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <SheetTrigger asChild>
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all hover:shadow-lg">
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Upload
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-xl bg-white">
                            <SheetHeader className="mb-6">
                                <SheetTitle>Upload de Documentos</SheetTitle>
                                <SheetDescription>
                                    Arraste seus arquivos ou clique para selecionar. Processaremos automaticamente.
                                </SheetDescription>
                            </SheetHeader>
                            <FileUploader
                                contractId={contractId}
                                onUploadComplete={(results) => {
                                    toast.success(`${results.summary.validated} arquivos processados com sucesso.`);
                                    setIsUploadOpen(false);
                                }}
                            />
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* ZenTable */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <ZenTable>
                    <ZenTableHeader>
                        <ZenTableRow>
                            {/* ... headers ... */}
                            <ZenTableHead className="w-[40px] pl-4">
                                <Checkbox
                                    checked={filteredDocs.length > 0 && selectedDocs.size === filteredDocs.length}
                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                    aria-label="Select all"
                                />
                            </ZenTableHead>
                            <ZenTableHead>Arquivo</ZenTableHead>
                            <ZenTableHead>Status</ZenTableHead>
                            <ZenTableHead>Código do Documento</ZenTableHead>
                            <ZenTableHead className="text-right">Validação</ZenTableHead>
                            <ZenTableHead className="w-[100px] text-right pr-4">Ações</ZenTableHead>
                        </ZenTableRow>
                    </ZenTableHeader>
                    <ZenTableBody>
                        {filteredDocs.length === 0 ? (
                            <ZenTableRow>
                                <ZenTableCell colSpan={6} className="text-center p-8 text-muted-foreground h-32">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FolderSearch className="h-8 w-8 opacity-20" />
                                        <p>Nenhum documento encontrado.</p>
                                    </div>
                                </ZenTableCell>
                            </ZenTableRow>
                        ) : (
                            filteredDocs.map((doc) => {
                                // Status Translation Map
                                const statusMap: Record<string, string> = {
                                    'VALIDATED': 'Validado',
                                    'processing': 'Processando',
                                    'pending': 'Pendente',
                                    'UNRECOGNIZED': 'Não Reconhecido',
                                    'NEEDS_SUFFIX': 'Requer Sufixo',
                                    'ERROR': 'Erro',
                                    'DELETED': 'Excluído'
                                };
                                const displayStatus = statusMap[doc.status] || statusMap[(doc.status || '').toLowerCase()] || doc.status;

                                return (
                                    <ZenTableRow
                                        key={doc.id}
                                        data-state={selectedDocs.has(doc.id) ? "selected" : undefined}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors group"
                                        onClick={() => handleRowClick(doc)}
                                    >
                                        <ZenTableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedDocs.has(doc.id)}
                                                onCheckedChange={(checked) => handleSelectOne(doc.id, !!checked)}
                                                aria-label={`Select ${doc.filename}`}
                                            />
                                        </ZenTableCell>
                                        <ZenTableCell>
                                            <div className="flex flex-col py-1">
                                                <div className="flex items-center gap-2">
                                                    <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                    <span className="font-medium text-foreground truncate max-w-[280px]" title={doc.filename}>
                                                        {doc.filename}
                                                    </span>
                                                </div>
                                                {doc.file_size && (
                                                    <span className="text-[10px] text-muted-foreground ml-5.5">
                                                        {formatFileSize(doc.file_size)}
                                                    </span>
                                                )}
                                            </div>
                                        </ZenTableCell>
                                        <ZenTableCell>
                                            <StatusBadge status={(doc.status || '').toLowerCase() === 'pending' ? 'processing' : (doc.status || '').toLowerCase() === 'validated' ? 'success' : (doc.status === 'NEEDS_SUFFIX' ? 'warning' : 'error')} size="sm">
                                                {displayStatus}
                                            </StatusBadge>
                                        </ZenTableCell>
                                        <ZenTableCell>
                                            <span className="font-mono text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                                                {doc.manifest_item_id ? (
                                                    doc.manifest_item?.document_code || doc.manifest_item_id.substring(0, 8)
                                                ) : '-'}
                                            </span>
                                        </ZenTableCell>
                                        <ZenTableCell className="text-right tabular-nums text-muted-foreground text-xs">
                                            {format(new Date(doc.validation_date), 'dd/MM HH:mm', { locale: ptBR })}
                                        </ZenTableCell>
                                        <ZenTableCell className="text-right pr-4">
                                            {['UNRECOGNIZED', 'ERROR', 'NEEDS_SUFFIX'].includes(doc.status) ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 shadow-sm"
                                                    onClick={(e) => handleResolveClick(doc, e)}
                                                >
                                                    Resolver
                                                </Button>
                                            ) : (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[160px]">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Download indevido (Demo)"); }}>
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Baixar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateUrl(doc.id); }}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ver Detalhes
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); toast.error("Exclusão desabilitada (Demo)"); }}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </ZenTableCell>
                                    </ZenTableRow>
                                )
                            })
                        )}
                    </ZenTableBody>
                </ZenTable>
            </div>

            <div className="flex items-center justify-between px-2">
                <div className="text-xs text-muted-foreground">
                    Mostrando {filteredDocs.length} de {documents.length}
                </div>
                {/* ... pagination ... */}
            </div>

            <ResolutionSheet
                open={!!triageDocument}
                onOpenChange={(open) => !open && updateUrl(null)}
                contractId={contractId}
                document={triageDocument}
                onResolved={() => updateUrl(null)}
                onNext={canGoNext ? handleNext : undefined}
                onPrevious={canGoPrev ? handlePrevious : undefined}
                hasNext={canGoNext}
                hasPrevious={canGoPrev}
            />
        </div>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

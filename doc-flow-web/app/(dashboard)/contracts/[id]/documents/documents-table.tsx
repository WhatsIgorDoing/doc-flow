'use client';

import { useState } from 'react';
import type { ValidatedDocument } from '@/types/database';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DocumentsTableProps {
    documents: ValidatedDocument[];
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Filter logic
    const filteredDocs = documents.filter((doc) => {
        const matchesSearch = doc.filename
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'ALL' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <Card className="p-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Buscar por nome do arquivo..."
                    className="flex-1 px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">Todos os Status</option>
                    <option value="VALIDATED">Validados</option>
                    <option value="UNRECOGNIZED">Não Reconhecidos</option>
                    <option value="ERROR">Erros</option>
                    <option value="PENDING">Pendentes</option>
                </select>
                <Button variant="outline">Exportar Excel</Button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr className="border-b">
                            <th className="text-left p-4 font-medium">Arquivo</th>
                            <th className="text-left p-4 font-medium">Status</th>
                            <th className="text-left p-4 font-medium">Código do Documento</th>
                            <th className="text-left p-4 font-medium">Lote</th>
                            <th className="text-left p-4 font-medium">Data de Validação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDocs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-muted-foreground">
                                    Nenhum documento encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredDocs.map((doc) => (
                                <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                                    <td className="p-4">
                                        <div>
                                            <p className="font-medium">{doc.filename}</p>
                                            {doc.file_size && (
                                                <p className="text-sm text-muted-foreground">
                                                    {formatFileSize(doc.file_size)}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <StatusBadge status={doc.status} />
                                    </td>
                                    <td className="p-4">
                                        {doc.manifest_item_id ? (
                                            <span className="font-mono text-sm">
                                                {(doc as any).manifest_item?.document_code || '-'}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {doc.lot_number || (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        {format(new Date(doc.validation_date), 'dd/MM/yyyy HH:mm', {
                                            locale: ptBR,
                                        })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Info */}
            <div className="mt-4 text-sm text-muted-foreground">
                Mostrando {filteredDocs.length} de {documents.length} documentos
            </div>
        </Card>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

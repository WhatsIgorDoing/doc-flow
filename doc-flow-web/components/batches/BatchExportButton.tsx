'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FolderInput } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NarrativeProgress } from '@/components/ui/narrative-progress';

interface BatchExportButtonProps {
    contractId: string;
    batchId: string;
    batchName: string;
}

export function BatchExportButton({ contractId, batchId, batchName }: BatchExportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    // Detailed state for progress
    const [progress, setProgress] = useState<{ step: string; count: number; total: number } | null>(null);

    const handleStartExport = async () => {
        try {
            setIsLoading(true);
            setProgress({ step: 'Fetching metadata...', count: 0, total: 0 });

            // 1. Fetch Batch Metadata
            const res = await fetch(`/api/contracts/${contractId}/batches/${batchId}`);
            if (!res.ok) throw new Error('Failed to fetch batch data');

            const { documents, batch } = await res.json();

            if (!documents || documents.length === 0) {
                toast.error('Este lote está vazio.');
                setIsLoading(false);
                return;
            }

            // 2. Open File Picker (Folder) - Trigger Dialog
            setShowDialog(true);
            (window as any).batchExportDocs = documents;

        } catch (error) {
            console.error(error);
            toast.error('Erro ao preparar exportação');
            setIsLoading(false);
        }
    };

    const processFiles = async (fileList: FileList) => {
        try {
            setIsLoading(true);
            setShowDialog(false);
            const documents = (window as any).batchExportDocs as any[];
            const totalDocs = documents.length;

            setProgress({ step: 'Matching files...', count: 0, total: totalDocs });

            const fileMap = new Map<string, File>();
            Array.from(fileList).forEach(f => fileMap.set(f.name, f));

            const zip = new JSZip();
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Manifesto');

            worksheet.columns = [
                { header: 'Código', key: 'code', width: 20 },
                { header: 'Título/Descrição', key: 'title', width: 40 },
                { header: 'Revisão', key: 'revision', width: 10 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Arquivo', key: 'filename', width: 30 },
                { header: 'Encontrado', key: 'found', width: 10 },
            ];

            let matchedCount = 0;

            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                const file = fileMap.get(doc.filename);
                const isFound = !!file;

                if (isFound) {
                    const arrayBuffer = await file!.arrayBuffer();
                    zip.file(doc.filename, arrayBuffer);
                    matchedCount++;
                }

                worksheet.addRow({
                    code: doc.matched_document_code || 'N/A',
                    title: 'Verificado no DocFlow',
                    revision: '',
                    status: doc.status,
                    filename: doc.filename,
                    found: isFound ? 'Sim' : 'NÃO',
                });

                if (i % 5 === 0) {
                    setProgress({ step: 'Compressing...', count: i + 1, total: totalDocs });
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            const excelBuffer = await workbook.xlsx.writeBuffer();
            zip.file('Manifesto.xlsx', excelBuffer);

            setProgress({ step: 'Finalizing ZIP...', count: totalDocs, total: totalDocs });
            const content = await zip.generateAsync({ type: 'blob' });

            const safeName = batchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            saveAs(content, `${safeName}_pacote.zip`);

            toast.success(`Exportação concluída! ${matchedCount}/${totalDocs} arquivos encontrados.`);

        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Falha ao gerar o arquivo ZIP.');
        } finally {
            setIsLoading(false);
            setProgress(null);
            (window as any).batchExportDocs = null;
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={handleStartExport}
                disabled={isLoading}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Download className="h-4 w-4 mr-2" />
                )}
                Exportar Pacote
            </Button>

            {/* Folder Picker Dialog */}
            <Dialog open={showDialog} onOpenChange={(open) => { if (!isLoading) setShowDialog(open); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Selecionar Arquivos Locais</DialogTitle>
                        <DialogDescription>
                            Para gerar o pacote, selecione a pasta onde os arquivos originais (.pdf, .dwg) estão salvos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-8 flex justify-center">
                        <div className="relative">
                            <input
                                type="file"
                                id="folder-input"
                                className="hidden"
                                // @ts-ignore
                                webkitdirectory=""
                                directory=""
                                multiple
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        processFiles(e.target.files);
                                    }
                                }}
                            />
                            <Button
                                size="lg"
                                className="w-full bg-ink-900 text-white hover:bg-ink-800 shadow-layered"
                                onClick={() => document.getElementById('folder-input')?.click()}
                            >
                                <FolderInput className="h-5 w-5 mr-2" />
                                Escolher Pasta Local
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Progress Dialog (Narrative Loading) */}
            <Dialog open={isLoading && !showDialog} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle>Gerando Pacote</DialogTitle>
                        <DialogDescription>
                            Não feche esta janela enquanto processamos seus arquivos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        <NarrativeProgress
                            value={progress ? Math.min(100, Math.round((progress.count / progress.total) * 100)) : 0}
                            steps={[
                                "Lendo metadados...",
                                "Verificando arquivos...",
                                "Comprimindo documentos...",
                                "Gerando planilha Excel...",
                                "Finalizando pacote..."
                            ]}
                            currentStep={progress?.step}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FolderInput } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

            // 2. Open File Picker (Folder)
            // We can't strictly open a folder picker programmatically and "hold" it.
            // But we can ask the user to select the folder via a hidden input OR drag & drop.
            // For this implementation, we'll prompt the user via a Dialog to confirm readiness,
            // then we'll trigger the folder input click.
            setShowDialog(true);

            // Store documents in a ref or state if needed, but for now we'll fetch again or pass it
            // Actually, we need the documents list available when the user selects files.
            // Let's modify the flow: Click Export -> Open Dialog -> User selects Folder input -> Process.

            // So we partially stop here and wait for user interaction in the Dialog.
            // We'll pass the fetched documents to the dialog state.
            (window as any).batchExportDocs = documents; // Temporary storage for the flow

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

            // Create Maps for fast lookup
            // Match logic: try strict filename match first.
            const fileMap = new Map<string, File>();
            Array.from(fileList).forEach(f => fileMap.set(f.name, f));

            const zip = new JSZip();
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Manifesto');

            // Setup Excel Headers
            worksheet.columns = [
                { header: 'Código', key: 'code', width: 20 },
                { header: 'Título/Descrição', key: 'title', width: 40 },
                { header: 'Revisão', key: 'revision', width: 10 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Arquivo', key: 'filename', width: 30 },
                { header: 'Encontrado', key: 'found', width: 10 },
            ];

            let matchedCount = 0;

            console.log(`Processing ${documents.length} docs against ${fileList.length} local files`);

            // Iterate documents and build ZIP + Excel
            for (let i = 0; i < documents.length; i++) {
                const doc = documents[i];
                const file = fileMap.get(doc.filename);
                const isFound = !!file;

                if (isFound) {
                    // Add to ZIP
                    const arrayBuffer = await file!.arrayBuffer();
                    zip.file(doc.filename, arrayBuffer);
                    matchedCount++;
                }

                // Add to Excel
                // Assuming doc has matched_document_code from the manifest match
                // If not, we use what we have.
                // Note: The API response might not have 'manifest_item' expanded if we didn't ask for it.
                // We should probably rely on what's in 'validated_documents' or expand specific fields.
                // For now, mapping best effort.
                worksheet.addRow({
                    code: doc.matched_document_code || 'N/A', // From migration 015
                    title: 'Verificado no DocFlow', // Placeholder if we don't have title ready
                    revision: '', // We might need to parse this or add to DB
                    status: doc.status,
                    filename: doc.filename,
                    found: isFound ? 'Sim' : 'NÃO',
                });

                // Update Progress (every 5 items to avoid UI freeze)
                if (i % 5 === 0) {
                    setProgress({ step: 'Compressing...', count: i + 1, total: totalDocs });
                    // Yield to main thread
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            // Generate Excel Buffer
            const excelBuffer = await workbook.xlsx.writeBuffer();
            zip.file('Manifesto.xlsx', excelBuffer);

            // Generate Final Zip
            setProgress({ step: 'Finalizing ZIP...', count: totalDocs, total: totalDocs });
            const content = await zip.generateAsync({ type: 'blob' });

            // Save
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

            <Dialog open={showDialog} onOpenChange={(open) => { if (!isLoading) setShowDialog(open); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Selecionar Arquivos Locais</DialogTitle>
                        <DialogDescription>
                            Para gerar o pacote sem upload, selecione a pasta em seu computador onde os arquivos originais (.pdf, .dwg) estão salvos.
                            O navegador irá ler os arquivos e criar o ZIP localmente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 flex justify-center">
                        <div className="relative">
                            <input
                                type="file"
                                id="folder-input"
                                className="hidden"
                                // @ts-ignore - 'webkitdirectory' is non-standard but supported in all modern browsers
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
        </>
    );
}

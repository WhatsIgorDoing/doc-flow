'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EXCEL_TEMPLATES, Discipline } from '@/lib/excel/templates';

interface ExcelImportSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contractId: string;
    onImportComplete: () => void;
}

type ImportStep = 'SELECT' | 'PREVIEW' | 'IMPORTING' | 'SUCCESS';

interface PreviewData {
    validRows: number;
    invalidRows: number;
    sample: any[];
}

export function ExcelImportSheet({ open, onOpenChange, contractId, onImportComplete }: ExcelImportSheetProps) {
    const [step, setStep] = useState<ImportStep>('SELECT');
    const [discipline, setDiscipline] = useState<Discipline | ''>('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [loading, setLoading] = useState(false);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        maxFiles: 1,
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
        }
    });

    const handlePreview = async () => {
        if (!file || !discipline) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('discipline', discipline);

        try {
            const response = await fetch(`/api/contracts/${contractId}/manifest/import/preview`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Falha ao ler o arquivo');

            const data = await response.json();
            setPreview(data);
            setStep('PREVIEW');
        } catch (error) {
            toast.error("Erro ao analisar planilha. Verifique se o formato está correto.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!file || !discipline) return;
        setLoading(true);
        setStep('IMPORTING');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('discipline', discipline);

        try {
            const response = await fetch(`/api/contracts/${contractId}/manifest/import/confirm`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Importação falhou');

            const result = await response.json();
            toast.success(`${result.count} documentos importados com sucesso!`);
            setStep('SUCCESS');
            onImportComplete();
        } catch (error) {
            toast.error("Erro ao importar dados.");
            setStep('PREVIEW'); // Go back to preview on error
        } finally {
            setLoading(false);
        }
    };

    const resetState = () => {
        setStep('SELECT');
        setFile(null);
        setPreview(null);
        setDiscipline('');
    };

    return (
        <Sheet open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setTimeout(resetState, 300); }}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col bg-white">
                <SheetHeader>
                    <SheetTitle>Importar Planilha</SheetTitle>
                    <SheetDescription>
                        Adicione documentos em lote importando uma planilha auditada.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 py-6 space-y-6">
                    {/* Step 1: Selection & Upload */}
                    {step === 'SELECT' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Disciplina</label>
                                <Select value={discipline} onValueChange={(v) => setDiscipline(v as Discipline)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo de planilha" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="quality">Qualidade (LD-5290...003)</SelectItem>
                                        <SelectItem value="commissioning">Comissionamento (LD-5290...002)</SelectItem>
                                        <SelectItem value="cv">Currículos (LD-5290...001)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <div className="bg-slate-100 p-3 rounded-full mb-3">
                                    <UploadCloud className="h-6 w-6 text-slate-500" />
                                </div>
                                {file ? (
                                    <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                                        <FileSpreadsheet className="h-4 w-4" />
                                        {file.name}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Arraste a planilha ou clique aqui</p>
                                        <p className="text-xs text-muted-foreground">Suporta apenas anexos .xlsx</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview */}
                    {step === 'PREVIEW' && preview && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Resumo da Análise</p>
                                    <p className="text-xs text-muted-foreground">{file?.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-slate-900">{preview.validRows}</p>
                                    <p className="text-xs text-green-600 font-medium">Linhas válidas</p>
                                </div>
                            </div>

                            <div className="border rounded-md">
                                <div className="bg-slate-100 px-4 py-2 border-b text-xs font-semibold text-slate-500">
                                    Visualização (Primeiras 5 linhas)
                                </div>
                                <ScrollArea className="h-[300px]">
                                    <div className="p-0">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b bg-slate-50">
                                                    <th className="px-4 py-2 text-left font-medium">Código</th>
                                                    <th className="px-4 py-2 text-left font-medium">Título</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.sample.map((row, i) => (
                                                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                                        <td className="px-4 py-2 font-mono text-slate-600">{row.document_code || '-'}</td>
                                                        <td className="px-4 py-2 text-slate-600 truncate max-w-[200px]">{row.title || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Success */}
                    {step === 'SUCCESS' && (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                            <div className="bg-green-100 p-4 rounded-full">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium">Importação Concluída</h3>
                                <p className="text-sm text-muted-foreground">
                                    Todos os documentos foram adicionados à lista.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <SheetFooter className="border-t pt-4">
                    {step === 'SELECT' && (
                        <Button onClick={handlePreview} disabled={!file || !discipline || loading} className="w-full">
                            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Continuar'}
                        </Button>
                    )}
                    {step === 'PREVIEW' && (
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" onClick={() => setStep('SELECT')} className="flex-1">
                                Voltar
                            </Button>
                            <Button onClick={handleConfirmImport} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                                {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Confirmar Importação'}
                            </Button>
                        </div>
                    )}
                    {step === 'SUCCESS' && (
                        <Button onClick={() => onOpenChange(false)} className="w-full">
                            Fechar
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

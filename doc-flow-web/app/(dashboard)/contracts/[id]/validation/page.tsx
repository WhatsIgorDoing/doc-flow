'use client';

/**
 * Validation Page
 *
 * Página de validação de documentos para um contrato.
 * Inclui dashboard, upload e resultados.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileUploader, ValidationResults, type UploadResults, type ValidationResultItem } from '@/components/validation';
import { ValidationDashboard } from '@/components/validation/validation-dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function ValidationPage() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;

    const [results, setResults] = useState<ValidationResultItem[]>([]);
    const [summary, setSummary] = useState<UploadResults['summary'] | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');

    const handleUploadComplete = (data: UploadResults) => {
        setResults(data.results as ValidationResultItem[]);
        setSummary(data.summary);
        setActiveTab('results');
        toast.success(`Validação concluída: ${data.summary.validated} de ${data.summary.total} arquivos validados`);
    };

    const handleError = (error: string) => {
        toast.error(`Erro na validação: ${error}`);
    };

    const handleResolve = (filename: string) => {
        // Navegar para a página de resolução
        router.push(`/contracts/${contractId}/resolution`);
        toast.info(`Navegando para resolução de "${filename}"`);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Validação de Documentos</h1>
                <p className="text-muted-foreground">
                    Gerencie a validação de documentos do contrato
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="results" disabled={results.length === 0}>
                        Resultados {results.length > 0 && `(${results.length})`}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                    <ValidationDashboard contractId={contractId} />
                </TabsContent>

                <TabsContent value="upload" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload de Arquivos</CardTitle>
                            <CardDescription>
                                Arraste arquivos ou clique para selecionar. O sistema validará automaticamente
                                cada arquivo contra os itens do manifesto do contrato.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FileUploader
                                contractId={contractId}
                                onUploadComplete={handleUploadComplete}
                                onError={handleError}
                            />
                        </CardContent>
                    </Card>

                    {/* Quick stats */}
                    {summary && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle className="text-lg">Última Validação</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-5 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold">{summary.total}</p>
                                        <p className="text-sm text-muted-foreground">Total</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-600">{summary.validated}</p>
                                        <p className="text-sm text-muted-foreground">Validados</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-yellow-600">{summary.needsSuffix}</p>
                                        <p className="text-sm text-muted-foreground">Precisa Sufixo</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-orange-600">{summary.unrecognized}</p>
                                        <p className="text-sm text-muted-foreground">Não Reconhecidos</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
                                        <p className="text-sm text-muted-foreground">Erros</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="results" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resultados da Validação</CardTitle>
                            <CardDescription>
                                Visualize os resultados e tome as ações necessárias para arquivos não reconhecidos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ValidationResults
                                results={results}
                                summary={summary || undefined}
                                onResolve={handleResolve}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


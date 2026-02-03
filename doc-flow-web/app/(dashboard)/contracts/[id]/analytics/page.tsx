'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    FileCheck,
    AlertCircle,
    FolderOpen,
    Calendar
} from 'lucide-react';

interface AnalyticsSummary {
    total_documents: number;
    valid_documents: number;
    unrecognized_documents: number;
    error_documents: number;
    pending_documents: number;
    total_batches: number;
    validation_rate_percent: number;
    first_validation_date: string | null;
    last_validation_date: string | null;
}

interface AnalyticsData {
    summary: AnalyticsSummary;
    dailyStats: any[];
    batchPerformance: any[];
    topErrors: any[];
}

export default function AnalyticsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: contractId } = use(params);

    const { data, isLoading } = useQuery<AnalyticsData>({
        queryKey: ['analytics', contractId],
        queryFn: async () => {
            const res = await fetch(`/api/contracts/${contractId}/analytics`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div>
                <Skeleton className="h-8 w-64 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <  Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    const summary = data?.summary;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-600 mt-2">
                    Visão geral de validações e performance
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Documentos
                        </CardTitle>
                        <FolderOpen className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary?.total_documents || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Validados
                        </CardTitle>
                        <FileCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {summary?.valid_documents || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {summary?.validation_rate_percent || 0}% taxa de sucesso
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Erros
                        </CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {summary?.error_documents || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Lotes
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {summary?.total_batches || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Performance de Lotes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.batchPerformance && data.batchPerformance.length > 0 ? (
                            <div className="space-y-4">
                                {data.batchPerformance.slice(0, 5).map((batch: any) => (
                                    <div key={batch.batch_id} className="flex justify-between items-center border-b pb-3">
                                        <div>
                                            <p className="font-medium">{batch.batch_name}</p>
                                            <p className="text-xs text-gray-500">
                                                {batch.total_items} documentos
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${batch.success_rate_percent >= 90 ? 'text-green-600' :
                                                batch.success_rate_percent >= 70 ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                {batch.success_rate_percent}%
                                            </p>
                                            <p className="text-xs text-gray-500">sucesso</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                Nenhum lote encontrado
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            Top Erros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.topErrors && data.topErrors.length > 0 ? (
                            <div className="space-y-3">
                                {data.topErrors.slice(0, 5).map((error: any, idx: number) => (
                                    <div key={idx} className="border-b pb-2">
                                        <p className="text-sm font-medium text-red-600">
                                            {error.error_message}
                                        </p>
                                        <div className="flex justify-between mt-1">
                                            <p className="text-xs text-gray-500">{error.filename}</p>
                                            <p className="text-xs text-gray-700 font-medium">
                                                {error.occurrence_count}x
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                Nenhum erro encontrado 🎉
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Daily Stats Chart Placeholder */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Validações Diárias (Últimos 30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                    {data?.dailyStats && data.dailyStats.length > 0 ? (
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                            <div className="text-center">
                                <p className="text-gray-600 mb-2">📊 Gráfico de linha</p>
                                <p className="text-sm text-gray-500">
                                    {data.dailyStats.length} dias de dados disponíveis
                                </p>
                                <p className="text-xs text-gray-400 mt-2">
                                    (Integração com Recharts em próxima iteração)
                                </p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-16">
                            Sem dados de validação ainda
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

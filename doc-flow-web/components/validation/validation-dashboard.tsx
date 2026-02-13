'use client';

/**
 * ValidationDashboard Component
 *
 * Dashboard de visão geral do módulo de validação.
 * Mostra estatísticas, jobs ativos e ações rápidas.
 */

import { useValidation } from '@/hooks/use-validation';
import { useBatches } from '@/hooks/use-batches';
import { useResolution } from '@/hooks/use-resolution';
import {
    FileCheck,
    FileQuestion,
    FolderOpen,
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingUp,
    Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationDashboardProps {
    contractId: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ValidationDashboard({ contractId }: ValidationDashboardProps) {
    const { documents, activeJob, stats: validationStats, isLoading: loadingValidation } = useValidation({ contractId });
    const { batches, unassignedCount, isLoading: loadingBatches } = useBatches({ contractId });
    const { unresolvedCount, stats: resolutionStats, isLoading: loadingResolution } = useResolution({ contractId });

    const isLoading = loadingValidation || loadingBatches || loadingResolution;

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    // Calcular estatísticas
    const totalDocuments = documents.length;
    const validatedDocuments = documents.filter((d) => d.status === 'VALIDATED').length;
    const needsSuffixDocuments = documents.filter((d) => d.status === 'NEEDS_SUFFIX').length;
    const errorDocuments = documents.filter((d) => d.status === 'ERROR').length;
    const activeBatches = batches.filter((b) => !b.validated_at).length;
    const finalizedBatches = batches.filter((b) => b.validated_at).length;

    const validationRate = totalDocuments > 0
        ? Math.round((validatedDocuments / totalDocuments) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Active Job Progress */}
            {activeJob && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                Validação em Andamento
                            </CardTitle>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                {activeJob.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{activeJob.current_file || 'Iniciando...'}</span>
                                <span>
                                    {activeJob.processed_files} / {activeJob.total_files}
                                </span>
                            </div>
                            <Progress
                                value={(activeJob.processed_files / activeJob.total_files) * 100}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={FileCheck}
                    label="Documentos"
                    value={totalDocuments}
                    subtitle={`${validatedDocuments} validados`}
                    color="blue"
                />
                <StatCard
                    icon={FileQuestion}
                    label="Não Resolvidos"
                    value={unresolvedCount}
                    subtitle={unresolvedCount > 0 ? 'Requer ação' : 'Tudo resolvido'}
                    color={unresolvedCount > 0 ? 'orange' : 'green'}
                    linkTo={`/contracts/${contractId}/resolution`}
                />
                <StatCard
                    icon={FolderOpen}
                    label="GRDTs"
                    value={batches.length}
                    subtitle={`${activeBatches} ativos, ${finalizedBatches} finalizados`}
                    color="purple"
                    linkTo={`/contracts/${contractId}/batches`}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Taxa de Validação"
                    value={`${validationRate}%`}
                    subtitle={`${validatedDocuments}/${totalDocuments}`}
                    color={validationRate >= 90 ? 'green' : validationRate >= 70 ? 'yellow' : 'red'}
                />
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Status dos Documentos</CardTitle>
                        <CardDescription>Distribuição por status de validação</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <StatusRow
                                label="Validados"
                                count={validatedDocuments}
                                total={totalDocuments}
                                color="green"
                            />
                            <StatusRow
                                label="Precisa Sufixo"
                                count={needsSuffixDocuments}
                                total={totalDocuments}
                                color="yellow"
                            />
                            <StatusRow
                                label="Não Reconhecidos"
                                count={unresolvedCount}
                                total={totalDocuments}
                                color="orange"
                            />
                            <StatusRow
                                label="Erros"
                                count={errorDocuments}
                                total={totalDocuments}
                                color="red"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Ações Rápidas</CardTitle>
                        <CardDescription>Próximos passos sugeridos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {unresolvedCount > 0 && (
                            <ActionCard
                                icon={AlertTriangle}
                                title="Resolver Documentos"
                                description={`${unresolvedCount} documentos aguardando resolução manual`}
                                href={`/contracts/${contractId}/resolution`}
                                variant="warning"
                            />
                        )}
                        {unassignedCount > 0 && (
                            <ActionCard
                                icon={FolderOpen}
                                title="Criar GRDT"
                                description={`${unassignedCount} documentos prontos para agrupar`}
                                href={`/contracts/${contractId}/batches`}
                                variant="info"
                            />
                        )}
                        {unresolvedCount === 0 && unassignedCount === 0 && (
                            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground animate-in fade-in zoom-in duration-500">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75 duration-1000"></div>
                                    <CheckCircle className="relative h-12 w-12 mb-2 text-green-500 animate-bounce duration-3000" />
                                </div>
                                <p className="font-medium text-lg text-green-700">Tudo em dia! 🎉</p>
                                <p className="text-sm">Você zerou as pendências.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            {resolutionStats && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Confiança das Validações</CardTitle>
                        <CardDescription>Distribuição por nível de confiança</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Visual Stacked Bar */}
                            <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-100">
                                <div
                                    className="bg-green-500 hover:bg-green-600 transition-colors"
                                    style={{ width: `${(resolutionStats.byConfidence.high / (resolutionStats.total || 1)) * 100}%` }}
                                    title={`Alta Confiança: ${resolutionStats.byConfidence.high}`}
                                />
                                <div
                                    className="bg-yellow-500 hover:bg-yellow-600 transition-colors"
                                    style={{ width: `${(resolutionStats.byConfidence.medium / (resolutionStats.total || 1)) * 100}%` }}
                                    title={`Média Confiança: ${resolutionStats.byConfidence.medium}`}
                                />
                                <div
                                    className="bg-red-500 hover:bg-red-600 transition-colors"
                                    style={{ width: `${(resolutionStats.byConfidence.low / (resolutionStats.total || 1)) * 100}%` }}
                                    title={`Baixa Confiança: ${resolutionStats.byConfidence.low}`}
                                />
                            </div>

                            {/* Legend / Stats */}
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="text-sm font-medium text-gray-600">Alta</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{resolutionStats.byConfidence.high}</p>
                                    <p className="text-xs text-muted-foreground">≥ 90%</p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <span className="text-sm font-medium text-gray-600">Média</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{resolutionStats.byConfidence.medium}</p>
                                    <p className="text-xs text-muted-foreground">70-89%</p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <span className="text-sm font-medium text-gray-600">Baixa</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{resolutionStats.byConfidence.low}</p>
                                    <p className="text-xs text-muted-foreground">&lt; 70%</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({
    icon: Icon,
    label,
    value,
    subtitle,
    color,
    linkTo,
}: {
    icon: typeof FileCheck;
    label: string;
    value: number | string;
    subtitle: string;
    color: 'blue' | 'green' | 'orange' | 'purple' | 'yellow' | 'red';
    linkTo?: string;
}) {
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        red: 'bg-red-50 text-red-600 border-red-200',
    };

    const content = (
        <Card className={`${colorStyles[color]} hover:shadow-md transition-shadow`}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-3xl font-bold">{value}</p>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs opacity-70">{subtitle}</p>
                    </div>
                    <div className="p-2 bg-white/50 rounded-lg">
                        <Icon className="h-6 w-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (linkTo) {
        return <Link href={linkTo}>{content}</Link>;
    }

    return content;
}

function StatusRow({
    label,
    count,
    total,
    color,
}: {
    label: string;
    count: number;
    total: number;
    color: 'green' | 'yellow' | 'orange' | 'red';
}) {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    const colorStyles = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
    };

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="font-medium">{count}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorStyles[color]} rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function ActionCard({
    icon: Icon,
    title,
    description,
    href,
    variant,
}: {
    icon: typeof AlertTriangle;
    title: string;
    description: string;
    href: string;
    variant: 'warning' | 'info';
}) {
    const variantStyles = {
        warning: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
        info: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    };

    const iconColors = {
        warning: 'text-orange-600',
        info: 'text-blue-600',
    };

    return (
        <Link href={href}>
            <div
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${variantStyles[variant]}`}
            >
                <Icon className={`h-5 w-5 ${iconColors[variant]}`} />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
            </div>
        </Link>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-28" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
            </div>
        </div>
    );
}

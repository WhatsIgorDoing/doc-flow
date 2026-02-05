'use client';

/**
 * Overview Page (Antigo Dashboard/Validação)
 *
 * Visão Geral do Contrato.
 * Responsabilidade: Monitoramento Macro (Saúde do Contrato).
 * Ações operacionais removidas (mover para Explorer).
 */

import { useParams } from 'next/navigation';
import { ValidationDashboard } from '@/components/validation/validation-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OverviewPage() {
    const params = useParams();
    const contractId = params.id as string;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
                <p className="text-muted-foreground">
                    Monitoramento da saúde e métricas do contrato.
                </p>
            </div>

            {/* Historical Volume Graph Area */}
            {/* ValidationDashboard já contém KPIs e Gráficos. Garantir que exibe o histórico. */}
            <ValidationDashboard contractId={contractId} />

            {/* Placeholder for Historical Graph if not in Dashboard */}
            <Card>
                <CardHeader>
                    <CardTitle>Volume de Validações (30d)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] flex items-center justify-center border-dashed border-2 rounded bg-slate-50 text-muted-foreground">
                        Gráfico Histórico Aqui (Migrado)
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


'use client';

/**
 * Resolution Page
 *
 * Página de resolução de documentos não reconhecidos.
 */

import { use } from 'react';
import { ResolutionPanel } from '@/components/resolution';

export default function ResolutionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: contractId } = use(params);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Resolução de Documentos</h1>
                <p className="text-muted-foreground">
                    Resolva manualmente documentos que não foram reconhecidos automaticamente
                </p>
            </div>

            <ResolutionPanel contractId={contractId} />
        </div>
    );
}

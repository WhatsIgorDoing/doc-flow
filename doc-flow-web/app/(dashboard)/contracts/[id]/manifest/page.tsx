'use client';

import { use } from 'react';
import { Suspense } from 'react';
import { ManifestTable } from '@/components/manifest/ManifestTable';
import { AddItemButton } from '@/components/manifest/AddItemButton';
import { useRealtimeManifest } from '@/hooks/useRealtime';

export default function ManifestPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id: contractId } = use(params);

    // Enable realtime updates for manifest
    useRealtimeManifest(contractId);

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Lista de documentos
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Gerencie os itens do manifesto do contrato
                    </p>
                </div>
                <AddItemButton contractId={contractId} />
            </div>

            <Suspense fallback={<div className="text-center py-8">Carregando...</div>}>
                <ManifestTable contractId={contractId} />
            </Suspense>
        </div>
    );
}

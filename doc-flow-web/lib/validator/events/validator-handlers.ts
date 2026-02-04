/**
 * Event Handlers - DV Consumer
 *
 * Handlers que o DV executa quando recebe eventos do DCS.
 * Registrar estes handlers na inicialização da aplicação.
 */

import { eventBus } from '@/lib/events';

/**
 * Handler: Quando um manifest item é criado, pode invalidar cache ou
 * preparar para nova validação
 */
async function handleManifestCreated(
    payload: {
        contractId: string;
        manifestItemId: string;
        documentCode: string;
        revision?: string;
    },
    timestamp: string
): Promise<void> {
    // O DV pode usar isso para:
    // 1. Invalidar cache de manifest items
    // 2. Re-validar documentos UNRECOGNIZED que agora podem ter match
    console.log(
        `[DV] New manifest item: ${payload.documentCode} in contract ${payload.contractId}`
    );
}

/**
 * Handler: Quando um manifest item é atualizado
 */
async function handleManifestUpdated(
    payload: {
        contractId: string;
        manifestItemId: string;
        changes: { field: string; oldValue: unknown; newValue: unknown }[];
    },
    timestamp: string
): Promise<void> {
    // Se document_code mudou, pode precisar re-validar documentos
    const codeChanged = payload.changes.some((c) => c.field === 'document_code');

    if (codeChanged) {
        console.log(
            `[DV] Document code changed for manifest ${payload.manifestItemId} - may need revalidation`
        );
    }
}

/**
 * Handler: Quando um manifest item é deletado
 */
async function handleManifestDeleted(
    payload: {
        contractId: string;
        manifestItemId: string;
        documentCode: string;
    },
    timestamp: string
): Promise<void> {
    // Documentos validados que referenciavam este manifest_item
    // terão manifest_item_id = NULL (ON DELETE SET NULL)
    console.log(
        `[DV] Manifest item deleted: ${payload.documentCode} - associated documents now orphaned`
    );
}

/**
 * Handler: Quando um contrato é criado
 */
async function handleContractCreated(
    payload: {
        contractId: string;
        companyId: string;
        code: string;
        name: string;
    },
    timestamp: string
): Promise<void> {
    console.log(`[DV] New contract available for validation: ${payload.code}`);
}

/**
 * Registra todos os handlers do DV
 * Chamar esta função na inicialização da aplicação
 */
export function registerValidatorEventHandlers(): void {
    eventBus.on('manifest.created', handleManifestCreated);
    eventBus.on('manifest.updated', handleManifestUpdated);
    eventBus.on('manifest.deleted', handleManifestDeleted);
    eventBus.on('contract.created', handleContractCreated);

    console.log('[DV] Event handlers registered');
}

/**
 * Remove todos os handlers (útil para testes)
 */
export function unregisterValidatorEventHandlers(): void {
    eventBus.clear();
    console.log('[DV] Event handlers cleared');
}

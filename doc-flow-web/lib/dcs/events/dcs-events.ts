/**
 * DCS Events - Event Emitters for Document Control System
 *
 * Funções helper para emitir eventos do DCS.
 * O DV consome estes eventos.
 */

import { eventBus, createEvent, ManifestCreatedEvent, ManifestUpdatedEvent, ManifestDeletedEvent, ContractCreatedEvent } from '@/lib/events/event-bus';

/**
 * Emite evento quando um contrato é criado
 */
export async function emitContractCreated(params: {
    contractId: string;
    companyId: string;
    code: string;
    name: string;
}): Promise<void> {
    const event = createEvent<ContractCreatedEvent>('contract.created', params);
    await eventBus.emit(event);
}

/**
 * Emite evento quando um item do manifesto é criado
 */
export async function emitManifestCreated(params: {
    contractId: string;
    manifestItemId: string;
    documentCode: string;
    revision?: string;
}): Promise<void> {
    const event = createEvent<ManifestCreatedEvent>('manifest.created', params);
    await eventBus.emit(event);
}

/**
 * Emite evento quando um item do manifesto é atualizado
 */
export async function emitManifestUpdated(params: {
    contractId: string;
    manifestItemId: string;
    changes: { field: string; oldValue: unknown; newValue: unknown }[];
}): Promise<void> {
    const event = createEvent<ManifestUpdatedEvent>('manifest.updated', params);
    await eventBus.emit(event);
}

/**
 * Emite evento quando um item do manifesto é deletado
 */
export async function emitManifestDeleted(params: {
    contractId: string;
    manifestItemId: string;
    documentCode: string;
}): Promise<void> {
    const event = createEvent<ManifestDeletedEvent>('manifest.deleted', params);
    await eventBus.emit(event);
}

/**
 * Validator Events - Event Emitters for Document Validator
 *
 * Funções helper para emitir eventos do DV.
 * O DCS consome estes eventos.
 */

import {
    eventBus,
    createEvent,
    ValidationStartedEvent,
    ValidationProgressEvent,
    ValidationCompletedEvent,
    GrdtCreatedEvent,
    GrdtAssignedEvent,
    DocumentResolvedEvent,
} from '@/lib/events/event-bus';

/**
 * Emite evento quando uma validação é iniciada
 */
export async function emitValidationStarted(params: {
    contractId: string;
    jobId: string;
    totalFiles: number;
}): Promise<void> {
    const event = createEvent<ValidationStartedEvent>('validation.started', params);
    await eventBus.emit(event);
}

/**
 * Emite evento de progresso da validação
 */
export async function emitValidationProgress(params: {
    contractId: string;
    jobId: string;
    processedFiles: number;
    totalFiles: number;
    currentFile: string;
}): Promise<void> {
    const event = createEvent<ValidationProgressEvent>('validation.progress', params);
    await eventBus.emit(event);
}

/**
 * Emite evento quando uma validação é concluída
 */
export async function emitValidationCompleted(params: {
    contractId: string;
    jobId: string;
    stats: {
        validated: number;
        needsSuffix: number;
        unrecognized: number;
        errors: number;
    };
    duration: number;
}): Promise<void> {
    const event = createEvent<ValidationCompletedEvent>('validation.completed', params);
    await eventBus.emit(event);
}

/**
 * Emite evento quando uma GRDT é criada
 */
export async function emitGrdtCreated(params: {
    contractId: string;
    batchId: string;
    grdtNumber: string;
    name: string;
    documentCount: number;
}): Promise<void> {
    const event = createEvent<GrdtCreatedEvent>('grdt.created', params);
    await eventBus.emit(event);
}

/**
 * Emite evento quando documentos são atribuídos a uma GRDT
 */
export async function emitGrdtAssigned(params: {
    batchId: string;
    grdtNumber: string;
    assignments: { documentId: string; manifestItemId: string }[];
}): Promise<void> {
    const event = createEvent<GrdtAssignedEvent>('grdt.assigned', params);
    await eventBus.emit(event);
}

/**
 * Emite evento quando um documento é resolvido
 */
export async function emitDocumentResolved(params: {
    documentId: string;
    documentFilename?: string;
    manifestItemId: string;
    resolutionType?: 'manual' | 'ocr' | 'auto';
    method?: 'OCR' | 'MANUAL' | 'AUTO';
    confidence?: number;
}): Promise<void> {
    // Normalizar parâmetros
    const normalizedParams = {
        documentId: params.documentId,
        manifestItemId: params.manifestItemId,
        method: params.method || (params.resolutionType?.toUpperCase() as 'OCR' | 'MANUAL' | 'AUTO') || 'MANUAL',
        confidence: params.confidence ?? 1.0,
    };
    const event = createEvent<DocumentResolvedEvent>('document.resolved', normalizedParams);
    await eventBus.emit(event);
}


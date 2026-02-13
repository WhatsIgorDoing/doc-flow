/**
 * Event Types - Doc Flow Event Bus
 *
 * Define todos os eventos que fluem entre DCS e DV.
 * Separação clara de responsabilidades via eventos.
 */

// ============================================================================
// DCS → DV EVENTS (Document Validator consumes)
// ============================================================================

/**
 * Emitido quando um novo item é adicionado ao manifesto.
 * DV pode usar para invalidar cache ou re-validar documentos.
 */
export interface ManifestCreatedEvent {
    type: 'manifest.created';
    payload: {
        contractId: string;
        manifestItemId: string;
        documentCode: string;
        revision?: string;
    };
    timestamp: string;
}

/**
 * Emitido quando um item do manifesto é atualizado.
 * DV pode precisar re-validar documentos associados.
 */
export interface ManifestUpdatedEvent {
    type: 'manifest.updated';
    payload: {
        contractId: string;
        manifestItemId: string;
        changes: {
            field: string;
            oldValue: unknown;
            newValue: unknown;
        }[];
    };
    timestamp: string;
}

/**
 * Emitido quando um item do manifesto é deletado.
 * DV deve atualizar documentos que referenciavam este item.
 */
export interface ManifestDeletedEvent {
    type: 'manifest.deleted';
    payload: {
        contractId: string;
        manifestItemId: string;
        documentCode: string;
    };
    timestamp: string;
}

/**
 * Emitido quando um contrato é criado.
 */
export interface ContractCreatedEvent {
    type: 'contract.created';
    payload: {
        contractId: string;
        companyId: string;
        code: string;
        name: string;
    };
    timestamp: string;
}

// ============================================================================
// DV → DCS EVENTS (Document Control consumes)
// ============================================================================

/**
 * Emitido quando um job de validação é iniciado.
 */
export interface ValidationStartedEvent {
    type: 'validation.started';
    payload: {
        contractId: string;
        jobId: string;
        totalFiles: number;
    };
    timestamp: string;
}

/**
 * Emitido quando há progresso na validação.
 */
export interface ValidationProgressEvent {
    type: 'validation.progress';
    payload: {
        contractId: string;
        jobId: string;
        processedFiles: number;
        totalFiles: number;
        currentFile: string;
    };
    timestamp: string;
}

/**
 * Emitido quando um job de validação é completado.
 * DCS pode usar para atualizar analytics/dashboard.
 */
export interface ValidationCompletedEvent {
    type: 'validation.completed';
    payload: {
        contractId: string;
        jobId: string;
        stats: {
            validated: number;
            needsSuffix: number;
            unrecognized: number;
            errors: number;
        };
        duration: number; // milliseconds
    };
    timestamp: string;
}

/**
 * Emitido quando uma GRDT é criada.
 */
export interface GrdtCreatedEvent {
    type: 'grdt.created';
    payload: {
        contractId: string;
        batchId: string;
        grdtNumber: string;
        name: string;
        documentCount: number;
    };
    timestamp: string;
}

/**
 * Emitido quando documentos são atribuídos a uma GRDT.
 * DCS deve atualizar a coluna grdt_number em manifest_items.
 */
export interface GrdtAssignedEvent {
    type: 'grdt.assigned';
    payload: {
        batchId: string;
        grdtNumber: string;
        assignments: {
            documentId: string;
            manifestItemId: string;
        }[];
    };
    timestamp: string;
}

/**
 * Emitido quando um documento é resolvido via OCR/RIR.
 */
export interface DocumentResolvedEvent {
    type: 'document.resolved';
    payload: {
        documentId: string;
        manifestItemId: string;
        method: 'OCR' | 'MANUAL' | 'AUTO';
        confidence: number;
    };
    timestamp: string;
}

// ============================================================================
// UNION TYPE
// ============================================================================

export type DcsEvent =
    | ManifestCreatedEvent
    | ManifestUpdatedEvent
    | ManifestDeletedEvent
    | ContractCreatedEvent;

export type DvEvent =
    | ValidationStartedEvent
    | ValidationProgressEvent
    | ValidationCompletedEvent
    | GrdtCreatedEvent
    | GrdtAssignedEvent
    | DocumentResolvedEvent;

export type DocFlowEvent = DcsEvent | DvEvent;

// ============================================================================
// HELPER TYPES
// ============================================================================

export type EventType = DocFlowEvent['type'];

export type EventPayload<T extends EventType> = Extract<
    DocFlowEvent,
    { type: T }
>['payload'];

/**
 * Helper para criar eventos com timestamp automático
 */
export function createEvent<T extends DocFlowEvent>(
    type: T['type'],
    payload: T['payload']
): T {
    return {
        type,
        payload,
        timestamp: new Date().toISOString(),
    } as T;
}

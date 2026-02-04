/**
 * Event Handlers - DCS Consumer
 *
 * Handlers que o DCS executa quando recebe eventos do DV.
 * Registrar estes handlers na inicialização da aplicação.
 */

import { eventBus } from '@/lib/events';
import { createClient } from '@/lib/supabase/server';

/**
 * Handler: Quando uma GRDT é atribuída, atualizar manifest_items
 */
async function handleGrdtAssigned(
    payload: {
        batchId: string;
        grdtNumber: string;
        assignments: { documentId: string; manifestItemId: string }[];
    },
    timestamp: string
): Promise<void> {
    const supabase = await createClient();

    // Atualizar cada manifest_item com o número da GRDT
    for (const assignment of payload.assignments) {
        await supabase
            .from('manifest_items')
            .update({
                grdt_number: payload.grdtNumber,
                grdt_assigned_at: timestamp,
            })
            .eq('id', assignment.manifestItemId);
    }

    console.log(
        `[DCS] Updated ${payload.assignments.length} manifest items with GRDT ${payload.grdtNumber}`
    );
}

/**
 * Handler: Quando uma validação é concluída, pode atualizar analytics cache
 */
async function handleValidationCompleted(
    payload: {
        contractId: string;
        jobId: string;
        stats: {
            validated: number;
            needsSuffix: number;
            unrecognized: number;
            errors: number;
        };
        duration: number;
    },
    timestamp: string
): Promise<void> {
    // Aqui poderia atualizar cache de analytics, enviar notificação, etc.
    console.log(
        `[DCS] Validation completed for contract ${payload.contractId}:`,
        payload.stats
    );
}

/**
 * Registra todos os handlers do DCS
 * Chamar esta função na inicialização da aplicação
 */
export function registerDcsEventHandlers(): void {
    eventBus.on('grdt.assigned', handleGrdtAssigned);
    eventBus.on('validation.completed', handleValidationCompleted);

    console.log('[DCS] Event handlers registered');
}

/**
 * Remove todos os handlers (útil para testes)
 */
export function unregisterDcsEventHandlers(): void {
    eventBus.clear();
    console.log('[DCS] Event handlers cleared');
}

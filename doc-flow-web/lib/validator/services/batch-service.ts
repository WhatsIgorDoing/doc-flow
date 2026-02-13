/**
 * Batch Service - Document Validator
 *
 * Serviço de gerenciamento de GRDTs (batches).
 * Responsável por criar, organizar e atribuir documentos a lotes.
 */

import { createClient } from '@/lib/supabase/server';
import type {
    ValidationBatch,
    CreateBatchDTO,
    AssignToBatchDTO,
} from '../types/validator-types';
import {
    emitGrdtCreated,
    emitGrdtAssigned,
} from '../events/validator-events';

// ============================================================================
// BATCH SERVICE
// ============================================================================

export interface BatchServiceOptions {
    contractId: string;
}

export class BatchService {
    private contractId: string;

    constructor(options: BatchServiceOptions) {
        this.contractId = options.contractId;
    }

    /**
     * Cria uma nova GRDT (batch)
     */
    async createBatch(data: CreateBatchDTO): Promise<ValidationBatch> {
        const supabase = await createClient();

        // Gerar número da GRDT se não fornecido
        let grdtNumber = data.grdt_number;
        if (!grdtNumber) {
            grdtNumber = await this.generateGrdtNumber();
        }

        const { data: batch, error } = await supabase
            .from('validation_batches')
            .insert({
                contract_id: this.contractId,
                name: data.name,
                description: data.description,
                grdt_number: grdtNumber,
                total_items: 0,
                valid_count: 0,
                invalid_count: 0,
                pending_count: 0,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create batch: ${error.message}`);
        }

        // Emitir evento
        await emitGrdtCreated({
            contractId: this.contractId,
            batchId: batch.id,
            grdtNumber: grdtNumber,
            name: data.name,
            documentCount: 0,
        });

        return batch as ValidationBatch;
    }

    /**
     * Busca todas as GRDTs de um contrato
     */
    async getBatches(): Promise<ValidationBatch[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validation_batches')
            .select('*')
            .eq('contract_id', this.contractId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch batches: ${error.message}`);
        }

        return data as ValidationBatch[];
    }

    /**
     * Busca uma GRDT específica
     */
    async getBatch(batchId: string): Promise<ValidationBatch | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validation_batches')
            .select('*')
            .eq('id', batchId)
            .single();

        if (error) {
            return null;
        }

        return data as ValidationBatch;
    }

    /**
     * Busca uma GRDT com seus documentos
     */
    async getBatchWithDocuments(batchId: string): Promise<{
        batch: ValidationBatch;
        documents: Array<{
            id: string;
            filename: string;
            status: string;
            manifest_item_id?: string;
        }>;
    } | null> {
        const supabase = await createClient();

        // Buscar batch
        const { data: batch, error: batchError } = await supabase
            .from('validation_batches')
            .select('*')
            .eq('id', batchId)
            .single();

        if (batchError || !batch) {
            return null;
        }

        // Buscar documentos do batch
        const { data: documents, error: docsError } = await supabase
            .from('validated_documents')
            .select('id, filename, status, manifest_item_id')
            .eq('batch_id', batchId)
            .order('filename');

        if (docsError) {
            throw new Error(`Failed to fetch batch documents: ${docsError.message}`);
        }

        return {
            batch: batch as ValidationBatch,
            documents: documents || [],
        };
    }

    /**
     * Atribui documentos a uma GRDT
     */
    async assignDocumentsToBatch(data: AssignToBatchDTO): Promise<void> {
        const supabase = await createClient();

        // Buscar batch para obter grdt_number
        const batch = await this.getBatch(data.batch_id);
        if (!batch) {
            throw new Error('Batch not found');
        }

        // Atualizar documentos
        const { error } = await supabase
            .from('validated_documents')
            .update({
                batch_id: data.batch_id,
                grd_number: batch.grdt_number,
            })
            .in('id', data.document_ids);

        if (error) {
            throw new Error(`Failed to assign documents: ${error.message}`);
        }

        // Buscar manifest_item_ids dos documentos
        const { data: docs } = await supabase
            .from('validated_documents')
            .select('id, manifest_item_id')
            .in('id', data.document_ids);

        // Atualizar contadores do batch
        await this.updateBatchStats(data.batch_id);

        // Emitir evento para atualizar manifest_items
        const assignments = (docs || [])
            .filter((d) => d.manifest_item_id)
            .map((d) => ({
                documentId: d.id,
                manifestItemId: d.manifest_item_id!,
            }));

        if (assignments.length > 0) {
            await emitGrdtAssigned({
                batchId: data.batch_id,
                grdtNumber: batch.grdt_number || '',
                assignments,
            });
        }
    }

    /**
     * Remove documentos de uma GRDT
     */
    async removeDocumentsFromBatch(documentIds: string[]): Promise<void> {
        const supabase = await createClient();

        // Buscar batch_ids afetados antes de remover
        const { data: docs } = await supabase
            .from('validated_documents')
            .select('batch_id')
            .in('id', documentIds);

        const affectedBatchIds = [...new Set((docs || []).map((d) => d.batch_id).filter(Boolean))];

        // Remover do batch
        const { error } = await supabase
            .from('validated_documents')
            .update({
                batch_id: null,
                grd_number: null,
            })
            .in('id', documentIds);

        if (error) {
            throw new Error(`Failed to remove documents: ${error.message}`);
        }

        // Atualizar contadores dos batches afetados
        for (const batchId of affectedBatchIds) {
            await this.updateBatchStats(batchId as string);
        }
    }

    /**
     * Gera número único de GRDT
     */
    async generateGrdtNumber(): Promise<string> {
        const supabase = await createClient();

        // Usar função do banco se disponível
        const { data, error } = await supabase.rpc('generate_grdt_number', {
            p_contract_id: this.contractId,
        });

        if (error) {
            // Fallback: gerar localmente
            return this.generateGrdtNumberLocal();
        }

        return data as string;
    }

    /**
     * Fallback para gerar GRDT localmente
     */
    private async generateGrdtNumberLocal(): Promise<string> {
        const supabase = await createClient();

        // Buscar código do contrato
        const { data: contract } = await supabase
            .from('contracts')
            .select('code')
            .eq('id', this.contractId)
            .single();

        const contractCode = contract?.code || 'UNKNOWN';
        const year = new Date().getFullYear();

        // Contar GRDTs existentes neste ano
        const { count } = await supabase
            .from('validation_batches')
            .select('*', { count: 'exact', head: true })
            .eq('contract_id', this.contractId)
            .like('grdt_number', `%${year}%`);

        const sequence = ((count || 0) + 1).toString().padStart(4, '0');

        return `eGRDT-${contractCode}-${year}-${sequence}`;
    }

    /**
     * Atualiza estatísticas do batch
     */
    private async updateBatchStats(batchId: string): Promise<void> {
        const supabase = await createClient();

        // Contar documentos por status
        const { data: stats } = await supabase
            .from('validated_documents')
            .select('status')
            .eq('batch_id', batchId);

        const documents = stats || [];
        const total = documents.length;
        const valid = documents.filter((d) => d.status === 'VALIDATED').length;
        const invalid = documents.filter((d) =>
            d.status === 'ERROR' || d.status === 'UNRECOGNIZED'
        ).length;
        const pending = documents.filter((d) =>
            d.status === 'PENDING' || d.status === 'NEEDS_SUFFIX'
        ).length;

        // Atualizar batch
        await supabase
            .from('validation_batches')
            .update({
                total_items: total,
                valid_count: valid,
                invalid_count: invalid,
                pending_count: pending,
            })
            .eq('id', batchId);
    }

    /**
     * Finaliza uma GRDT (marca como validado)
     */
    async finalizeBatch(batchId: string): Promise<ValidationBatch> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validation_batches')
            .update({
                validated_at: new Date().toISOString(),
            })
            .eq('id', batchId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to finalize batch: ${error.message}`);
        }

        return data as ValidationBatch;
    }

    /**
     * Deleta uma GRDT (e remove documentos dela)
     */
    async deleteBatch(batchId: string): Promise<void> {
        const supabase = await createClient();

        // Primeiro remove documentos do batch
        await supabase
            .from('validated_documents')
            .update({
                batch_id: null,
                grd_number: null,
            })
            .eq('batch_id', batchId);

        // Depois deleta o batch
        const { error } = await supabase
            .from('validation_batches')
            .delete()
            .eq('id', batchId);

        if (error) {
            throw new Error(`Failed to delete batch: ${error.message}`);
        }
    }

    /**
     * Busca documentos não atribuídos a nenhuma GRDT
     */
    async getUnassignedDocuments(): Promise<Array<{
        id: string;
        filename: string;
        status: string;
        manifest_item_id?: string;
        validation_date?: string;
    }>> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validated_documents')
            .select('id, filename, status, manifest_item_id, validation_date')
            .eq('contract_id', this.contractId)
            .is('batch_id', null)
            .in('status', ['VALIDATED', 'NEEDS_SUFFIX'])
            .order('filename');

        if (error) {
            throw new Error(`Failed to fetch unassigned documents: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Auto-agrupa documentos em batches por tamanho
     */
    async autoGroupDocuments(maxPerBatch: number = 50): Promise<{
        batchesCreated: number;
        documentsAssigned: number;
    }> {
        // Buscar documentos não atribuídos
        const unassigned = await this.getUnassignedDocuments();

        if (unassigned.length === 0) {
            return { batchesCreated: 0, documentsAssigned: 0 };
        }

        let batchesCreated = 0;
        let documentsAssigned = 0;

        // Dividir em chunks
        for (let i = 0; i < unassigned.length; i += maxPerBatch) {
            const chunk = unassigned.slice(i, i + maxPerBatch);
            const batchNumber = Math.floor(i / maxPerBatch) + 1;

            // Criar batch
            const batch = await this.createBatch({
                contract_id: this.contractId,
                name: `Lote ${batchNumber} - Auto`,
                description: `Lote gerado automaticamente com ${chunk.length} documentos`,
            });

            // Atribuir documentos
            await this.assignDocumentsToBatch({
                batch_id: batch.id,
                document_ids: chunk.map((d) => d.id),
            });

            batchesCreated++;
            documentsAssigned += chunk.length;
        }

        return { batchesCreated, documentsAssigned };
    }
}

/**
 * Factory function para criar BatchService
 */
export function createBatchService(contractId: string): BatchService {
    return new BatchService({ contractId });
}

/**
 * Validation Service - Document Validator
 *
 * Serviço principal de validação de documentos.
 * Responsável por comparar arquivos com o manifesto.
 */

import { createClient } from '@/lib/supabase/server';
import type {
    ValidatedDocument,
    ValidationStatus,
    ValidationResult,
    FileToValidate,
} from '../types/validator-types';
import type { ManifestItem } from '@/lib/dcs/types/dcs-types';
import {
    emitValidationStarted,
    emitValidationProgress,
    emitValidationCompleted,
} from '../events/validator-events';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Padrões de sufixo de revisão aceitos
 */
const REVISION_PATTERNS = [
    /_[A-Z]$/i, // _A, _B, _C
    /_Rev\d+$/i, // _Rev0, _Rev1
    /_R\d+$/i, // _R0, _R1
    /-\d{2}$/i, // -01, -02
];

/**
 * Extensões de arquivo aceitas
 */
const ACCEPTED_EXTENSIONS = [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.dwg',
    '.dxf',
    '.jpg',
    '.jpeg',
    '.png',
    '.tif',
    '.tiff',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normaliza código de documento removendo sufixos de revisão
 */
export function normalizeDocumentCode(code: string): string {
    let normalized = code.trim().toUpperCase();

    // Remove extensão do arquivo
    const lastDot = normalized.lastIndexOf('.');
    if (lastDot > 0) {
        const ext = normalized.substring(lastDot).toLowerCase();
        if (ACCEPTED_EXTENSIONS.includes(ext)) {
            normalized = normalized.substring(0, lastDot);
        }
    }

    // Remove sufixos de revisão
    for (const pattern of REVISION_PATTERNS) {
        normalized = normalized.replace(pattern, '');
    }

    return normalized;
}

/**
 * Extrai base name do arquivo (sem extensão)
 */
export function getFileBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot > 0) {
        return filename.substring(0, lastDot);
    }
    return filename;
}

/**
 * Verifica se arquivo tem sufixo de revisão
 */
export function hasRevisionSuffix(filename: string): boolean {
    const baseName = getFileBaseName(filename);
    return REVISION_PATTERNS.some((pattern) => pattern.test(baseName));
}

/**
 * Extrai extensão do arquivo
 */
export function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot > 0) {
        return filename.substring(lastDot).toLowerCase();
    }
    return '';
}

/**
 * Valida se extensão é aceita
 */
export function isValidExtension(filename: string): boolean {
    const ext = getFileExtension(filename);
    return ACCEPTED_EXTENSIONS.includes(ext);
}

// ============================================================================
// VALIDATION SERVICE
// ============================================================================

export interface ValidationServiceOptions {
    contractId: string;
}

export class ValidationService {
    private contractId: string;
    private manifestMap: Map<string, ManifestItem> = new Map();

    constructor(options: ValidationServiceOptions) {
        this.contractId = options.contractId;
    }

    /**
     * Carrega itens do manifesto do banco de dados
     */
    async loadManifest(): Promise<void> {
        const supabase = await createClient();

        const { data: items, error } = await supabase
            .from('manifest_items')
            .select('*')
            .eq('contract_id', this.contractId);

        if (error) {
            throw new Error(`Failed to load manifest: ${error.message}`);
        }

        this.manifestMap.clear();

        for (const item of items || []) {
            const normalizedCode = normalizeDocumentCode(item.document_code);
            this.manifestMap.set(normalizedCode, item as ManifestItem);
        }
    }

    /**
     * Valida uma lista de arquivos contra o manifesto
     */
    async validateFiles(files: FileToValidate[]): Promise<ValidationResult[]> {
        const supabase = await createClient();
        const startTime = Date.now();

        // Criar job de validação
        const { data: job, error: jobError } = await supabase
            .from('validation_jobs')
            .insert({
                contract_id: this.contractId,
                status: 'processing',
                total_files: files.length,
                processed_files: 0,
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (jobError) {
            throw new Error(`Failed to create validation job: ${jobError.message}`);
        }

        const jobId = job.id;

        // Emitir evento de início
        await emitValidationStarted({
            contractId: this.contractId,
            jobId,
            totalFiles: files.length,
        });

        // Carregar manifesto se necessário
        if (this.manifestMap.size === 0) {
            await this.loadManifest();
        }

        const results: ValidationResult[] = [];
        let validatedCount = 0;
        let needsSuffixCount = 0;
        let unrecognizedCount = 0;
        let errorCount = 0;

        // Processar cada arquivo
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                const result = await this.validateSingleFile(file);
                results.push(result);

                // Contar por status
                switch (result.status) {
                    case 'VALIDATED':
                        validatedCount++;
                        break;
                    case 'NEEDS_SUFFIX':
                        needsSuffixCount++;
                        break;
                    case 'UNRECOGNIZED':
                        unrecognizedCount++;
                        break;
                    case 'ERROR':
                        errorCount++;
                        break;
                }

                // Salvar documento validado no banco
                await this.saveValidatedDocument(file, result);

                // Atualizar progresso
                await supabase
                    .from('validation_jobs')
                    .update({
                        processed_files: i + 1,
                        validated_count: validatedCount,
                        needs_suffix_count: needsSuffixCount,
                        unrecognized_count: unrecognizedCount,
                        error_count: errorCount,
                    })
                    .eq('id', jobId);

                // Emitir evento de progresso
                await emitValidationProgress({
                    contractId: this.contractId,
                    jobId,
                    processedFiles: i + 1,
                    totalFiles: files.length,
                    currentFile: file.filename,
                });
            } catch (error) {
                errorCount++;
                results.push({
                    filename: file.filename,
                    status: 'ERROR',
                    confidence: 0,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        const duration = Date.now() - startTime;

        // Finalizar job
        await supabase
            .from('validation_jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                validated_count: validatedCount,
                needs_suffix_count: needsSuffixCount,
                unrecognized_count: unrecognizedCount,
                error_count: errorCount,
            })
            .eq('id', jobId);

        // Emitir evento de conclusão
        await emitValidationCompleted({
            contractId: this.contractId,
            jobId,
            stats: {
                validated: validatedCount,
                needsSuffix: needsSuffixCount,
                unrecognized: unrecognizedCount,
                errors: errorCount,
            },
            duration,
        });

        return results;
    }

    /**
     * Valida um único arquivo
     */
    private async validateSingleFile(file: FileToValidate): Promise<ValidationResult> {
        // Verificar extensão
        if (!isValidExtension(file.filename)) {
            return {
                filename: file.filename,
                status: 'ERROR',
                confidence: 0,
                error: `Unsupported file extension: ${getFileExtension(file.filename)}`,
            };
        }

        // Normalizar nome e buscar no manifesto
        const normalizedCode = normalizeDocumentCode(file.filename);
        const manifestItem = this.manifestMap.get(normalizedCode);

        if (!manifestItem) {
            // Não encontrado no manifesto
            return {
                filename: file.filename,
                status: 'UNRECOGNIZED',
                confidence: 0,
            };
        }

        // Encontrado no manifesto - verificar sufixo de revisão
        const hasSuffix = hasRevisionSuffix(file.filename);

        if (hasSuffix) {
            // Arquivo completo com revisão
            return {
                filename: file.filename,
                status: 'VALIDATED',
                matched_manifest_item_id: manifestItem.id,
                matched_document_code: manifestItem.document_code,
                confidence: 1.0,
            };
        } else {
            // Arquivo sem sufixo de revisão
            return {
                filename: file.filename,
                status: 'NEEDS_SUFFIX',
                matched_manifest_item_id: manifestItem.id,
                matched_document_code: manifestItem.document_code,
                confidence: 0.9,
            };
        }
    }

    /**
     * Salva documento validado no banco de dados
     */
    private async saveValidatedDocument(
        file: FileToValidate,
        result: ValidationResult
    ): Promise<void> {
        const supabase = await createClient();

        const { error } = await supabase.from('validated_documents').insert({
            contract_id: this.contractId,
            manifest_item_id: result.matched_manifest_item_id || null,
            filename: file.filename,
            file_size: file.size,
            status: result.status,
            validation_date: new Date().toISOString(),
            error_message: result.error || null,
        }).select().single();

        if (error) {
            console.error('[ValidationService] Failed to save validated document:', error);
            throw new Error(`Failed to save validated document: ${error.message}`);
        }
    }

    /**
     * Busca documentos validados de um contrato
     */
    async getValidatedDocuments(): Promise<ValidatedDocument[]> {
        try {
            const supabase = await createClient();

            const { data, error } = await supabase
                .from('validated_documents')
                .select('*')
                .eq('contract_id', this.contractId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ValidationService] Fetch error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw new Error(`Failed to fetch validated documents: ${error.message}`);
            }

            return data as ValidatedDocument[];
        } catch (err) {
            // Log deep error details for fetch failures
            console.error('[ValidationService] Critical failure in getValidatedDocuments:', err);
            if (err instanceof TypeError && err.message === 'fetch failed') {
                console.error('[ValidationService] Network info:', {
                    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?
                        process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/.*?:\/\//, '').substring(0, 10) + '...' :
                        'UNDEFINED'
                });
            }
            throw err;
        }
    }

    /**
     * Busca documentos não reconhecidos
     */
    async getUnrecognizedDocuments(): Promise<ValidatedDocument[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validated_documents')
            .select('*')
            .eq('contract_id', this.contractId)
            .eq('status', 'UNRECOGNIZED')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch unrecognized documents: ${error.message}`);
        }

        return data as ValidatedDocument[];
    }

    /**
     * Atualiza status de um documento
     */
    async updateDocumentStatus(
        documentId: string,
        status: ValidationStatus,
        manifestItemId?: string
    ): Promise<ValidatedDocument> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validated_documents')
            .update({
                status,
                manifest_item_id: manifestItemId || null,
                validation_date: new Date().toISOString(),
            })
            .eq('id', documentId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update document status: ${error.message}`);
        }

        return data as ValidatedDocument;
    }
}

/**
 * Factory function para criar ValidationService
 */
export function createValidationService(contractId: string): ValidationService {
    return new ValidationService({ contractId });
}

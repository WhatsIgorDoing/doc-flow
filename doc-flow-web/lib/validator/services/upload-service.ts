/**
 * Upload Service - Document Validator
 *
 * Serviço de upload e processamento de arquivos.
 * Não armazena arquivo físico, apenas processa metadados.
 */

import { createClient } from '@/lib/supabase/server';
import type {
    FileToValidate,
    ValidationJob,
    ValidationRequest,
} from '../types/validator-types';
import { createValidationService } from './validation-service';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadResult {
    success: boolean;
    jobId?: string;
    error?: string;
    filesReceived: number;
}

export interface FileMetadata {
    filename: string;
    size: number;
    type: string;
    lastModified?: number;
}

// ============================================================================
// UPLOAD SERVICE
// ============================================================================

export class UploadService {
    private contractId: string;

    constructor(contractId: string) {
        this.contractId = contractId;
    }

    /**
     * Processa uma lista de arquivos para validação
     * Não armazena arquivos, apenas extrai metadados e valida
     */
    async processFiles(files: FileToValidate[]): Promise<UploadResult> {
        try {
            // Criar serviço de validação
            const validationService = createValidationService(this.contractId);

            // Validar arquivos
            const results = await validationService.validateFiles(files);

            // Buscar job criado
            const job = await this.getLatestJob();

            return {
                success: true,
                jobId: job?.id,
                filesReceived: files.length,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                filesReceived: files.length,
            };
        }
    }

    /**
     * Processa request de validação (vindo da API)
     */
    async processValidationRequest(request: ValidationRequest): Promise<UploadResult> {
        return this.processFiles(request.files);
    }

    /**
     * Busca o job mais recente do contrato
     */
    async getLatestJob(): Promise<ValidationJob | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validation_jobs')
            .select('*')
            .eq('contract_id', this.contractId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            return null;
        }

        return data as ValidationJob;
    }

    /**
     * Busca status de um job específico
     */
    async getJobStatus(jobId: string): Promise<ValidationJob | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validation_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (error) {
            return null;
        }

        return data as ValidationJob;
    }

    /**
     * Busca todos os jobs do contrato
     */
    async getJobs(): Promise<ValidationJob[]> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('validation_jobs')
            .select('*')
            .eq('contract_id', this.contractId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch jobs: ${error.message}`);
        }

        return data as ValidationJob[];
    }

    /**
     * Cancela um job em andamento
     */
    async cancelJob(jobId: string): Promise<boolean> {
        const supabase = await createClient();

        const { error } = await supabase
            .from('validation_jobs')
            .update({
                status: 'cancelled',
                completed_at: new Date().toISOString(),
            })
            .eq('id', jobId)
            .eq('status', 'processing');

        return !error;
    }
}

/**
 * Factory function para criar UploadService
 */
export function createUploadService(contractId: string): UploadService {
    return new UploadService(contractId);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converte File do browser para FileToValidate
 */
export function fileToValidate(file: File): FileToValidate {
    return {
        filename: file.name,
        size: file.size,
        type: file.type,
    };
}

/**
 * Converte lista de Files para FileToValidate[]
 */
export function filesToValidate(files: File[]): FileToValidate[] {
    return files.map(fileToValidate);
}

/**
 * Valida tamanho máximo de arquivo (em bytes)
 */
export function validateFileSize(file: FileToValidate, maxSizeMB: number = 50): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
}

/**
 * Valida tamanho total do lote (em bytes)
 */
export function validateBatchSize(
    files: FileToValidate[],
    maxTotalMB: number = 500
): boolean {
    const maxBytes = maxTotalMB * 1024 * 1024;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return totalSize <= maxBytes;
}

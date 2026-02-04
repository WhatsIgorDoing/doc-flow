/**
 * Document Validator (DV) - Types
 *
 * Entidades e tipos do sistema de validação de documentos.
 * Owner: DV (Document Validator)
 */

// ============================================================================
// ENTITIES
// ============================================================================

export interface ValidatedDocument {
    id: string;
    contract_id: string;
    manifest_item_id?: string;
    batch_id?: string;
    // File metadata (não armazenamos arquivo, apenas metadados)
    filename: string;
    file_size?: number;
    file_hash?: string;
    // Validation
    status: ValidationStatus;
    validation_date?: string;
    validated_by?: string;
    // Grouping
    lot_number?: string;
    grd_number?: string;
    // Errors
    error_message?: string;
    error_details?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export type ValidationStatus =
    | 'PENDING'
    | 'VALIDATED'
    | 'NEEDS_SUFFIX'
    | 'UNRECOGNIZED'
    | 'ERROR';

export interface ValidationBatch {
    id: string;
    contract_id: string;
    name: string;
    description?: string;
    grdt_number?: string;
    validated_at?: string;
    total_items: number;
    valid_count: number;
    invalid_count: number;
    pending_count: number;
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface ValidationJob {
    id: string;
    contract_id: string;
    status: JobStatus;
    total_files: number;
    processed_files: number;
    validated_count: number;
    unrecognized_count: number;
    error_count: number;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    created_at: string;
    created_by?: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExtractionResult {
    id: string;
    validated_document_id: string;
    extracted_text?: string;
    extracted_code?: string;
    confidence: number;
    method: ExtractionMethod;
    patterns_matched: string[];
    created_at: string;
}

export type ExtractionMethod = 'PDF_PARSE' | 'DOCX_PARSE' | 'OCR' | 'MANUAL';

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface FileToValidate {
    filename: string;
    size: number;
    type: string;
    content?: ArrayBuffer; // Para processamento em memória
}

export interface ValidationRequest {
    contract_id: string;
    files: FileToValidate[];
}

export interface ValidationResult {
    filename: string;
    status: ValidationStatus;
    matched_manifest_item_id?: string;
    matched_document_code?: string;
    confidence: number;
    error?: string;
}

export interface CreateBatchDTO {
    contract_id: string;
    name: string;
    description?: string;
    grdt_number?: string;
}

export interface AssignToBatchDTO {
    batch_id: string;
    document_ids: string[];
}

export interface ExtractionRequest {
    document_id: string;
    file_content: ArrayBuffer;
    file_type: string;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IUploadService {
    processFiles(request: ValidationRequest): Promise<ValidationJob>;
    getJobStatus(jobId: string): Promise<ValidationJob | null>;
}

export interface IValidationService {
    validateDocuments(
        contractId: string,
        documents: ValidatedDocument[]
    ): Promise<ValidationResult[]>;
    getValidatedDocuments(contractId: string): Promise<ValidatedDocument[]>;
    getUnrecognizedDocuments(contractId: string): Promise<ValidatedDocument[]>;
    updateDocumentStatus(
        documentId: string,
        status: ValidationStatus,
        manifestItemId?: string
    ): Promise<ValidatedDocument>;
}

export interface IBatchService {
    createBatch(data: CreateBatchDTO): Promise<ValidationBatch>;
    getBatches(contractId: string): Promise<ValidationBatch[]>;
    getBatch(batchId: string): Promise<ValidationBatch | null>;
    assignDocumentsToBatch(data: AssignToBatchDTO): Promise<void>;
    removeDocumentsFromBatch(documentIds: string[]): Promise<void>;
    generateGrdtNumber(contractId: string): Promise<string>;
}

export interface IOcrService {
    extractText(request: ExtractionRequest): Promise<ExtractionResult>;
    findDocumentCode(text: string): Promise<string | null>;
}

export interface IResolutionService {
    resolveUnrecognized(documentId: string): Promise<ValidationResult>;
    bulkResolve(documentIds: string[]): Promise<ValidationResult[]>;
    suggestMatches(
        documentId: string
    ): Promise<{ manifestItemId: string; confidence: number }[]>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface ValidationConfig {
    patterns: RegexPattern[];
    suffixPatterns: string[];
    confidenceThreshold: number;
}

export interface RegexPattern {
    name: string;
    pattern: string;
    priority: number;
}

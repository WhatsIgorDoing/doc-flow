/**
 * Resolution Service - Document Validator
 *
 * Serviço para resolução de documentos não reconhecidos.
 * Permite matching manual ou assistido via OCR/sugestões.
 */

import { createClient } from '@/lib/supabase/server';
import { createExtractionService } from './extraction-service';
import { createValidationService } from './validation-service';
import type { ValidatedDocument, ValidationStatus } from '../types/validator-types';
import { emitDocumentResolved } from '../events/validator-events';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolutionServiceOptions {
    contractId: string;
}

export interface ResolutionCandidate {
    manifestItemId: string;
    documentCode: string;
    documentTitle?: string;
    similarity: number;
    source: 'extraction' | 'manual' | 'suggestion';
}

export interface ResolutionResult {
    documentId: string;
    resolvedTo?: {
        manifestItemId: string;
        documentCode: string;
    };
    status: 'resolved' | 'rejected' | 'pending';
    resolvedBy?: 'auto' | 'manual' | 'ocr';
    confidence?: number;
}

export interface BulkResolutionOptions {
    /** Resolver automaticamente se confiança >= limiar */
    autoResolveThreshold?: number;
    /** Usar OCR para tentar extrair código */
    useOcr?: boolean;
}

// ============================================================================
// RESOLUTION SERVICE
// ============================================================================

export class ResolutionService {
    private contractId: string;

    constructor(options: ResolutionServiceOptions) {
        this.contractId = options.contractId;
    }

    /**
     * Busca documentos não reconhecidos para resolução
     */
    async getUnresolvedDocuments(): Promise<ValidatedDocument[]> {
        const supabase = await createClient();

        console.log(`[ResolutionService] Fetching unresolved docs for contract: ${this.contractId}`);

        const { data, error } = await supabase
            .from('validated_documents')
            .select('*')
            .eq('contract_id', this.contractId)
            .in('status', ['UNRECOGNIZED', 'ERROR']) // Include ERROR status
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ResolutionService] Fetch error:', error);
            throw new Error(`Failed to fetch unresolved documents: ${error.message}`);
        }

        console.log(`[ResolutionService] Found ${data?.length || 0} documents`);
        return (data || []) as ValidatedDocument[];
    }

    /**
     * Busca candidatos para resolução de um documento
     */
    async getCandidates(
        documentId: string,
        options: { limit?: number; useExtraction?: boolean; query?: string } = {}
    ): Promise<ResolutionCandidate[]> {
        const { limit = 10, useExtraction = true, query = '' } = options;
        const candidates: ResolutionCandidate[] = [];

        const supabase = await createClient();

        // Se houver query, buscar diretamente no manifesto
        if (query.trim().length > 0) {
            const { data: searchResults } = await supabase
                .from('manifest_items')
                .select('id, document_code, title')
                .eq('contract_id', this.contractId)
                .or(`document_code.ilike.%${query}%,title.ilike.%${query}%`)
                .limit(limit);

            for (const item of searchResults || []) {
                candidates.push({
                    manifestItemId: item.id,
                    documentCode: item.document_code,
                    documentTitle: item.title,
                    similarity: 1, // Search match considered high relevance
                    source: 'manual',
                });
            }
            return candidates;
        }

        // Buscar documento para sugestões smart (comportamento original)
        const { data: doc } = await supabase
            .from('validated_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (!doc) {
            throw new Error('Document not found');
        }

        // Tentar usar extração existente
        if (useExtraction) {
            const extractionService = createExtractionService(this.contractId);
            const extraction = await extractionService.getExtractionResults(documentId);

            if (extraction?.extracted_code) {
                const suggestions = await extractionService.suggestMatches(
                    extraction.extracted_code,
                    limit
                );

                for (const s of suggestions) {
                    candidates.push({
                        manifestItemId: s.manifestItemId,
                        documentCode: s.documentCode,
                        similarity: s.similarity,
                        source: 'extraction',
                    });
                }
            }
        }

        // Se não há candidatos da extração, buscar por similaridade no nome do arquivo
        if (candidates.length === 0) {
            const extractionService = createExtractionService(this.contractId);
            const codeFromFilename = extractionService.extractDocumentCode('', doc.filename);

            if (codeFromFilename) {
                const suggestions = await extractionService.suggestMatches(
                    codeFromFilename,
                    limit
                );

                for (const s of suggestions) {
                    candidates.push({
                        manifestItemId: s.manifestItemId,
                        documentCode: s.documentCode,
                        similarity: s.similarity,
                        source: 'suggestion',
                    });
                }
            }
        }

        // Adicionar itens do manifesto não associados (para seleção manual)
        if (candidates.length < limit) {
            const remaining = limit - candidates.length;
            const existingIds = new Set(candidates.map((c) => c.manifestItemId));

            const { data: manifestItems } = await supabase
                .from('manifest_items')
                .select('id, document_code, title')
                .eq('contract_id', this.contractId)
                .limit(remaining);

            for (const item of manifestItems || []) {
                if (!existingIds.has(item.id)) {
                    candidates.push({
                        manifestItemId: item.id,
                        documentCode: item.document_code,
                        documentTitle: item.title,
                        similarity: 0,
                        source: 'manual',
                    });
                }
            }
        }

        return candidates;
    }

    /**
     * Resolve um documento manualmente
     */
    async resolveManually(
        documentId: string,
        manifestItemId: string
    ): Promise<ResolutionResult> {
        const supabase = await createClient();

        // Buscar documento
        const { data: doc } = await supabase
            .from('validated_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (!doc) {
            throw new Error('Document not found');
        }

        // Buscar manifest item
        const { data: manifestItem } = await supabase
            .from('manifest_items')
            .select('document_code')
            .eq('id', manifestItemId)
            .single();

        if (!manifestItem) {
            throw new Error('Manifest item not found');
        }

        // Atualizar documento
        const { error } = await supabase
            .from('validated_documents')
            .update({
                manifest_item_id: manifestItemId,
                status: 'VALIDATED' as ValidationStatus,
                matched_document_code: manifestItem.document_code,
                confidence: 1.0, // Manual = 100% confiança
            })
            .eq('id', documentId);

        if (error) {
            throw new Error(`Failed to resolve document: ${error.message}`);
        }

        // Emitir evento
        await emitDocumentResolved({
            documentId,
            documentFilename: doc.filename,
            manifestItemId,
            resolutionType: 'manual',
        });

        return {
            documentId,
            resolvedTo: {
                manifestItemId,
                documentCode: manifestItem.document_code,
            },
            status: 'resolved',
            resolvedBy: 'manual',
            confidence: 1.0,
        };
    }

    /**
     * Rejeita um documento (marca como não pertencente ao manifesto)
     */
    async rejectDocument(documentId: string, reason?: string): Promise<ResolutionResult> {
        const supabase = await createClient();

        const { error } = await supabase
            .from('validated_documents')
            .update({
                status: 'ERROR' as ValidationStatus,
                error: reason || 'Documento rejeitado manualmente',
            })
            .eq('id', documentId);

        if (error) {
            throw new Error(`Failed to reject document: ${error.message}`);
        }

        return {
            documentId,
            status: 'rejected',
            resolvedBy: 'manual',
        };
    }

    /**
     * Tenta resolver automaticamente usando OCR
     */
    async resolveWithOcr(
        documentId: string,
        fileContent: string | Buffer
    ): Promise<ResolutionResult> {
        const supabase = await createClient();

        // Buscar documento
        const { data: doc } = await supabase
            .from('validated_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (!doc) {
            throw new Error('Document not found');
        }

        // Executar extração
        const extractionService = createExtractionService(this.contractId);
        const extraction = await extractionService.extractFromDocument(
            documentId,
            fileContent,
            doc.filename,
            { useOcr: true }
        );

        // Se não extraiu código, retornar pendente
        if (!extraction.documentCode) {
            return {
                documentId,
                status: 'pending',
                resolvedBy: 'ocr',
                confidence: extraction.confidence,
            };
        }

        // Buscar sugestões
        const suggestions = await extractionService.suggestMatches(
            extraction.documentCode,
            1
        );

        // Se encontrou match com alta confiança
        if (suggestions.length > 0 && suggestions[0].similarity >= 0.9) {
            return this.resolveManually(documentId, suggestions[0].manifestItemId);
        }

        return {
            documentId,
            status: 'pending',
            resolvedBy: 'ocr',
            confidence: extraction.confidence,
        };
    }

    /**
     * Resolução em lote
     */
    async bulkResolve(
        documentIds: string[],
        options: BulkResolutionOptions = {}
    ): Promise<{
        resolved: number;
        pending: number;
        failed: number;
        results: ResolutionResult[];
    }> {
        const { autoResolveThreshold = 0.9 } = options;
        const results: ResolutionResult[] = [];

        let resolved = 0;
        let pending = 0;
        let failed = 0;

        for (const documentId of documentIds) {
            try {
                // Buscar candidatos
                const candidates = await this.getCandidates(documentId, { limit: 1 });

                if (candidates.length > 0 && candidates[0].similarity >= autoResolveThreshold) {
                    // Auto-resolver
                    const result = await this.resolveManually(documentId, candidates[0].manifestItemId);
                    results.push(result);
                    resolved++;
                } else {
                    // Pendente
                    results.push({
                        documentId,
                        status: 'pending',
                        confidence: candidates.length > 0 ? candidates[0].similarity : 0,
                    });
                    pending++;
                }
            } catch (error) {
                results.push({
                    documentId,
                    status: 'rejected',
                });
                failed++;
                console.error(`[ResolutionService] Failed to resolve ${documentId}:`, error);
            }
        }

        return { resolved, pending, failed, results };
    }

    /**
     * Busca estatísticas de resolução
     */
    async getResolutionStats(): Promise<{
        total: number;
        unresolved: number;
        resolved: number;
        rejected: number;
        byConfidence: {
            high: number; // >= 0.9
            medium: number; // 0.7 - 0.9
            low: number; // < 0.7
        };
    }> {
        const supabase = await createClient();

        const { data: docs, error } = await supabase
            .from('validated_documents')
            .select('status')
            .eq('contract_id', this.contractId);

        if (error) {
            throw new Error(`Failed to fetch stats: ${error.message}`);
        }

        const documents = docs || [];
        const total = documents.length;
        const unresolved = documents.filter((d) => d.status === 'UNRECOGNIZED').length;
        const resolved = documents.filter((d) => d.status === 'VALIDATED').length;
        const rejected = documents.filter((d) => d.status === 'ERROR').length;

        // NOTE: Confidence column is currently missing from validated_documents table
        // We are using a heuristic based on status or defaulting to 0 to avoid runtime errors
        // TODO: Add confidence column to validated_documents table or join with extraction_results
        const byConfidence = {
            high: resolved, // Validated imply high confidence
            medium: 0, // Cannot determine medium without confidence score
            low: unresolved + rejected, // Unrecognized/Error imply low confidence
        };

        return { total, unresolved, resolved, rejected, byConfidence };
    }
}

/**
 * Factory function para criar ResolutionService
 */
export function createResolutionService(contractId: string): ResolutionService {
    return new ResolutionService({ contractId });
}

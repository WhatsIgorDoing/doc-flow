/**
 * Extraction Service - Document Validator
 *
 * Serviço de extração de texto e metadados de documentos.
 * Utiliza OCR para PDFs e imagens, e parsing para outros formatos.
 * 
 * NOTA: Este serviço é uma abstração. A implementação real de OCR
 * pode ser feita via:
 * - Tesseract.js (client-side)
 * - Cloud Vision API (Google)
 * - Azure Computer Vision
 * - AWS Textract
 */

import { createClient } from '@/lib/supabase/server';
import type { ExtractionResult } from '../types/validator-types';

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractionOptions {
    /** Usar OCR para extração */
    useOcr?: boolean;
    /** Idioma para OCR */
    language?: 'por' | 'eng' | 'spa';
    /** Extrair apenas código do documento */
    extractCodeOnly?: boolean;
    /** Regiões específicas para extração */
    regions?: ExtractionRegion[];
}

export interface ExtractionRegion {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ExtractedData {
    /** Texto completo extraído */
    fullText?: string;
    /** Código do documento identificado */
    documentCode?: string;
    /** Revisão identificada */
    revision?: string;
    /** Título do documento */
    title?: string;
    /** Data do documento */
    documentDate?: string;
    /** Metadados adicionais */
    metadata?: Record<string, string>;
    /** Confiança da extração (0-1) */
    confidence: number;
    /** Erros durante extração */
    errors?: string[];
}

export interface ExtractionServiceOptions {
    contractId: string;
}

// ============================================================================
// PATTERNS FOR DOCUMENT CODE EXTRACTION
// ============================================================================

/**
 * Padrões comuns de códigos de documentos técnicos
 * Ajuste conforme os padrões utilizados no projeto
 */
const DOCUMENT_CODE_PATTERNS = [
    // Padrão: XXX-YYY-ZZZ-NNN (ex: PRJ-ELE-DES-001)
    /\b([A-Z]{2,4}-[A-Z]{2,4}-[A-Z]{2,4}-\d{3,4})\b/gi,
    // Padrão: XXXX.YY.ZZ.NNN (ex: PROJ.01.EL.001)
    /\b([A-Z]{2,4}\.\d{2}\.[A-Z]{2}\.\d{3,4})\b/gi,
    // Padrão: XX-NNNN-YY-ZZZ (ex: PE-0001-EL-001)
    /\b([A-Z]{2}-\d{4}-[A-Z]{2}-\d{3})\b/gi,
    // Padrão genérico: letras + números separados por hífen
    /\b([A-Z]{2,5}-\d{3,6}(-[A-Z0-9]{1,4})*)\b/gi,
];

/**
 * Padrões para identificar revisão
 */
const REVISION_PATTERNS = [
    /\bRev[.:]\s*([A-Z0-9]+)\b/gi,
    /\bRevisão[.:]\s*([A-Z0-9]+)\b/gi,
    /\bR([0-9]+)\b/g,
    /\bRev\s*([0-9]+)\b/gi,
    /_R([A-Z0-9]+)\b/gi,
];

// ============================================================================
// EXTRACTION SERVICE
// ============================================================================

export class ExtractionService {
    private contractId: string;

    constructor(options: ExtractionServiceOptions) {
        this.contractId = options.contractId;
    }

    /**
     * Extrai informações de um documento
     * 
     * @param documentId ID do documento validado
     * @param fileContent Conteúdo do arquivo (base64 ou Buffer)
     * @param filename Nome do arquivo
     * @param options Opções de extração
     */
    async extractFromDocument(
        documentId: string,
        fileContent: string | Buffer,
        filename: string,
        options: ExtractionOptions = {}
    ): Promise<ExtractedData> {
        const startTime = Date.now();
        const errors: string[] = [];

        let extractedText = '';
        let confidence = 0;

        try {
            // Determinar tipo de arquivo
            const fileType = this.getFileType(filename);

            // Estratégia de extração baseada no tipo
            switch (fileType) {
                case 'pdf':
                    extractedText = await this.extractFromPdf(fileContent, options);
                    confidence = 0.85;
                    break;
                case 'image':
                    if (options.useOcr !== false) {
                        extractedText = await this.extractFromImage(fileContent, options);
                        confidence = 0.70;
                    }
                    break;
                case 'text':
                    extractedText = this.extractFromText(fileContent);
                    confidence = 0.95;
                    break;
                default:
                    errors.push(`Tipo de arquivo não suportado: ${fileType}`);
                    confidence = 0;
            }
        } catch (error) {
            errors.push(`Erro na extração: ${error instanceof Error ? error.message : 'Unknown'}`);
        }

        // Extrair código do documento
        const documentCode = this.extractDocumentCode(extractedText, filename);

        // Extrair revisão
        const revision = this.extractRevision(extractedText, filename);

        // Extrair título
        const title = this.extractTitle(extractedText);

        // Ajustar confiança baseado nos resultados
        if (documentCode) {
            confidence = Math.min(confidence + 0.1, 1.0);
        } else {
            confidence = Math.max(confidence - 0.2, 0);
        }

        // Salvar resultado no banco
        const extractedData: ExtractedData = {
            fullText: extractedText.substring(0, 5000), // Limitar tamanho
            documentCode,
            revision,
            title,
            confidence,
            errors: errors.length > 0 ? errors : undefined,
        };

        await this.saveExtractionResult(documentId, extractedData, Date.now() - startTime);

        return extractedData;
    }

    /**
     * Extrai código do documento do texto ou nome do arquivo
     */
    extractDocumentCode(text: string, filename: string): string | undefined {
        // Primeiro tentar extrair do nome do arquivo
        for (const pattern of DOCUMENT_CODE_PATTERNS) {
            const match = filename.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }

        // Depois tentar do texto extraído
        for (const pattern of DOCUMENT_CODE_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }

        return undefined;
    }

    /**
     * Extrai revisão do texto ou nome do arquivo
     */
    extractRevision(text: string, filename: string): string | undefined {
        // Primeiro tentar do nome do arquivo
        for (const pattern of REVISION_PATTERNS) {
            const match = filename.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }

        // Depois do texto
        for (const pattern of REVISION_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }

        return undefined;
    }

    /**
     * Extrai título do documento
     */
    extractTitle(text: string): string | undefined {
        // Procurar por padrões de título
        const titlePatterns = [
            /Título[.:]\s*(.+?)(?:\n|$)/i,
            /Title[.:]\s*(.+?)(?:\n|$)/i,
            /Assunto[.:]\s*(.+?)(?:\n|$)/i,
            /Subject[.:]\s*(.+?)(?:\n|$)/i,
        ];

        for (const pattern of titlePatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim().substring(0, 200);
            }
        }

        // Fallback: usar primeira linha não vazia
        const lines = text.split('\n').filter(l => l.trim().length > 10);
        if (lines.length > 0) {
            return lines[0].trim().substring(0, 200);
        }

        return undefined;
    }

    /**
     * Determina tipo de arquivo pela extensão
     */
    private getFileType(filename: string): 'pdf' | 'image' | 'text' | 'unknown' {
        const ext = filename.toLowerCase().split('.').pop();

        switch (ext) {
            case 'pdf':
                return 'pdf';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'tif':
            case 'tiff':
            case 'bmp':
                return 'image';
            case 'txt':
            case 'csv':
                return 'text';
            default:
                return 'unknown';
        }
    }

    /**
     * Extrai texto de PDF
     * 
     * NOTA: Implementação simplificada.
     * Em produção, use pdf-parse, pdfjs-dist, ou API externa.
     */
    private async extractFromPdf(
        content: string | Buffer,
        _options: ExtractionOptions
    ): Promise<string> {
        // Placeholder - em produção usar biblioteca de PDF
        // Exemplo com pdf-parse:
        // const pdfParse = require('pdf-parse');
        // const data = await pdfParse(content);
        // return data.text;

        // Por ora, retornar texto vazio para indicar que precisa de OCR
        console.log('[ExtractionService] PDF extraction placeholder');
        return '';
    }

    /**
     * Extrai texto de imagem via OCR
     * 
     * NOTA: Implementação simplificada.
     * Em produção, use Tesseract.js, Google Vision, ou similar.
     */
    private async extractFromImage(
        _content: string | Buffer,
        options: ExtractionOptions
    ): Promise<string> {
        // Placeholder - em produção usar OCR
        // Exemplo com Tesseract.js:
        // const Tesseract = require('tesseract.js');
        // const { data: { text } } = await Tesseract.recognize(content, options.language || 'por');
        // return text;

        console.log('[ExtractionService] OCR placeholder for language:', options.language || 'por');
        return '';
    }

    /**
     * Extrai texto de arquivo de texto
     */
    private extractFromText(content: string | Buffer): string {
        if (Buffer.isBuffer(content)) {
            return content.toString('utf-8');
        }
        return content;
    }

    /**
     * Salva resultado da extração no banco
     */
    private async saveExtractionResult(
        documentId: string,
        data: ExtractedData,
        processingTimeMs: number
    ): Promise<void> {
        const supabase = await createClient();

        await supabase.from('extraction_results').insert({
            validated_document_id: documentId,
            extracted_code: data.documentCode,
            extracted_revision: data.revision,
            extracted_title: data.title,
            full_text: data.fullText,
            confidence: data.confidence,
            processing_time_ms: processingTimeMs,
            errors: data.errors,
        });
    }

    /**
     * Busca resultados de extração anteriores
     */
    async getExtractionResults(documentId: string): Promise<ExtractionResult | null> {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('extraction_results')
            .select('*')
            .eq('validated_document_id', documentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return null;
        }

        return data as ExtractionResult;
    }

    /**
     * Sugere matches baseado em código extraído
     */
    async suggestMatches(
        extractedCode: string,
        limit: number = 5
    ): Promise<Array<{
        manifestItemId: string;
        documentCode: string;
        similarity: number;
    }>> {
        const supabase = await createClient();

        // Buscar itens do manifesto do contrato
        const { data: manifestItems, error } = await supabase
            .from('manifest_items')
            .select('id, document_code')
            .eq('contract_id', this.contractId);

        if (error || !manifestItems) {
            return [];
        }

        // Calcular similaridade
        const suggestions = manifestItems
            .map((item) => ({
                manifestItemId: item.id,
                documentCode: item.document_code,
                similarity: this.calculateSimilarity(extractedCode, item.document_code),
            }))
            .filter((s) => s.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return suggestions;
    }

    /**
     * Calcula similaridade entre dois códigos
     * Usa Levenshtein distance normalizado
     */
    private calculateSimilarity(code1: string, code2: string): number {
        const s1 = code1.toUpperCase();
        const s2 = code2.toUpperCase();

        if (s1 === s2) return 1.0;

        const len1 = s1.length;
        const len2 = s2.length;

        // Levenshtein distance
        const matrix: number[][] = [];

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }

        const distance = matrix[len1][len2];
        const maxLen = Math.max(len1, len2);

        return 1 - distance / maxLen;
    }
}

/**
 * Factory function para criar ExtractionService
 */
export function createExtractionService(contractId: string): ExtractionService {
    return new ExtractionService({ contractId });
}

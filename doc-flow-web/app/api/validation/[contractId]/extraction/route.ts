/**
 * API Route: Extraction
 *
 * POST /api/validation/[contractId]/extraction - Executa extração OCR
 * GET /api/validation/[contractId]/extraction/[documentId] - Busca resultados
 */

import { NextRequest, NextResponse } from 'next/server';
import { createExtractionService } from '@/lib/validator/services/extraction-service';

/**
 * POST: Executa extração OCR em um documento
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ contractId: string }> }
) {
    try {
        const { contractId } = await params;

        if (!contractId) {
            return NextResponse.json(
                { error: 'Contract ID is required' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { documentId, filename, fileContent, options } = body as {
            documentId: string;
            filename: string;
            fileContent: string; // base64
            options?: {
                useOcr?: boolean;
                language?: 'por' | 'eng' | 'spa';
                extractCodeOnly?: boolean;
            };
        };

        if (!documentId || !filename || !fileContent) {
            return NextResponse.json(
                { error: 'documentId, filename, and fileContent are required' },
                { status: 400 }
            );
        }

        // Decode base64
        const buffer = Buffer.from(fileContent, 'base64');

        const extractionService = createExtractionService(contractId);
        const result = await extractionService.extractFromDocument(
            documentId,
            buffer,
            filename,
            options
        );

        // Se extraiu código, buscar sugestões
        let suggestions = undefined;
        if (result.documentCode) {
            suggestions = await extractionService.suggestMatches(result.documentCode, 5);
        }

        return NextResponse.json({
            success: true,
            extraction: result,
            suggestions,
        });
    } catch (error) {
        console.error('[API] Extraction error:', error);

        return NextResponse.json(
            {
                error: 'Failed to extract document',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

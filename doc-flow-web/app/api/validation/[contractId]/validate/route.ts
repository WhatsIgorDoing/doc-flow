/**
 * API Route: Validate Documents
 *
 * POST /api/validation/[contractId]/validate
 *
 * Recebe lista de arquivos e executa validação contra manifesto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createValidationService } from '@/lib/validator/services/validation-service';
import { filesToValidate, validateBatchSize } from '@/lib/validator/services/upload-service';

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

        // Parse form data
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        // Convert to FileToValidate format
        const filesToProcess = filesToValidate(files);

        // Validate batch size
        if (!validateBatchSize(filesToProcess)) {
            return NextResponse.json(
                { error: 'Total batch size exceeds limit (500 MB)' },
                { status: 400 }
            );
        }

        // Create validation service and validate
        const validationService = createValidationService(contractId);
        const results = await validationService.validateFiles(filesToProcess);

        // Calculate summary
        const summary = {
            total: results.length,
            validated: results.filter((r) => r.status === 'VALIDATED').length,
            needsSuffix: results.filter((r) => r.status === 'NEEDS_SUFFIX').length,
            unrecognized: results.filter((r) => r.status === 'UNRECOGNIZED').length,
            errors: results.filter((r) => r.status === 'ERROR').length,
        };

        return NextResponse.json({
            success: true,
            summary,
            results,
        });
    } catch (error) {
        console.error('[API] Validation error:', error);

        return NextResponse.json(
            {
                error: 'Validation failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/validation/[contractId]/validate
 *
 * Retorna resultados de validação existentes
 */
export async function GET(
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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const validationService = createValidationService(contractId);

        let documents;
        if (status === 'UNRECOGNIZED') {
            documents = await validationService.getUnrecognizedDocuments();
        } else {
            documents = await validationService.getValidatedDocuments();
        }

        return NextResponse.json({
            success: true,
            count: documents.length,
            documents,
        });
    } catch (error) {
        console.error('[API] Get validation results error:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch validation results',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

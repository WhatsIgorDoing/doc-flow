/**
 * API Route: Documents
 *
 * GET /api/validation/[contractId]/documents - Lista documentos validados
 * PATCH /api/validation/[contractId]/documents - Atualiza status de documento
 */

import { NextRequest, NextResponse } from 'next/server';
import { createValidationService } from '@/lib/validator/services/validation-service';
import { createBatchService } from '@/lib/validator/services/batch-service';
import type { ValidationStatus } from '@/lib/validator/types/validator-types';

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
        const status = searchParams.get('status') as ValidationStatus | null;
        const unassigned = searchParams.get('unassigned') === 'true';

        // Se solicitando documentos não atribuídos, usar BatchService
        if (unassigned) {
            const batchService = createBatchService(contractId);
            const documents = await batchService.getUnassignedDocuments();

            return NextResponse.json({
                success: true,
                count: documents.length,
                documents,
            });
        }

        const validationService = createValidationService(contractId);

        let documents;
        if (status === 'UNRECOGNIZED') {
            documents = await validationService.getUnrecognizedDocuments();
        } else {
            documents = await validationService.getValidatedDocuments();
        }

        // Filter by status if provided and not UNRECOGNIZED
        if (status && status !== 'UNRECOGNIZED') {
            documents = documents.filter((doc) => doc.status === status);
        }

        return NextResponse.json({
            success: true,
            count: documents.length,
            documents,
        });
    } catch (error) {
        console.error('[API] Documents error:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch documents',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/validation/[contractId]/documents
 *
 * Atualiza status de um documento
 *
 * Body: { documentId, status, manifestItemId? }
 */
export async function PATCH(
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
        const { documentId, status, manifestItemId } = body as {
            documentId: string;
            status: ValidationStatus;
            manifestItemId?: string;
        };

        if (!documentId || !status) {
            return NextResponse.json(
                { error: 'documentId and status are required' },
                { status: 400 }
            );
        }

        // Validate status
        const validStatuses: ValidationStatus[] = [
            'PENDING',
            'VALIDATED',
            'NEEDS_SUFFIX',
            'UNRECOGNIZED',
            'ERROR',
        ];

        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
                { status: 400 }
            );
        }

        const validationService = createValidationService(contractId);
        const updatedDocument = await validationService.updateDocumentStatus(
            documentId,
            status,
            manifestItemId
        );

        return NextResponse.json({
            success: true,
            document: updatedDocument,
        });
    } catch (error) {
        console.error('[API] Update document error:', error);

        return NextResponse.json(
            {
                error: 'Failed to update document',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

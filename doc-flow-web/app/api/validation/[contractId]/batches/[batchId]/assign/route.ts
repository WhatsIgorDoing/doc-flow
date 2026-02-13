/**
 * API Route: Batch Documents Assignment
 *
 * POST /api/validation/[contractId]/batches/[batchId]/assign - Atribuir documentos
 * DELETE /api/validation/[contractId]/batches/[batchId]/assign - Remover documentos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBatchService } from '@/lib/validator/services/batch-service';

/**
 * POST: Atribuir documentos a uma GRDT
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ contractId: string; batchId: string }> }
) {
    try {
        const { contractId, batchId } = await params;

        if (!contractId || !batchId) {
            return NextResponse.json(
                { error: 'Contract ID and Batch ID are required' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { document_ids } = body as { document_ids: string[] };

        if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
            return NextResponse.json(
                { error: 'document_ids array is required and cannot be empty' },
                { status: 400 }
            );
        }

        const batchService = createBatchService(contractId);
        await batchService.assignDocumentsToBatch({
            batch_id: batchId,
            document_ids,
        });

        return NextResponse.json({
            success: true,
            message: `${document_ids.length} documents assigned to batch`,
        });
    } catch (error) {
        console.error('[API] Assign documents error:', error);

        return NextResponse.json(
            {
                error: 'Failed to assign documents',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE: Remover documentos de uma GRDT
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ contractId: string; batchId: string }> }
) {
    try {
        const { contractId, batchId } = await params;

        if (!contractId || !batchId) {
            return NextResponse.json(
                { error: 'Contract ID and Batch ID are required' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { document_ids } = body as { document_ids: string[] };

        if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
            return NextResponse.json(
                { error: 'document_ids array is required and cannot be empty' },
                { status: 400 }
            );
        }

        const batchService = createBatchService(contractId);
        await batchService.removeDocumentsFromBatch(document_ids);

        return NextResponse.json({
            success: true,
            message: `${document_ids.length} documents removed from batch`,
        });
    } catch (error) {
        console.error('[API] Remove documents error:', error);

        return NextResponse.json(
            {
                error: 'Failed to remove documents',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

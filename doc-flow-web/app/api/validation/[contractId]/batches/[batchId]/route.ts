/**
 * API Route: Single Batch (GRDT)
 *
 * GET /api/validation/[contractId]/batches/[batchId] - Detalhes da GRDT
 * PUT /api/validation/[contractId]/batches/[batchId] - Atualizar GRDT
 * DELETE /api/validation/[contractId]/batches/[batchId] - Deletar GRDT
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBatchService } from '@/lib/validator/services/batch-service';

export async function GET(
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

        const { searchParams } = new URL(request.url);
        const includeDocuments = searchParams.get('includeDocuments') === 'true';

        const batchService = createBatchService(contractId);

        if (includeDocuments) {
            const result = await batchService.getBatchWithDocuments(batchId);

            if (!result) {
                return NextResponse.json(
                    { error: 'Batch not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                ...result,
            });
        } else {
            const batch = await batchService.getBatch(batchId);

            if (!batch) {
                return NextResponse.json(
                    { error: 'Batch not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                batch,
            });
        }
    } catch (error) {
        console.error('[API] Get batch error:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch batch',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * PUT: Finalizar GRDT
 */
export async function PUT(
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
        const { action } = body as { action: 'finalize' };

        const batchService = createBatchService(contractId);

        if (action === 'finalize') {
            const batch = await batchService.finalizeBatch(batchId);

            return NextResponse.json({
                success: true,
                batch,
                message: 'Batch finalized successfully',
            });
        }

        return NextResponse.json(
            { error: 'Invalid action. Use "finalize"' },
            { status: 400 }
        );
    } catch (error) {
        console.error('[API] Update batch error:', error);

        return NextResponse.json(
            {
                error: 'Failed to update batch',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

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

        const batchService = createBatchService(contractId);
        await batchService.deleteBatch(batchId);

        return NextResponse.json({
            success: true,
            message: 'Batch deleted successfully',
        });
    } catch (error) {
        console.error('[API] Delete batch error:', error);

        return NextResponse.json(
            {
                error: 'Failed to delete batch',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

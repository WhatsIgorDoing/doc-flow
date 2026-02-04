import { createClient } from '@/lib/supabase/server';
import { createBatchService } from '@/lib/validator/services/batch-service';
import { NextResponse } from 'next/server';

/**
 * GET /api/contracts/[id]/batches/[batchId]
 * Get single batch details + its documents
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; batchId: string }> }
) {
    try {
        const { id: contractId, batchId } = await params;

        const batchService = createBatchService(contractId);
        const result = await batchService.getBatchWithDocuments(batchId);

        if (!result) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Batch fetch error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/contracts/[id]/batches/[batchId]
 * Delete a batch (unassigns documents)
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; batchId: string }> }
) {
    try {
        const { id: contractId, batchId } = await params;

        const batchService = createBatchService(contractId);
        await batchService.deleteBatch(batchId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Batch delete error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

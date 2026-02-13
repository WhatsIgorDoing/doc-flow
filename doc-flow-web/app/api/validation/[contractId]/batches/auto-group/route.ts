/**
 * API Route: Auto-group Documents
 *
 * POST /api/validation/[contractId]/batches/auto-group - Agrupa automaticamente
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBatchService } from '@/lib/validator/services/batch-service';

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

        const body = await request.json().catch(() => ({}));
        const { maxPerBatch = 50 } = body as { maxPerBatch?: number };

        const batchService = createBatchService(contractId);
        const result = await batchService.autoGroupDocuments(maxPerBatch);

        return NextResponse.json({
            success: true,
            ...result,
            message: `Created ${result.batchesCreated} batches with ${result.documentsAssigned} documents`,
        });
    } catch (error) {
        console.error('[API] Auto-group error:', error);

        return NextResponse.json(
            {
                error: 'Failed to auto-group documents',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

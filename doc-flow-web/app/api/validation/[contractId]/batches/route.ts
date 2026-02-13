/**
 * API Route: Batches (GRDTs)
 *
 * GET /api/validation/[contractId]/batches - Lista todas as GRDTs
 * POST /api/validation/[contractId]/batches - Cria nova GRDT
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBatchService } from '@/lib/validator/services/batch-service';

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

        const batchService = createBatchService(contractId);
        const batches = await batchService.getBatches();

        return NextResponse.json({
            success: true,
            count: batches.length,
            batches,
        });
    } catch (error) {
        console.error('[API] Get batches error:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch batches',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

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
        const { name, description, grdt_number } = body as {
            name: string;
            description?: string;
            grdt_number?: string;
        };

        if (!name) {
            return NextResponse.json(
                { error: 'Batch name is required' },
                { status: 400 }
            );
        }

        const batchService = createBatchService(contractId);
        const batch = await batchService.createBatch({
            contract_id: contractId,
            name,
            description,
            grdt_number,
        });

        return NextResponse.json({
            success: true,
            batch,
        }, { status: 201 });
    } catch (error) {
        console.error('[API] Create batch error:', error);

        return NextResponse.json(
            {
                error: 'Failed to create batch',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

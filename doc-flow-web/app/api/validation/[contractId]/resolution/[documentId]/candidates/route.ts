/**
 * API Route: Resolution Candidates
 *
 * GET /api/validation/[contractId]/resolution/[documentId]/candidates - Busca candidatos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createResolutionService } from '@/lib/validator/services/resolution-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ contractId: string; documentId: string }> }
) {
    try {
        const { contractId, documentId } = await params;

        if (!contractId || !documentId) {
            return NextResponse.json(
                { error: 'Contract ID and Document ID are required' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const query = searchParams.get('search') || undefined;

        const resolutionService = createResolutionService(contractId);
        const candidates = await resolutionService.getCandidates(documentId, { limit, query });

        return NextResponse.json({
            success: true,
            documentId,
            count: candidates.length,
            candidates,
        });
    } catch (error) {
        console.error('[API] Candidates error:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch candidates',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * API Route: Resolution
 *
 * GET /api/validation/[contractId]/resolution - Lista documentos não resolvidos e estatísticas
 * POST /api/validation/[contractId]/resolution - Resolve documento(s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createResolutionService } from '@/lib/validator/services/resolution-service';

/**
 * GET: Lista documentos não resolvidos e estatísticas
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
        const includeStats = searchParams.get('stats') === 'true';

        const resolutionService = createResolutionService(contractId);

        // Buscar documentos não resolvidos
        const documents = await resolutionService.getUnresolvedDocuments();

        // Opcional: incluir estatísticas
        let stats = undefined;
        if (includeStats) {
            stats = await resolutionService.getResolutionStats();
        }

        return NextResponse.json({
            success: true,
            count: documents.length,
            documents,
            stats,
        });
    } catch (error) {
        console.error('[API] Resolution error:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch resolution data',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * POST: Resolve documento(s)
 * 
 * Body: 
 *   - Single: { documentId, manifestItemId }
 *   - Bulk: { documentIds: [], action: 'auto' | 'reject' }
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
        const resolutionService = createResolutionService(contractId);

        // Resolução em lote
        if (body.documentIds && Array.isArray(body.documentIds)) {
            const { documentIds, action = 'auto', autoResolveThreshold = 0.9 } = body as {
                documentIds: string[];
                action?: 'auto' | 'reject';
                autoResolveThreshold?: number;
            };

            if (action === 'reject') {
                // Rejeitar todos
                const results = [];
                for (const id of documentIds) {
                    const result = await resolutionService.rejectDocument(id, 'Bulk rejection');
                    results.push(result);
                }

                return NextResponse.json({
                    success: true,
                    rejected: results.length,
                    results,
                });
            }

            // Auto-resolver
            const result = await resolutionService.bulkResolve(documentIds, {
                autoResolveThreshold,
            });

            return NextResponse.json({
                success: true,
                ...result,
            });
        }

        // Resolução individual
        const { documentId, manifestItemId, action, reason } = body as {
            documentId: string;
            manifestItemId?: string;
            action?: 'resolve' | 'reject';
            reason?: string;
        };

        if (!documentId) {
            return NextResponse.json(
                { error: 'documentId is required' },
                { status: 400 }
            );
        }

        // Rejeitar documento
        if (action === 'reject') {
            const result = await resolutionService.rejectDocument(documentId, reason);
            return NextResponse.json({
                success: true,
                result,
            });
        }

        // Resolver manualmente
        if (!manifestItemId) {
            return NextResponse.json(
                { error: 'manifestItemId is required for manual resolution' },
                { status: 400 }
            );
        }

        const result = await resolutionService.resolveManually(documentId, manifestItemId);

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error('[API] Resolution error:', error);

        return NextResponse.json(
            {
                error: 'Failed to resolve document',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

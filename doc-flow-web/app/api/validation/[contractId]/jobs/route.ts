/**
 * API Route: Validation Jobs
 *
 * GET /api/validation/[contractId]/jobs - Lista jobs
 * GET /api/validation/[contractId]/jobs?id=<jobId> - Status de job específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUploadService } from '@/lib/validator/services/upload-service';

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
        const jobId = searchParams.get('id');

        const uploadService = createUploadService(contractId);

        if (jobId) {
            // Buscar job específico
            const job = await uploadService.getJobStatus(jobId);

            if (!job) {
                return NextResponse.json(
                    { error: 'Job not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                job,
            });
        } else {
            // Listar todos os jobs
            const jobs = await uploadService.getJobs();

            return NextResponse.json({
                success: true,
                count: jobs.length,
                jobs,
            });
        }
    } catch (error) {
        console.error('[API] Jobs error:', error);

        return NextResponse.json(
            {
                error: 'Failed to fetch jobs',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/validation/[contractId]/jobs?id=<jobId>
 *
 * Cancela um job em andamento
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ contractId: string }> }
) {
    try {
        const { contractId } = await params;
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('id');

        if (!contractId || !jobId) {
            return NextResponse.json(
                { error: 'Contract ID and Job ID are required' },
                { status: 400 }
            );
        }

        const uploadService = createUploadService(contractId);
        const cancelled = await uploadService.cancelJob(jobId);

        if (!cancelled) {
            return NextResponse.json(
                { error: 'Failed to cancel job or job not in processing state' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Job cancelled successfully',
        });
    } catch (error) {
        console.error('[API] Cancel job error:', error);

        return NextResponse.json(
            {
                error: 'Failed to cancel job',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

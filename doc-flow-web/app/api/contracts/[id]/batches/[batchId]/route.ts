import { createClient } from '@/lib/supabase/server';
import { updateBatchSchema } from '@/lib/schemas/batch';
import { NextResponse } from 'next/server';

/**
 * GET /api/contracts/[id]/batches/[batchId]
 * Get batch details with documents
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; batchId: string }> }
) {
    try {
        const { id, batchId } = await params;
        const supabase = await createClient();

        // Get batch
        const { data: batch, error: batchError } = await supabase
            .from('validation_batches')
            .select('*')
            .eq('id', batchId)
            .eq('contract_id', id)
            .single();

        if (batchError || !batch) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        // Get documents in batch
        const { data: documents } = await supabase
            .from('validated_documents')
            .select('*')
            .eq('batch_id', batchId)
            .order('created_at', { ascending: false });

        return NextResponse.json({
            ...batch,
            documents: documents || [],
        });
    } catch (error) {
        console.error('Batch get error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/contracts/[id]/batches/[batchId]
 * Update batch
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; batchId: string }> }
) {
    try {
        const { id, batchId } = await params;
        const supabase = await createClient();
        const body = await request.json();

        // Validate input
        const result = updateBatchSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.issues },
                { status: 400 }
            );
        }

        // Update batch
        const { data: batch, error } = await supabase
            .from('validation_batches')
            .update(result.data)
            .eq('id', batchId)
            .eq('contract_id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating batch:', error);
            return NextResponse.json(
                { error: 'Failed to update batch' },
                { status: 500 }
            );
        }

        return NextResponse.json(batch);
    } catch (error) {
        console.error('Batch update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/contracts/[id]/batches/[batchId]
 * Delete batch
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; batchId: string }> }
) {
    try {
        const { id, batchId } = await params;
        const supabase = await createClient();

        // Delete batch (documents will have batch_id set to NULL due to ON DELETE SET NULL)
        const { error } = await supabase
            .from('validation_batches')
            .delete()
            .eq('id', batchId)
            .eq('contract_id', id);

        if (error) {
            console.error('Error deleting batch:', error);
            return NextResponse.json(
                { error: 'Failed to delete batch' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Batch delete error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

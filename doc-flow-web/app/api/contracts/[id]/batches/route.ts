import { createClient } from '@/lib/supabase/server';
import { createBatchSchema } from '@/lib/schemas/batch';
import { NextResponse } from 'next/server';

/**
 * GET /api/contracts/[id]/batches
 * List all batches for a contract
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Get batches with stats
        const { data: batches, error, count } = await supabase
            .from('validation_batches')
            .select('*', { count: 'exact' })
            .eq('contract_id', id)
            .order('validated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching batches:', error);
            return NextResponse.json(
                { error: 'Failed to fetch batches' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            batches: batches || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('Batch list error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/contracts/[id]/batches
 * Create a new batch
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const body = await request.json();

        // Validate input
        const result = createBatchSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.issues },
                { status: 400 }
            );
        }

        // Create batch
        const { data: batch, error } = await supabase
            .from('validation_batches')
            .insert({
                contract_id: id,
                ...result.data,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating batch:', error);
            return NextResponse.json(
                { error: 'Failed to create batch' },
                { status: 500 }
            );
        }

        return NextResponse.json(batch, { status: 201 });
    } catch (error) {
        console.error('Batch creation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

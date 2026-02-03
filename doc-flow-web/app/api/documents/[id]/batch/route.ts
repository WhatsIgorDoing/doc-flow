import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/documents/[id]/batch
 * Update document's batch assignment
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const body = await request.json();

        const { batch_id } = body;

        // Update document batch
        const { data, error } = await supabase
            .from('validated_documents')
            .update({ batch_id: batch_id || null })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating document batch:', error);
            return NextResponse.json(
                { error: 'Failed to update document batch' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Document batch update error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { manifestItemSchema } from '@/lib/schemas/manifest';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { id, itemId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate (partial for updates)
    const result = manifestItemSchema.partial().safeParse(body);
    if (!result.success) {
        return NextResponse.json({
            error: 'Validation failed',
            details: result.error.issues
        }, { status: 400 });
    }

    // Update
    const { data, error } = await supabase
        .from('manifest_items')
        .update(result.data)
        .eq('id', itemId)
        .eq('contract_id', id) // Security check
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(data);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { id, itemId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
        .from('manifest_items')
        .delete()
        .eq('id', itemId)
        .eq('contract_id', id); // Security check

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 204 });
}

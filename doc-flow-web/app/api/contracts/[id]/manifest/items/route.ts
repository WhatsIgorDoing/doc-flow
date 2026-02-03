import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { manifestItemSchema } from '@/lib/schemas/manifest';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Validate
    const result = manifestItemSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json({
            error: 'Validation failed',
            details: result.error.issues
        }, { status: 400 });
    }

    // Insert
    const { data, error } = await supabase
        .from('manifest_items')
        .insert({
            contract_id: id,
            ...result.data
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}

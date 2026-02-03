import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = supabase
        .from('manifest_items')
        .select('*', { count: 'exact' })
        .eq('contract_id', id)
        .order('document_code', { ascending: true });

    if (search) {
        query = query.or(`document_code.ilike.%${search}%,title.ilike.%${search}%,document_type.ilike.%${search}%`);
    }

    const { data, error, count } = await query
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        data,
        pagination: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        }
    });
}

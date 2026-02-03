import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/contracts/[id]/analytics
 * Get contract analytics
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Get analytics from view
        const { data: analytics, error } = await supabase
            .from('contract_analytics')
            .select('*')
            .eq('contract_id', id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Error fetching analytics:', error);
            return NextResponse.json(
                { error: 'Failed to fetch analytics' },
                { status: 500 }
            );
        }

        // Get daily stats (last 30 days)
        const { data: dailyStats } = await supabase
            .from('daily_validation_stats')
            .select('*')
            .eq('contract_id', id)
            .order('validation_date', { ascending: false })
            .limit(30);

        // Get batch performance
        const { data: batchPerformance } = await supabase
            .from('batch_performance')
            .select('*')
            .eq('contract_id', id)
            .order('validated_at', { ascending: false })
            .limit(10);

        // Get top errors
        const { data: topErrors } = await supabase
            .from('top_validation_errors')
            .select('*')
            .eq('contract_id', id)
            .limit(10);

        return NextResponse.json({
            summary: analytics || {
                contract_id: id,
                total_documents: 0,
                valid_documents: 0,
                unrecognized_documents: 0,
                error_documents: 0,
                pending_documents: 0,
                total_batches: 0,
                validation_rate_percent: 0,
            },
            dailyStats: dailyStats || [],
            batchPerformance: batchPerformance || [],
            topErrors: topErrors || [],
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

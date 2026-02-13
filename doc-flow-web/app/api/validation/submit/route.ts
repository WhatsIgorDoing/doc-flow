import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Schema for validation result from Python
const validationResultSchema = z.object({
    contract_id: z.string().uuid(),
    document_path: z.string(),
    file_name: z.string(),
    status: z.enum(['valid', 'invalid', 'pending']),
    validation_errors: z.array(z.string()).optional(),
    validated_at: z.string().datetime().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

const batchValidationSchema = z.object({
    contract_id: z.string().uuid(),
    results: z.array(validationResultSchema),
    batch_name: z.string().optional(),
});

/**
 * POST /api/validation/submit
 * 
 * Endpoint for Python validator to submit validation results
 * This centralizes DB access and keeps credentials secure
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();

        // Check for API key authentication (simple security)
        const apiKey = request.headers.get('x-api-key');
        if (apiKey !== process.env.PYTHON_API_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Validate request body
        const result = batchValidationSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: result.error.issues },
                { status: 400 }
            );
        }

        const { contract_id, results, batch_name } = result.data;

        // Verify contract exists
        const { data: contract, error: contractError } = await supabase
            .from('contracts')
            .select('id')
            .eq('id', contract_id)
            .single();

        if (contractError || !contract) {
            return NextResponse.json(
                { error: 'Contract not found' },
                { status: 404 }
            );
        }

        // Insert validation results
        const documentsToInsert = results.map(r => ({
            contract_id: r.contract_id,
            document_path: r.document_path,
            file_name: r.file_name,
            status: r.status,
            validation_errors: r.validation_errors || [],
            validated_at: r.validated_at || new Date().toISOString(),
            metadata: r.metadata || {},
        }));

        const { data: insertedDocs, error: insertError } = await supabase
            .from('validated_documents')
            .insert(documentsToInsert)
            .select();

        if (insertError) {
            console.error('Insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to insert validation results', details: insertError.message },
                { status: 500 }
            );
        }

        // Realtime subscribers will automatically receive updates via triggers

        return NextResponse.json({
            success: true,
            inserted: insertedDocs?.length || 0,
            message: `Successfully saved ${insertedDocs?.length} validation results`,
        }, { status: 201 });

    } catch (error) {
        console.error('Validation submission error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

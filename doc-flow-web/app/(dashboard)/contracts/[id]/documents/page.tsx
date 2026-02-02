import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DocumentsTable } from './documents-table';
import type { ValidatedDocument } from '@/types/database';

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params; // Next.js 15+ requires awaiting params
    const supabase = await createClient();

    // Fetch contract details
    const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*, company:companies(*)')
        .eq('id', id)
        .single();

    if (contractError || !contract) {
        notFound();
    }

    // Fetch validated documents for this contract
    const { data: documents, error: docsError } = await supabase
        .from('validated_documents')
        .select(`
      *,
      manifest_item:manifest_items(*),
      validated_by_user:users(name, email)
    `)
        .eq('contract_id', id)
        .order('validation_date', { ascending: false });

    if (docsError) {
        console.error('Error fetching documents:', docsError);
    }

    const validatedDocs: ValidatedDocument[] = documents || [];

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{contract.name}</h1>
                <p className="text-muted-foreground mt-2">
                    {contract.company?.name} • {contract.code}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatsCard
                    label="Total"
                    value={validatedDocs.length}
                    color="bg-gray-100"
                />
                <StatsCard
                    label="Validados"
                    value={validatedDocs.filter((d) => d.status === 'VALIDATED').length}
                    color="bg-green-100 text-green-700"
                />
                <StatsCard
                    label="Não Reconhecidos"
                    value={validatedDocs.filter((d) => d.status === 'UNRECOGNIZED').length}
                    color="bg-orange-100 text-orange-700"
                />
                <StatsCard
                    label="Erros"
                    value={validatedDocs.filter((d) => d.status === 'ERROR').length}
                    color="bg-red-100 text-red-700"
                />
            </div>

            {/* Documents Table */}
            <DocumentsTable documents={validatedDocs} />
        </div>
    );
}

function StatsCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className={`rounded-lg p-6 ${color}`}>
            <p className="text-sm font-medium opacity-80">{label}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
}

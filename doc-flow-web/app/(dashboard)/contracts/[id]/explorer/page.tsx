import { createClient } from '@/lib/supabase/server';
import { DocumentsClientWrapper } from './documents-client-wrapper';
import { Breadcrumbs } from '@/components/breadcrumbs';
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
        // Better error page with debugging info
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h1 className="text-2xl font-bold text-red-800 mb-4">Contrato Não Encontrado</h1>
                        <p className="text-red-700 mb-4">
                            O contrato com ID <code className="bg-red-100 px-2 py-1 rounded">{id}</code> não foi encontrado.
                        </p>

                        {contractError && (
                            <div className="mt-4 p-4 bg-white rounded border border-red-300">
                                <h2 className="font-semibold text-red-800 mb-2">Detalhes do Erro:</h2>
                                <pre className="text-sm text-red-600 overflow-x-auto">
                                    {JSON.stringify(contractError, null, 2)}
                                </pre>
                            </div>
                        )}

                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                            <h3 className="font-semibold text-yellow-800 mb-2">💡 Possíveis Causas:</h3>
                            <ul className="list-disc list-inside text-yellow-700 space-y-1 text-sm">
                                <li>Políticas de Row Level Security (RLS) do Supabase estão bloqueando o acesso</li>
                                <li>O contrato não existe no banco de dados</li>
                                <li>Você não tem permissão para acessar este contrato</li>
                                <li>As migrations do banco de dados não foram aplicadas</li>
                            </ul>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                            <h3 className="font-semibold text-blue-800 mb-2">🔧 Solução:</h3>
                            <ol className="list-decimal list-inside text-blue-700 space-y-2 text-sm">
                                <li>Certifique-se de que as migrations foram aplicadas no Supabase</li>
                                <li>Verifique se a migration <code className="bg-blue-100 px-1 rounded">002_dev_bypass_policies.sql</code> foi aplicada</li>
                                <li>Verifique as configurações do arquivo <code className="bg-blue-100 px-1 rounded">.env.local</code></li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        );
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
        <div>
            <Breadcrumbs items={[
                { label: 'Contratos', href: '/contracts' },
                { label: contract.code, href: `/contracts/${id}` },
                { label: 'Documentos' },
            ]} />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{contract.name}</h1>
                    <p className="text-muted-foreground mt-1">
                        {contract.company?.name} • {contract.code}
                    </p>
                </div>
            </div>

            {/* Documents Table with Realtime */}
            <DocumentsClientWrapper
                contractId={id}
                initialDocuments={validatedDocs}
            />
        </div>
    );
}

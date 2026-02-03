import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { FileText, Building2 } from 'lucide-react';

export default async function ContractsPage() {
    const supabase = await createClient();

    const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
      *,
      company:companies(name),
      documents:validated_documents(count)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching contracts:', error);
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <Breadcrumbs items={[
                { label: 'Contratos' },
            ]} />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
                <p className="text-gray-600 mt-2">
                    Gerenciar contratos e visualizar documentos validados
                </p>
            </div>

            {contracts && contracts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                            Nenhum contrato encontrado
                        </h3>
                        <p className="text-gray-500 text-center">
                            Contratos serão criados automaticamente quando o validador Python processar documentos.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contracts?.map((contract) => {
                        const docCount = (contract as any).documents?.[0]?.count || 0;

                        return (
                            <Link
                                key={contract.id}
                                href={`/contracts/${contract.id}/documents`}
                                className="block transition-transform hover:scale-105"
                            >
                                <Card className="h-full hover:shadow-lg transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg mb-2">
                                                    {contract.code}
                                                </CardTitle>
                                                <p className="text-sm text-gray-600 line-clamp-2">
                                                    {contract.name}
                                                </p>
                                            </div>
                                            <FileText className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Building2 className="h-4 w-4 mr-2" />
                                                {(contract as any).company?.name || 'N/A'}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <span className="text-sm text-gray-600">Documentos</span>
                                                <Badge variant={docCount > 0 ? 'default' : 'secondary'}>
                                                    {docCount}
                                                </Badge>
                                            </div>

                                            <div className="pt-2">
                                                <p className="text-xs text-gray-500">
                                                    Criado em {new Date(contract.created_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

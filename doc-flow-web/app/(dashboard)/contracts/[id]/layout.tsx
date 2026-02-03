import { ReactNode } from 'react';
import { ContractNav } from '@/components/contract-nav';

interface ContractLayoutProps {
    children: ReactNode;
    params: Promise<{ id: string }>;
}

export default async function ContractLayout({
    children,
    params
}: ContractLayoutProps) {
    const { id } = await params;

    return (
        <div className="container mx-auto py-6 px-4">
            <ContractNav contractId={id} />
            {children}
        </div>
    );
}

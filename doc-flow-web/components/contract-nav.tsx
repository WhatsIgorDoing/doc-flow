'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ListChecks, FolderSearch, Scale, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractNavProps {
    contractId: string;
}

const navItems = [
    {
        href: (id: string) => `/contracts/${id}/overview`,
        label: 'Visão Geral',
        icon: LayoutDashboard,
    },
    {
        href: (id: string) => `/contracts/${id}/manifest`,
        label: 'Lista de documentos',
        icon: ListChecks,
    },
    {
        href: (id: string) => `/contracts/${id}/explorer`,
        label: 'Explorador',
        icon: FolderSearch,
    },
    {
        href: (id: string) => `/contracts/${id}/batches`,
        label: 'Gestão de Lotes',
        icon: Layers,
    },
];

export function ContractNav({ contractId }: ContractNavProps) {
    const pathname = usePathname();

    return (
        <nav className="mb-6 border-b border-border pl-1">
            <div className="flex gap-6">
                {navItems.map((item) => {
                    const href = item.href(contractId);
                    const isActive = pathname === href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'group flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                                '-mb-[2px]', // Overlap border
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/20 hover:text-foreground'
                            )}
                        >
                            <Icon className="h-4 w-4" strokeWidth={1.5} />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

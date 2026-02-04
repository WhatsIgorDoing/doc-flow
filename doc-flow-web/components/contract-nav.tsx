'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, List, FolderOpen, BarChart3, Upload, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContractNavProps {
    contractId: string;
}

const navItems = [
    {
        href: (id: string) => `/contracts/${id}/documents`,
        label: 'Documentos',
        icon: FileText,
    },
    {
        href: (id: string) => `/contracts/${id}/manifest`,
        label: 'Manifesto',
        icon: List,
    },
    {
        href: (id: string) => `/contracts/${id}/validation`,
        label: 'Validação',
        icon: Upload,
    },
    {
        href: (id: string) => `/contracts/${id}/resolution`,
        label: 'Resolução',
        icon: HelpCircle,
    },
    {
        href: (id: string) => `/contracts/${id}/batches`,
        label: 'Lotes',
        icon: FolderOpen,
    },
    {
        href: (id: string) => `/contracts/${id}/analytics`,
        label: 'Analytics',
        icon: BarChart3,
    },
];

export function ContractNav({ contractId }: ContractNavProps) {
    const pathname = usePathname();

    return (
        <nav className="border-b border-gray-200 mb-6">
            <div className="flex gap-1">
                {navItems.map((item) => {
                    const href = item.href(contractId);
                    const isActive = pathname === href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                                'border-b-2 -mb-px',
                                isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

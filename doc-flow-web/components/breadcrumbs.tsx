'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    {idx > 0 && <ChevronRight className="h-4 w-4" />}
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-gray-900 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-medium">{item.label}</span>
                    )}
                </div>
            ))}
        </nav>
    );
}

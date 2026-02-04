import { Badge } from './badge';
import type { DocumentStatus } from '@/types/database';

interface StatusBadgeProps {
    status: DocumentStatus;
    size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
    DocumentStatus,
    { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary'; icon: string }
> = {
    VALIDATED: {
        label: 'Validado',
        variant: 'success',
        icon: '✓',
    },
    UNRECOGNIZED: {
        label: 'Não Reconhecido',
        variant: 'warning',
        icon: '⚠',
    },
    ERROR: {
        label: 'Erro',
        variant: 'destructive',
        icon: '✕',
    },
    PENDING: {
        label: 'Pendente',
        variant: 'secondary',
        icon: '○',
    },
    NEEDS_SUFFIX: {
        label: 'Ajuste Necessário',
        variant: 'warning',
        icon: '✎',
    },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <Badge variant={config.variant} className={size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm px-3 py-1' : ''}>
            <span className="mr-1">{config.icon}</span>
            {config.label}
        </Badge>
    );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ManifestItemDialog } from './ManifestItemDialog';

interface AddItemButtonProps {
    contractId: string;
}

export function AddItemButton({ contractId }: AddItemButtonProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
            </Button>

            <ManifestItemDialog
                contractId={contractId}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    );
}

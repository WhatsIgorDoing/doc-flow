'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ManifestItem {
    id: string;
    document_code: string;
    title: string | null;
    document_type: string | null;
}

interface DeleteConfirmDialogProps {
    contractId: string;
    item: ManifestItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

async function deleteManifestItem(contractId: string, itemId: string) {
    const res = await fetch(`/api/contracts/${contractId}/manifest/items/${itemId}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete item');
    }

    return res.json();
}

export function DeleteConfirmDialog({
    contractId,
    item,
    open,
    onOpenChange
}: DeleteConfirmDialogProps) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => deleteManifestItem(contractId, item.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manifest', contractId] });
            toast.success('Item excluído com sucesso!');
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast.error(`Erro ao excluir: ${error.message}`);
        }
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir o documento <strong>"{item.document_code}"</strong>?
                        {item.title && <span className="block mt-2 text-sm">{item.title}</span>}
                        {item.document_type && <span className="block text-sm text-gray-500">Tipo: {item.document_type}</span>}
                        <span className="block mt-3 text-red-600 font-semibold">
                            Esta ação não pode ser desfeita.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={mutation.isPending}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {mutation.isPending ? 'Excluindo...' : 'Excluir'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

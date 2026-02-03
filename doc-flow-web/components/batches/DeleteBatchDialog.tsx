'use client';

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

interface DeleteBatchDialogProps {
    batch: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export function DeleteBatchDialog({
    batch,
    open,
    onOpenChange,
    onConfirm,
    isDeleting
}: DeleteBatchDialogProps) {
    if (!batch) return null;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir o lote <strong>"{batch.name}"</strong>?

                        {batch.total_items > 0 && (
                            <span className="block mt-3 text-yellow-600">
                                ⚠️ Este lote contém {batch.total_items} documentos. Os documentos não serão deletados, apenas desvinculados do lote.
                            </span>
                        )}

                        <span className="block mt-3 text-red-600 font-semibold">
                            Esta ação não pode ser desfeita.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting ? 'Deletando...' : 'Deletar'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

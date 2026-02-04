'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { manifestItemSchema, type ManifestItemInput } from '@/lib/schemas/manifest';

interface ManifestItem {
    id: string;
    numbering?: string;
    document_code: string;
    revision: string | null;
    title: string | null;
    document_type: string | null;
    category: string | null;
    expected_delivery_date: string | null;
    responsible_email: string | null;
}

interface ManifestItemDialogProps {
    contractId: string;
    item?: ManifestItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

async function createManifestItem(contractId: string, data: ManifestItemInput) {
    const res = await fetch(`/api/contracts/${contractId}/manifest/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create item');
    }

    return res.json();
}

async function updateManifestItem(contractId: string, itemId: string, data: Partial<ManifestItemInput>) {
    const res = await fetch(`/api/contracts/${contractId}/manifest/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update item');
    }

    return res.json();
}

// Helper function to convert null values to empty strings for form defaults
function getDefaultValues(item?: ManifestItem): ManifestItemInput {
    if (!item) {
        return {
            numbering: '',
            document_code: '',
            revision: '',
            title: '',
            document_type: '',
            category: '',
            expected_delivery_date: '',
            responsible_email: '',
        };
    }
    return {
        numbering: item.numbering || '',
        document_code: item.document_code,
        revision: item.revision ?? '',
        title: item.title ?? '',
        document_type: item.document_type ?? '',
        category: item.category ?? '',
        expected_delivery_date: item.expected_delivery_date ?? '',
        responsible_email: item.responsible_email ?? '',
    };
}

export function ManifestItemDialog({
    contractId,
    item,
    open,
    onOpenChange
}: ManifestItemDialogProps) {
    const queryClient = useQueryClient();
    const isEdit = !!item;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ManifestItemInput>({
        resolver: zodResolver(manifestItemSchema),
        defaultValues: getDefaultValues(item),
    });

    const mutation = useMutation({
        mutationFn: (data: ManifestItemInput) =>
            isEdit
                ? updateManifestItem(contractId, item.id, data)
                : createManifestItem(contractId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manifest', contractId] });
            onOpenChange(false);
            toast.success(isEdit ? 'Item atualizado com sucesso!' : 'Item criado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro: ${error.message}`);
        }
    });

    const onSubmit = (data: ManifestItemInput) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Edite as informações do item do manifesto' : 'Adicione um novo item ao manifesto'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="numbering">Numeração *</Label>
                            <Input
                                id="numbering"
                                {...register('numbering')}
                                placeholder="Ex: 1.0, 2.1"
                                className={errors.numbering ? 'border-red-500' : ''}
                            />
                            {errors.numbering && (
                                <p className="text-sm text-red-600">{errors.numbering.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="document_code">Código do Documento *</Label>
                            <Input
                                id="document_code"
                                {...register('document_code')}
                                placeholder="Ex: DOC-001"
                                className={errors.document_code ? 'border-red-500' : ''}
                            />
                            {errors.document_code && (
                                <p className="text-sm text-red-600">{errors.document_code.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="space-y-2">
                            <Label htmlFor="revision">Revisão</Label>
                            <Input
                                id="revision"
                                {...register('revision')}
                                placeholder="Ex: Rev. A"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            {...register('title')}
                            placeholder="Título do documento"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="document_type">Tipo de Documento</Label>
                            <Input
                                id="document_type"
                                {...register('document_type')}
                                placeholder="Ex: Contrato, Relatório"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Categoria</Label>
                            <Input
                                id="category"
                                {...register('category')}
                                placeholder="Ex: Technical, Management"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expected_delivery_date">Data de Entrega Esperada</Label>
                            <Input
                                id="expected_delivery_date"
                                type="date"
                                {...register('expected_delivery_date')}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="responsible_email">Email do Responsável</Label>
                            <Input
                                id="responsible_email"
                                type="email"
                                {...register('responsible_email')}
                                placeholder="responsavel@exemplo.com"
                                className={errors.responsible_email ? 'border-red-500' : ''}
                            />
                            {errors.responsible_email && (
                                <p className="text-sm text-red-600">{errors.responsible_email.message}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const batchSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    validated_at: z.string().optional(),
});

type BatchFormData = z.infer<typeof batchSchema>;

interface BatchDialogProps {
    contractId: string;
    batch: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BatchDialog({ contractId, batch, open, onOpenChange }: BatchDialogProps) {
    const queryClient = useQueryClient();
    const isEditing = !!batch;

    const { register, handleSubmit, formState: { errors }, reset } = useForm<BatchFormData>({
        resolver: zodResolver(batchSchema),
        defaultValues: {
            name: '',
            description: '',
            validated_at: new Date().toISOString().split('T')[0],
        },
    });

    useEffect(() => {
        if (batch) {
            reset({
                name: batch.name,
                description: batch.description || '',
                validated_at: batch.validated_at ? new Date(batch.validated_at).toISOString().split('T')[0] : '',
            });
        } else {
            reset({
                name: '',
                description: '',
                validated_at: new Date().toISOString().split('T')[0],
            });
        }
    }, [batch, reset]);

    const mutation = useMutation({
        mutationFn: async (data: BatchFormData) => {
            const url = isEditing
                ? `/api/contracts/${contractId}/batches/${batch.id}`
                : `/api/contracts/${contractId}/batches`;

            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    validated_at: data.validated_at ? new Date(data.validated_at).toISOString() : undefined,
                }),
            });

            if (!res.ok) throw new Error('Failed to save batch');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['batches', contractId] });
            toast.success(isEditing ? 'Lote atualizado!' : 'Lote criado!');
            onOpenChange(false);
            reset();
        },
        onError: () => {
            toast.error('Erro ao salvar lote');
        },
    });

    const onSubmit = (data: BatchFormData) => {
        mutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Lote' : 'Novo Lote'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Nome do Lote *</Label>
                        <Input
                            id="name"
                            {...register('name')}
                            placeholder="Ex: Lote Janeiro 2026"
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            {...register('description')}
                            placeholder="Descreva o lote..."
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label htmlFor="validated_at">Data de Validação</Label>
                        <Input
                            id="validated_at"
                            type="date"
                            {...register('validated_at')}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

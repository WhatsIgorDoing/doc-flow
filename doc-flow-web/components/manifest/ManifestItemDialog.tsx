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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    created_at: string;
    // New fields optional in interface because legacy data might miss them
    unit?: string | null;
    discipline?: string | null;
    scope?: string | null;
    purpose?: string | null;
    actual_delivery_date?: string | null;
    n1710?: boolean;
    iso9001?: boolean;
    grdt?: string | null;
    status?: string | null;
    for_construction?: boolean;
    released_revision?: string | null;
    issuer?: string | null;
    who?: string | null;
    deadline?: string | null;
    status_sigem?: string | null;
    remarks?: string | null;
    taxonomy?: string | null;
    allocation_sigem?: string | null;
    pw?: string | null;
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
            unit: '',
            discipline: '',
            scope: '',
            purpose: '',
            actual_delivery_date: '',
            n1710: false,
            iso9001: false,
            grdt: '',
            status: '',
            for_construction: false,
            released_revision: '',
            issuer: '',
            who: '',
            deadline: '',
            status_sigem: '',
            remarks: '',
            taxonomy: '',
            allocation_sigem: '',
            pw: '',
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
        unit: item.unit ?? '',
        discipline: item.discipline ?? '',
        scope: item.scope ?? '',
        purpose: item.purpose ?? '',
        actual_delivery_date: item.actual_delivery_date ?? '',
        n1710: item.n1710 ?? false,
        iso9001: item.iso9001 ?? false,
        grdt: item.grdt ?? '',
        status: item.status ?? '',
        for_construction: item.for_construction ?? false,
        released_revision: item.released_revision ?? '',
        issuer: item.issuer ?? '',
        who: item.who ?? '',
        deadline: item.deadline ?? '',
        status_sigem: item.status_sigem ?? '',
        remarks: item.remarks ?? '',
        taxonomy: item.taxonomy ?? '',
        allocation_sigem: item.allocation_sigem ?? '',
        pw: item.pw ?? '',
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
        setValue,
        watch,
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{isEdit ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Edite as informações do item do manifesto' : 'Adicione um novo item ao manifesto'}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-4">
                    <form id="manifest-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Core Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="numbering">Numeração (Item) *</Label>
                                <Input id="numbering" {...register('numbering')} placeholder="1.0" className={errors.numbering ? 'border-red-500' : ''} />
                                {errors.numbering && <p className="text-xs text-red-600">{errors.numbering.message}</p>}
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="document_code">Código do Documento (N-1710) *</Label>
                                <Input id="document_code" {...register('document_code')} placeholder="ABC-123" className={errors.document_code ? 'border-red-500' : ''} />
                                {errors.document_code && <p className="text-xs text-red-600">{errors.document_code.message}</p>}
                            </div>
                        </div>

                        {/* Title & Revision */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2 md:col-span-3">
                                <Label htmlFor="title">Título</Label>
                                <Input id="title" {...register('title')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="revision">Revisão</Label>
                                <Input id="revision" {...register('revision')} placeholder="0" />
                            </div>
                        </div>

                        {/* Metadata Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unidade/Área</Label>
                                <Input id="unit" {...register('unit')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="discipline">Disciplina</Label>
                                <Input id="discipline" {...register('discipline')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="scope">Escopo</Label>
                                <Input id="scope" {...register('scope')} />
                            </div>
                        </div>

                        {/* Metadata Row 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="document_type">Tipo de Documento</Label>
                                <Input id="document_type" {...register('document_type')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoria</Label>
                                <Input id="category" {...register('category')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="purpose">Propósito de Emissão</Label>
                                <Input id="purpose" {...register('purpose')} />
                            </div>
                        </div>

                        {/* Dates & People */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="expected_delivery_date">Data Prevista</Label>
                                <Input id="expected_delivery_date" type="date" {...register('expected_delivery_date')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="actual_delivery_date">Data Efetiva</Label>
                                <Input id="actual_delivery_date" type="date" {...register('actual_delivery_date')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="responsible_email">Responsável (Email)</Label>
                                <Input id="responsible_email" {...register('responsible_email')} className={errors.responsible_email ? 'border-red-500' : ''} />
                                {errors.responsible_email && <p className="text-xs text-red-600">{errors.responsible_email.message}</p>}
                            </div>
                        </div>

                        {/* Status & Flags */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="n1710"
                                    checked={watch('n1710')}
                                    onCheckedChange={(c) => setValue('n1710', !!c)}
                                />
                                <Label htmlFor="n1710">N-1710</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="iso9001"
                                    checked={watch('iso9001')}
                                    onCheckedChange={(c) => setValue('iso9001', !!c)}
                                />
                                <Label htmlFor="iso9001">ISO 9001</Label>
                            </div>
                            <div className="flex items-center space-x-2 md:col-span-2">
                                <Checkbox
                                    id="for_construction"
                                    checked={watch('for_construction')}
                                    onCheckedChange={(c) => setValue('for_construction', !!c)}
                                />
                                <Label htmlFor="for_construction">Para Construção?</Label>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="grdt">GRDT</Label>
                                <Input id="grdt" {...register('grdt')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="released_revision">Rev. Liberada</Label>
                                <Input id="released_revision" {...register('released_revision')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Input id="status" {...register('status')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="issuer">Emissor</Label>
                                <Input id="issuer" {...register('issuer')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="who">Quem?</Label>
                                <Input id="who" {...register('who')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deadline">Prazo</Label>
                                <Input id="deadline" {...register('deadline')} />
                            </div>
                        </div>

                        {/* System Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="status_sigem">Status SIGEM</Label>
                                <Input id="status_sigem" {...register('status_sigem')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="allocation_sigem">Alocação SIGEM</Label>
                                <Input id="allocation_sigem" {...register('allocation_sigem')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="taxonomy">Taxonomia/Consag</Label>
                                <Input id="taxonomy" {...register('taxonomy')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pw">PW</Label>
                                <Input id="pw" {...register('pw')} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="remarks">Observações</Label>
                            <Input id="remarks" {...register('remarks')} />
                        </div>

                    </form>
                </ScrollArea>

                <DialogFooter className="px-6 py-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={mutation.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" form="manifest-form" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

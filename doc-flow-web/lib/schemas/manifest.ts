import { z } from 'zod';

export const manifestItemSchema = z.object({
    numbering: z.string().min(1, 'Numeração é obrigatória'),
    document_code: z.string().min(1, 'Código do documento é obrigatório'),
    revision: z.string().optional(),
    title: z.string().optional(),
    document_type: z.string().optional(),
    category: z.string().optional(),
    responsible_email: z.string().email('Email inválido').optional().or(z.literal('')),

    // New fields
    unit: z.string().optional(),
    discipline: z.string().optional(),
    scope: z.string().optional(),
    purpose: z.string().optional(),
    expected_delivery_date: z.string().optional(),
    actual_delivery_date: z.string().optional(),
    n1710: z.boolean().optional(),
    iso9001: z.boolean().optional(),
    grdt: z.string().optional(),
    status: z.string().optional(),
    for_construction: z.boolean().optional(),
    released_revision: z.string().optional(),
    issuer: z.string().optional(),
    who: z.string().optional(),
    deadline: z.string().optional(),
    status_sigem: z.string().optional(),
    remarks: z.string().optional(),
    taxonomy: z.string().optional(),
    allocation_sigem: z.string().optional(),
    pw: z.string().optional(),
});

export type ManifestItemInput = z.infer<typeof manifestItemSchema>;

import { z } from 'zod';

export const manifestItemSchema = z.object({
    numbering: z.string().min(1, 'Numeração é obrigatória'),
    document_code: z.string().min(1, 'Código do documento é obrigatório'),
    revision: z.string().optional(),
    title: z.string().optional(),
    document_type: z.string().optional(),
    category: z.string().optional(),
    expected_delivery_date: z.string().optional(), // ISO date string
    responsible_email: z.string().email('Email inválido').optional().or(z.literal('')),
});

export type ManifestItemInput = z.infer<typeof manifestItemSchema>;

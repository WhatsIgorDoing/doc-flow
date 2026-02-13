import { z } from 'zod';

// Schema for creating a batch
export const createBatchSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    validated_at: z.string().datetime().optional(),
});

// Schema for updating a batch
export const updateBatchSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    description: z.string().optional(),
    validated_at: z.string().datetime().optional(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;

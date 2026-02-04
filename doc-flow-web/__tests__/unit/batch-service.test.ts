import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchService } from '@/lib/validator/services/batch-service';
import { createClient } from '@/lib/supabase/server';

// Mock do módulo inteiro
vi.mock('@/lib/supabase/server');

describe('BatchService', () => {
    let service: BatchService;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup do mockSupabase para cada teste
        mockSupabase = {
            from: vi.fn(),
            rpc: vi.fn(),
        };

        // Configurar createClient para retornar o mock
        vi.mocked(createClient).mockResolvedValue(mockSupabase);

        service = new BatchService({ contractId: 'contract-1' });
    });

    describe('generateGRDTNumber', () => {
        it('should generate properly formatted GRDT number', async () => {
            // Mock RPC response
            mockSupabase.rpc.mockResolvedValue({ data: 123, error: null });

            const queryBuilder = {
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({
                    data: {
                        id: 'batch-1',
                        grdt_number: 'GRDT-2025-00123',
                        contract_id: 'contract-1'
                    },
                    error: null
                })
            };

            mockSupabase.from.mockReturnValue(queryBuilder);

            const result = await service.createBatch({ name: 'Lote Teste' });
            expect(result.grdt_number).toMatch(/GRDT-\d{4}-\d{5}/);
        });
    });

    describe('getUnassignedDocuments', () => {
        it('should fetch documents with empty batch_id', async () => {
            const queryBuilder = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(), // Added missing method
                order: vi.fn().mockResolvedValue({
                    data: [{ id: 'doc-1', filename: 'test.pdf' }],
                    error: null
                })
            };

            mockSupabase.from.mockReturnValue(queryBuilder);

            const docs = await service.getUnassignedDocuments();
            expect(docs).toHaveLength(1);
            expect(docs[0].filename).toBe('test.pdf');
        });
    });
});

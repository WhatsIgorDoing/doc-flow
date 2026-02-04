import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResolutionService } from '@/lib/validator/services/resolution-service';
import { ExtractionService } from '@/lib/validator/services/extraction-service';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/validator/services/extraction-service');
vi.mock('@/lib/supabase/server');

describe('ResolutionService', () => {
    let service: ResolutionService;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn(),
            select: vi.fn(),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase);

        service = new ResolutionService({ contractId: 'contract-1' });
    });

    describe('getCandidates', () => {
        it('should return candidates ordered by similarity', async () => {
            // Mock Extraction Service behavior
            const mockSuggestMatches = vi.fn().mockResolvedValue([
                { manifestItemId: '1', documentCode: 'DOC-123', similarity: 1.0 },
                { manifestItemId: '2', documentCode: 'DOC-124', similarity: 0.8 },
            ]);

            // Inject mock to prototype or instance if possible, or mock module
            ExtractionService.prototype.suggestMatches = mockSuggestMatches;

            const candidates = await service.getCandidates('doc-id');

            expect(candidates).toHaveLength(2);
            expect(candidates[0].similarity).toBe(1.0);
            expect(candidates[1].similarity).toBe(0.8);
        });
    });

    describe('autoResolve', () => {
        it('should exist', () => {
            // Placeholder test
            expect(service).toBeDefined();
        });
    });
});

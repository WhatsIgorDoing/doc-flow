import { describe, it, expect } from 'vitest';
import { ExtractionService } from '@/lib/validator/services/extraction-service';

describe('ExtractionService', () => {
    const service = new ExtractionService({ contractId: 'test-contract' });

    describe('extractDocumentCode', () => {
        it('should extract simple code pattern', () => {
            // Usando espaço em vez de _ para garantir word boundary
            const code = service.extractDocumentCode('', 'Relatório DOC-123 Final.pdf');
            expect(code).toBe('DOC-123');
        });

        it('should extract code with revision', () => {
            const code = service.extractDocumentCode('', 'PLAN-999 Rev0.pdf');
            expect(code).toBe('PLAN-999');
        });

        it('should return undefined if no pattern matches', () => {
            const code = service.extractDocumentCode('', 'ApenasUmNome.pdf');
            expect(code).toBeUndefined();
        });
    });

    describe('calculateSimilarity', () => {
        it('should return 1 for identical strings', () => {
            const score = (service as any).calculateSimilarity('DOC-001', 'DOC-001');
            expect(score).toBe(1);
        });

        it('should return high score for minor differences', () => {
            const score = (service as any).calculateSimilarity('DOC-001', 'DOC-00l');
            expect(score).toBeGreaterThan(0.8);
        });
    });
});

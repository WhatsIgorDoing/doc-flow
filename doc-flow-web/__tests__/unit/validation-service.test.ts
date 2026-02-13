import { describe, it, expect } from 'vitest';
import {
    normalizeDocumentCode,
    isValidExtension,
    getFileBaseName,
    hasRevisionSuffix
} from '@/lib/validator/services/validation-service';

describe('ValidationService Helpers', () => {
    it('should normalize code by removing extension and revision', () => {
        // The implementation splits by dot if accepted extension.
        // DOC-001.pdf -> DOC-001
        // DOC-001_RevA.pdf -> DOC-001_RevA -> DOC-001
        expect(normalizeDocumentCode('DOC-001.pdf')).toBe('DOC-001');
        expect(normalizeDocumentCode('DOC-001_RevA.pdf')).toBe('DOC-001');
        expect(normalizeDocumentCode('doc-001.pdf')).toBe('DOC-001');
    });

    describe('isValidExtension', () => {
        it('should validate accepted extensions', () => {
            expect(isValidExtension('file.pdf')).toBe(true);
            expect(isValidExtension('file.doc')).toBe(true);
            expect(isValidExtension('file.exe')).toBe(false);
        });
    });

    describe('hasRevisionSuffix', () => {
        it('should detect revision suffixes', () => {
            expect(hasRevisionSuffix('DOC-001_RevA.pdf')).toBe(true);
            expect(hasRevisionSuffix('DOC-001-01.pdf')).toBe(true);
            expect(hasRevisionSuffix('DOC-001.pdf')).toBe(false);
        });
    });

    describe('getFileBaseName', () => {
        it('should return filename without extension', () => {
            expect(getFileBaseName('file.pdf')).toBe('file');
            expect(getFileBaseName('archive.tar.gz')).toBe('archive.tar');
        });
    });
});

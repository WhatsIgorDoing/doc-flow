-- Migration 015: Add Resolution Columns
-- Created: 2026-02-04
-- Purpose: Add 'confidence' and 'matched_document_code' to validated_documents to support resolution logic.

ALTER TABLE validated_documents 
ADD COLUMN IF NOT EXISTS confidence FLOAT,
ADD COLUMN IF NOT EXISTS matched_document_code TEXT;

COMMENT ON COLUMN validated_documents.confidence IS 'Confidence score of the validation/resolution (0-1)';
COMMENT ON COLUMN validated_documents.matched_document_code IS 'Document code matched during resolution';

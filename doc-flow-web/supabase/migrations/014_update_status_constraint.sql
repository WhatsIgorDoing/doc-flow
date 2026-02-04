-- Migration 014: Update Status Check Constraint
-- Created: 2026-02-04
-- Purpose: Add 'NEEDS_SUFFIX' to the allowed status list in validated_documents

-- 1. Drop existing constraint
ALTER TABLE validated_documents DROP CONSTRAINT validated_documents_status_check;

-- 2. Add new constraint with NEEDS_SUFFIX
ALTER TABLE validated_documents ADD CONSTRAINT validated_documents_status_check 
    CHECK (status IN ('VALIDATED', 'UNRECOGNIZED', 'ERROR', 'PENDING', 'NEEDS_SUFFIX'));

COMMENT ON CONSTRAINT validated_documents_status_check ON validated_documents IS 'Added NEEDS_SUFFIX to allowed statuses';

-- Migration 010: Dev Bypass for Validation
-- Created: 2026-02-04
-- Purpose: Allow public access to validation jobs/results for DEMO CONTRACT ONLY

-- 1. Validation Jobs: Allow public access for demo contract
-- This is required because the demo contract is accessed by anonymous users
DROP POLICY IF EXISTS "public_access_demo_validation_jobs" ON validation_jobs;
CREATE POLICY "public_access_demo_validation_jobs"
ON validation_jobs FOR ALL
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid)
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- 2. Extraction Results: Allow public access for demo documents
DROP POLICY IF EXISTS "public_access_demo_extraction_results" ON extraction_results;
CREATE POLICY "public_access_demo_extraction_results"
ON extraction_results FOR ALL
TO anon
USING (
    validated_document_id IN (
        SELECT id FROM validated_documents 
        WHERE contract_id = '00000000-0000-0000-0000-000000000002'::uuid
    )
)
WITH CHECK (
    validated_document_id IN (
        SELECT id FROM validated_documents 
        WHERE contract_id = '00000000-0000-0000-0000-000000000002'::uuid
    )
);

COMMENT ON POLICY "public_access_demo_validation_jobs" ON validation_jobs IS 'Allow anon access for demo contract (Dev Bypass)';

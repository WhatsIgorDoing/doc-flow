-- Migration 013: Allow Write for Validated Documents
-- Created: 2026-02-04
-- Purpose: Allow INSERT/UPDATE on validated_documents for anonymous users (Demo Contract)

-- 1. INSERT
DROP POLICY IF EXISTS "public_insert_demo_validated_documents" ON validated_documents;
CREATE POLICY "public_insert_demo_validated_documents"
ON validated_documents FOR INSERT
TO anon
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- 2. UPDATE
DROP POLICY IF EXISTS "public_update_demo_validated_documents" ON validated_documents;
CREATE POLICY "public_update_demo_validated_documents"
ON validated_documents FOR UPDATE
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid)
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

COMMENT ON POLICY "public_insert_demo_validated_documents" ON validated_documents IS 'Allow anon insert for demo validated docs (Dev Bypass)';

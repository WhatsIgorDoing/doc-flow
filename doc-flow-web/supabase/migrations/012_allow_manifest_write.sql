-- Migration 012: Allow Manifest Write for Demo
-- Created: 2026-02-04
-- Purpose: Allow INSERT/UPDATE/DELETE on manifest_items for anonymous users (Demo Contract)

-- 1. INSERT
DROP POLICY IF EXISTS "public_insert_demo_manifest_items" ON manifest_items;
CREATE POLICY "public_insert_demo_manifest_items"
ON manifest_items FOR INSERT
TO anon
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- 2. UPDATE
DROP POLICY IF EXISTS "public_update_demo_manifest_items" ON manifest_items;
CREATE POLICY "public_update_demo_manifest_items"
ON manifest_items FOR UPDATE
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid)
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- 3. DELETE
DROP POLICY IF EXISTS "public_delete_demo_manifest_items" ON manifest_items;
CREATE POLICY "public_delete_demo_manifest_items"
ON manifest_items FOR DELETE
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

COMMENT ON POLICY "public_insert_demo_manifest_items" ON manifest_items IS 'Allow anon insert for demo manifest (Dev Bypass)';

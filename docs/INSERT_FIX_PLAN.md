# Implementation Plan: Functioning Manifest Insertion

## 🚨 Problem
`500 Internal Server Error` on `POST /manifest/items`
The API fails to insert new manifest items for the demo contract (`0000...002`). This is caused by RLS policies that only allow `SELECT` for anonymous users (Migration 002).

## 🛠️ Proposed Changes

### Database Migration
Create `supabase/migrations/012_allow_manifest_write.sql`.

#### Schema Update
1.  **Table**: `manifest_items`
2.  **Action**: Add `INSERT`, `UPDATE`, `DELETE` policies for demo contract.
3.  **Target**: Anonymous users (development mode).

### SQL Content
```sql
-- Migration 012: Allow Manifest Write for Demo
-- Created: 2026-02-04

-- INSERT
CREATE POLICY "public_insert_demo_manifest_items"
ON manifest_items FOR INSERT
TO anon
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- UPDATE
CREATE POLICY "public_update_demo_manifest_items"
ON manifest_items FOR UPDATE
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid)
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- DELETE
CREATE POLICY "public_delete_demo_manifest_items"
ON manifest_items FOR DELETE
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

COMMENT ON POLICY "public_insert_demo_manifest_items" ON manifest_items IS 'Allow anon insert for demo manifest';
```

## ✅ Verification
1.  **Apply Migration**.
2.  **Manual Test**: User successfully creates a new manifest item via UI.


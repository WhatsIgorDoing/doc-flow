# Implementation Plan: Fix Validated Documents Persistence

## 🚨 Problem
**1. Empty Resolution List:**
The dashboard shows "Unrecognized: 1", but the resolution list is empty.
**Cause:** The application successfully processes the file in memory, but **silently fails** to save it to the database because RLS blocks `INSERT` on `validated_documents`. The code does not check `error` from the Supabase `insert()` call.

**2. WebSocket Error:**
Persistent connection warning.
**Cause:** Network/Env limitations. Low priority but annoying.

## 🛠️ Proposed Changes

### 1. Database Migration (Critical)
Create `supabase/migrations/013_allow_validated_docs_write.sql`.
Allow `INSERT` and `UPDATE` on `validated_documents` for the demo contract.

```sql
-- Migration 013: Allow Write for Validated Documents
-- Created: 2026-02-04

-- INSERT
CREATE POLICY "public_insert_demo_validated_documents"
ON validated_documents FOR INSERT
TO anon
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- UPDATE
CREATE POLICY "public_update_demo_validated_documents"
ON validated_documents FOR UPDATE
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid)
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);
```

### 2. Code Hardening
Update `validation-service.ts` to **throw error** if insert fails. This prevents "phantom success" states.

```typescript
const { error } = await supabase.from('validated_documents').insert({...});
if (error) throw new Error(`Failed to save document: ${error.message}`);
```

## ✅ Verification
1.  **Apply Migration**.
2.  **Retry Validation**: Upload a file.
3.  **Check List**: The document should now appear in the Resolution page.


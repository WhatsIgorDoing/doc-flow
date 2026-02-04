# Implementation Plan: Fix Validation RLS for Demo Contract

## 🚨 Problem
`Error: new row violates row-level security policy for table "validation_jobs"`
The application cannot create validation jobs for the demo contract (`00000000-0000-0000-0000-000000000002`) because the default RLS policies only allow authenticated users with specific permissions. In development/demo mode, we need to allow anonymous access to this specific contract.

## 🛠️ Proposed Changes

### Database Migration
Create `supabase/migrations/010_dev_bypass_validation.sql` to explicitly allow access to demo data for the new tables.

#### Tables to Update
1.  `validation_jobs`
    *   `SELECT`: Allow for demo contract.
    *   `INSERT`: Allow for demo contract.
    *   `UPDATE`: Allow for demo contract.
2.  `extraction_results`
    *   `SELECT`: Allow for demo contract documents.
    *   `INSERT`: Allow for demo contract documents.

### SQL Content
```sql
-- Validation Jobs: Allow public access for demo contract
CREATE POLICY "public_access_demo_validation_jobs"
ON validation_jobs FOR ALL
TO anon
USING (contract_id = '00000000-0000-0000-0000-000000000002'::uuid)
WITH CHECK (contract_id = '00000000-0000-0000-0000-000000000002'::uuid);

-- Extraction Results: Allow public access via join (or simplified for demo)
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
```

## ✅ Verification
1.  **Manual Test**: User tries to upload/validate files again.
2.  **Success Criteria**: HTTP 200 on `POST /api/validation/.../validate`.

## ⚠️ Notes
This is strictly for the *demo* contract and does not compromise production security for real contracts.

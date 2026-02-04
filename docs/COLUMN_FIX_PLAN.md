# Implementation Plan: Add Missing Numbering Column

## 🚨 Problem
`Error: Could not find the 'numbering' column of 'manifest_items' in the schema cache`
The frontend (`ManifestItemDialog.tsx`) expects a `numbering` field for manifest items, but the database table `manifest_items` does not have this column defined in the initial schema (`001_phase1_schema.sql`).

## 🛠️ Proposed Changes

### Database Migration
Create `supabase/migrations/011_add_numbering_column.sql`.

#### Schema Update
1.  **Table**: `manifest_items`
2.  **Action**: Add column `numbering` (TEXT).
3.  **Constraint**: Nullable initially (to support existing data), but business logic might require it later.
4.  **Index**: Add index if used for sorting/lookup (likely).

### SQL Content
```sql
-- Migration 011: Add Numbering to Manifest Items
-- Created: 2026-02-04

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'manifest_items' AND column_name = 'numbering') THEN
        ALTER TABLE manifest_items ADD COLUMN numbering TEXT;
        CREATE INDEX idx_manifest_items_numbering ON manifest_items(numbering);
    END IF;
END $$;

COMMENT ON COLUMN manifest_items.numbering IS 'Sequential numbering or external ID for the manifest item';
```

## ✅ Verification
1.  **Apply Migration**.
2.  **Reload Schema Cache** (Supabase Dashboard or just retry app usage).
3.  **Manual Test**: Open "Manifest" tab -> "New Item" -> Check if form submits without error.


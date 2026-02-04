-- Migration 011: Add Numbering to Manifest Items
-- Created: 2026-02-04
-- Purpose: Add 'numbering' column required by frontend

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'manifest_items' AND column_name = 'numbering') THEN
        ALTER TABLE manifest_items ADD COLUMN numbering TEXT;
        CREATE INDEX IF NOT EXISTS idx_manifest_items_numbering ON manifest_items(numbering);
    END IF;
END $$;

COMMENT ON COLUMN manifest_items.numbering IS 'Sequential numbering or external ID for the manifest item';

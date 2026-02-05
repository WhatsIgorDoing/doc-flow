-- Migration 018: Add Hybrid Schema Columns to Manifest Items
-- Created: 2026-02-05
-- Purpose: Promote critical fields to native columns for performance/filtering

DO $$ 
BEGIN
    -- 1. Add 'unit' (Unidade/Área)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifest_items' AND column_name = 'unit') THEN
        ALTER TABLE manifest_items ADD COLUMN unit TEXT;
        CREATE INDEX idx_manifest_unit ON manifest_items(unit);
    END IF;

    -- 2. Add 'actual_delivery_date' (Data Efetiva de Emissão)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifest_items' AND column_name = 'actual_delivery_date') THEN
        ALTER TABLE manifest_items ADD COLUMN actual_delivery_date DATE;
    END IF;
    
    -- 3. Add 'external_status' (Status do Cliente/SIGEM)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifest_items' AND column_name = 'external_status') THEN
        ALTER TABLE manifest_items ADD COLUMN external_status TEXT;
    END IF;

    -- 4. Add 'discipline_code' (Optional, for N-1710/Discipline full string)
    -- Decided to keep in metadata for now as 'discipline' enum exists, 
    -- but user asked for mapping flexibility.
    
    COMMENT ON COLUMN manifest_items.unit IS 'Unit/Area identifier (e.g., U-22)';
    COMMENT ON COLUMN manifest_items.actual_delivery_date IS 'Actual issuance date for KPI calculations';
    COMMENT ON COLUMN manifest_items.external_status IS 'Status of the document in the external system (e.g., SIGEM)';

END $$;

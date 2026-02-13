-- Migration 006: Validation Batches
-- Fase 4 - Organização de Lotes

-- Create validation_batches table
CREATE TABLE IF NOT EXISTS validation_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    validated_at TIMESTAMPTZ DEFAULT NOW(),
    total_items INTEGER DEFAULT 0,
    valid_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    created_by UUID, -- Will link to users when auth is ready
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contract_id, name)
);

-- Add batch_id reference to validated_documents (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'validated_documents' 
        AND column_name = 'batch_id'
    ) THEN
        ALTER TABLE validated_documents 
        ADD COLUMN batch_id UUID REFERENCES validation_batches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_batches_contract 
ON validation_batches(contract_id, validated_at DESC);

CREATE INDEX IF NOT EXISTS idx_validated_documents_batch 
ON validated_documents(batch_id);

CREATE INDEX IF NOT EXISTS idx_validated_documents_contract_batch 
ON validated_documents(contract_id, batch_id);

-- Trigger to auto-update batch stats
CREATE OR REPLACE FUNCTION update_batch_stats()
RETURNS TRIGGER AS $$
DECLARE
    target_batch_id UUID;
BEGIN
    -- Determine which batch_id to update
    IF TG_OP = 'DELETE' THEN
        target_batch_id := OLD.batch_id;
    ELSE
        target_batch_id := NEW.batch_id;
    END IF;
    
    -- Skip if no batch_id
    IF target_batch_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Update counts for the batch
    UPDATE validation_batches
    SET 
        total_items = (
            SELECT COUNT(*) 
            FROM validated_documents 
            WHERE batch_id = target_batch_id
        ),
        valid_count = (
            SELECT COUNT(*) 
            FROM validated_documents 
            WHERE batch_id = target_batch_id
            AND status = 'valid'
        ),
        invalid_count = (
            SELECT COUNT(*) 
            FROM validated_documents 
            WHERE batch_id = target_batch_id
            AND status = 'invalid'
        ),
        pending_count = (
            SELECT COUNT(*) 
            FROM validated_documents 
            WHERE batch_id = target_batch_id
            AND status = 'pending'
        ),
        updated_at = NOW()
    WHERE id = target_batch_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validated_documents_batch_stats ON validated_documents;

CREATE TRIGGER validated_documents_batch_stats
AFTER INSERT OR UPDATE OR DELETE ON validated_documents
FOR EACH ROW
EXECUTE FUNCTION update_batch_stats();

-- Enable realtime (optional, for future use)
ALTER PUBLICATION supabase_realtime ADD TABLE validation_batches;

-- Comments
COMMENT ON TABLE validation_batches IS 'Organiza documentos validados em lotes por data/objetivo';
COMMENT ON COLUMN validation_batches.total_items IS 'Auto-calculated via trigger';
COMMENT ON COLUMN validation_batches.valid_count IS 'Auto-calculated via trigger';
COMMENT ON COLUMN validation_batches.invalid_count IS 'Auto-calculated via trigger';

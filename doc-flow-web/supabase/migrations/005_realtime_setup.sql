-- Migration 005: Real-time Setup
-- Enable Supabase Realtime for validated_documents table

-- Enable realtime on validated_documents
ALTER PUBLICATION supabase_realtime ADD TABLE validated_documents;

-- Function to broadcast validation changes
CREATE OR REPLACE FUNCTION broadcast_validation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be picked up by Realtime subscriptions
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-broadcast on changes
CREATE TRIGGER validated_documents_realtime
AFTER INSERT OR UPDATE ON validated_documents
FOR EACH ROW
EXECUTE FUNCTION broadcast_validation_change();

-- Add index for better realtime performance
CREATE INDEX IF NOT EXISTS idx_validated_documents_contract_updated 
ON validated_documents(contract_id, updated_at DESC);

-- Enable realtime on manifest_items as well (for future use)
ALTER PUBLICATION supabase_realtime ADD TABLE manifest_items;

COMMENT ON TRIGGER validated_documents_realtime ON validated_documents IS 
'Broadcasts changes to Supabase Realtime subscribers';

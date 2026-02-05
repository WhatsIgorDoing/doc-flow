-- Migration 016: Add Original Filename
-- Stores the original filename before OCR correction

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'validated_documents' 
        AND column_name = 'original_filename'
    ) THEN
        ALTER TABLE validated_documents 
        ADD COLUMN original_filename TEXT;
        
        COMMENT ON COLUMN validated_documents.original_filename IS 'Original filename before automatic OCR correction';
    END IF;
END $$;

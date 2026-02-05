-- Add discipline and original_sheet_name to manifest_items
ALTER TABLE manifest_items
ADD COLUMN discipline text CHECK (discipline IN ('quality', 'commissioning', 'cv')),
ADD COLUMN original_sheet_name text;

-- Add comment
COMMENT ON COLUMN manifest_items.discipline IS 'Discipline type for template selection (quality, commissioning, cv)';

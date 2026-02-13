-- Migration 007: Analytics Views and Materialized Views
-- Fase 6 - Analytics + Relatórios

-- View: Contract Analytics Summary
CREATE OR REPLACE VIEW contract_analytics AS
SELECT 
    c.id as contract_id,
    c.code as contract_code,
    c.name as contract_name,
    c.company_id,
    comp.name as company_name,
    
    -- Document counts
    COUNT(DISTINCT vd.id) as total_documents,
    COUNT(DISTINCT vd.id) FILTER (WHERE vd.status = 'VALIDATED') as valid_documents,
    COUNT(DISTINCT vd.id) FILTER (WHERE vd.status = 'UNRECOGNIZED') as unrecognized_documents,
    COUNT(DISTINCT vd.id) FILTER (WHERE vd.status = 'ERROR') as error_documents,
    COUNT(DISTINCT vd.id) FILTER (WHERE vd.status = 'PENDING') as pending_documents,
    
    -- Batch counts
    COUNT(DISTINCT vb.id) as total_batches,
    
    -- Manifest counts
    COUNT(DISTINCT mi.id) as manifest_items_count,
    
    -- Dates
    MIN(vd.validation_date) as first_validation_date,
    MAX(vd.validation_date) as last_validation_date,
    
    -- Validation rate
    CASE 
        WHEN COUNT(vd.id) > 0 THEN 
            ROUND((COUNT(vd.id) FILTER (WHERE vd.status = 'VALIDATED')::numeric / 
                   COUNT(vd.id)::numeric) * 100, 2)
        ELSE 0 
    END as validation_rate_percent
    
FROM contracts c
LEFT JOIN companies comp ON c.company_id = comp.id
LEFT JOIN validated_documents vd ON vd.contract_id = c.id
LEFT JOIN validation_batches vb ON vb.contract_id = c.id
LEFT JOIN manifest_items mi ON mi.contract_id = c.id
GROUP BY c.id, c.code, c.name, c.company_id, comp.name;

-- View: Daily Validation Stats
CREATE OR REPLACE VIEW daily_validation_stats AS
SELECT 
    contract_id,
    DATE(validation_date) as validation_date,
    COUNT(*) as documents_validated,
    COUNT(*) FILTER (WHERE status = 'VALIDATED') as valid_count,
    COUNT(*) FILTER (WHERE status = 'UNRECOGNIZED') as unrecognized_count,
    COUNT(*) FILTER (WHERE status = 'ERROR') as error_count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count
FROM validated_documents
WHERE validation_date IS NOT NULL
GROUP BY contract_id, DATE(validation_date)
ORDER BY validation_date DESC;

-- View: Batch Performance
CREATE OR REPLACE VIEW batch_performance AS
SELECT 
    vb.id as batch_id,
    vb.contract_id,
    vb.name as batch_name,
    vb.validated_at,
    vb.total_items,
    vb.valid_count,
    vb.invalid_count,
    vb.pending_count,
    
    -- Performance metrics
    CASE 
        WHEN vb.total_items > 0 THEN 
            ROUND((vb.valid_count::numeric / vb.total_items::numeric) * 100, 2)
        ELSE 0 
    END as success_rate_percent,
    
    -- Documents per batch
    ARRAY_AGG(vd.filename) FILTER (WHERE vd.status = 'ERROR') as error_files
    
FROM validation_batches vb
LEFT JOIN validated_documents vd ON vd.batch_id = vb.id
GROUP BY vb.id, vb.contract_id, vb.name, vb.validated_at, 
         vb.total_items, vb.valid_count, vb.invalid_count, vb.pending_count;

-- View: Top Error Documents (Most common errors)
CREATE OR REPLACE VIEW top_validation_errors AS
SELECT 
    contract_id,
    filename,
    status,
    error_message,
    COUNT(*) as occurrence_count,
    MAX(validation_date) as last_occurrence
FROM validated_documents
WHERE status = 'ERROR' 
  AND error_message IS NOT NULL
GROUP BY contract_id, filename, status, error_message
ORDER BY occurrence_count DESC
LIMIT 100;

-- Function: Get monthly stats for contract
DROP FUNCTION IF EXISTS get_monthly_validation_stats(UUID, DATE);

CREATE OR REPLACE FUNCTION get_monthly_validation_stats(p_contract_id UUID, p_month DATE)
RETURNS TABLE (
    stat_date DATE,
    total_validated INTEGER,
    valid_count INTEGER,
    unrecognized_count INTEGER,
    error_count INTEGER,
    pending_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(validation_date) as stat_date,
        COUNT(*)::INTEGER as total_validated,
        COUNT(*) FILTER (WHERE status = 'VALIDATED')::INTEGER as valid_count,
        COUNT(*) FILTER (WHERE status = 'UNRECOGNIZED')::INTEGER as unrecognized_count,
        COUNT(*) FILTER (WHERE status = 'ERROR')::INTEGER as error_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::INTEGER as pending_count
    FROM validated_documents
    WHERE contract_id = p_contract_id
      AND DATE_TRUNC('month', validation_date) = DATE_TRUNC('month', p_month)
    GROUP BY DATE(validation_date)
    ORDER BY stat_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON VIEW contract_analytics IS 'Aggregated analytics for each contract';
COMMENT ON VIEW daily_validation_stats IS 'Daily breakdown of validation activity';
COMMENT ON VIEW batch_performance IS 'Performance metrics for each validation batch';
COMMENT ON FUNCTION get_monthly_validation_stats IS 'Monthly validation statistics for a contract';

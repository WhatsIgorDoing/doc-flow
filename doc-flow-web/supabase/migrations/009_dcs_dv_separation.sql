-- Migration 009: DCS/DV Conceptual Separation
-- Data: 2026-02-04
-- Baseado em: ADR-001 (docs/adr/001-dcs-dv-separation.md)
--
-- Esta migration adiciona suporte para a separação arquitetural
-- entre Document Control System (DCS) e Document Validator (DV).

-- ============================================================================
-- 1. ADICIONAR COLUNAS GRDT NO MANIFEST_ITEMS
-- ============================================================================
-- O DV preenche estas colunas via evento grdt.assigned

ALTER TABLE manifest_items 
ADD COLUMN IF NOT EXISTS grdt_number TEXT;

ALTER TABLE manifest_items 
ADD COLUMN IF NOT EXISTS grdt_assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_manifest_items_grdt 
ON manifest_items(grdt_number) WHERE grdt_number IS NOT NULL;

COMMENT ON COLUMN manifest_items.grdt_number IS 'Número da GRDT atribuída pelo Document Validator';
COMMENT ON COLUMN manifest_items.grdt_assigned_at IS 'Data/hora da atribuição da GRDT';

-- ============================================================================
-- 2. CRIAR TABELA DE VALIDATION JOBS
-- ============================================================================
-- Jobs de validação são gerenciados pelo DV

CREATE TABLE IF NOT EXISTS validation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    
    -- Progress tracking
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    
    -- Result counts
    validated_count INTEGER DEFAULT 0,
    needs_suffix_count INTEGER DEFAULT 0,
    unrecognized_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Errors
    error_message TEXT,
    error_details JSONB,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_validation_jobs_contract 
ON validation_jobs(contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_jobs_status 
ON validation_jobs(status) WHERE status IN ('pending', 'processing');

COMMENT ON TABLE validation_jobs IS 'Jobs de validação - gerenciado pelo Document Validator';

-- ============================================================================
-- 3. CRIAR TABELA DE EXTRACTION RESULTS
-- ============================================================================
-- Resultados de OCR/extração de texto

CREATE TABLE IF NOT EXISTS extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validated_document_id UUID NOT NULL REFERENCES validated_documents(id) ON DELETE CASCADE,
    
    -- Extraction data
    extracted_text TEXT,
    extracted_code TEXT,
    confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    
    -- Method used
    method TEXT CHECK (method IN ('PDF_PARSE', 'DOCX_PARSE', 'OCR', 'MANUAL')),
    
    -- Patterns that matched
    patterns_matched JSONB DEFAULT '[]'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_results_document 
ON extraction_results(validated_document_id);

CREATE INDEX IF NOT EXISTS idx_extraction_results_code 
ON extraction_results(extracted_code) WHERE extracted_code IS NOT NULL;

COMMENT ON TABLE extraction_results IS 'Resultados de extração OCR - gerenciado pelo Document Validator';

-- ============================================================================
-- 4. ADICIONAR COLUNA GRDT_NUMBER EM VALIDATION_BATCHES
-- ============================================================================

ALTER TABLE validation_batches 
ADD COLUMN IF NOT EXISTS grdt_number TEXT;

CREATE INDEX IF NOT EXISTS idx_validation_batches_grdt 
ON validation_batches(grdt_number) WHERE grdt_number IS NOT NULL;

COMMENT ON COLUMN validation_batches.grdt_number IS 'Número único da GRDT (Guia de Remessa de Documentos Técnicos)';

-- ============================================================================
-- 5. VIEWS PARA QUERIES CROSS-DOMAIN
-- ============================================================================

-- View: Manifest items com informações de GRDT (para DCS)
CREATE OR REPLACE VIEW dcs_manifest_with_grdt AS
SELECT 
    mi.id,
    mi.contract_id,
    mi.document_code,
    mi.revision,
    mi.title,
    mi.document_type,
    mi.category,
    mi.expected_delivery_date,
    mi.responsible_email,
    mi.grdt_number,
    mi.grdt_assigned_at,
    vd.id as validated_document_id,
    vd.status as validation_status,
    vd.validation_date,
    vd.filename as validated_filename
FROM manifest_items mi
LEFT JOIN validated_documents vd ON vd.manifest_item_id = mi.id;

COMMENT ON VIEW dcs_manifest_with_grdt IS 'DCS view: itens do manifesto com status de validação do DV';

-- View: Resumo de GRDTs (para dashboard)
CREATE OR REPLACE VIEW dv_grdt_summary AS
SELECT 
    vb.id as grdt_id,
    vb.contract_id,
    vb.name as grdt_name,
    vb.grdt_number,
    vb.description,
    vb.total_items,
    vb.valid_count,
    vb.invalid_count,
    vb.pending_count,
    vb.validated_at,
    vb.created_at,
    vb.created_by,
    c.name as contract_name,
    c.code as contract_code,
    comp.name as company_name
FROM validation_batches vb
JOIN contracts c ON c.id = vb.contract_id
JOIN companies comp ON comp.id = c.company_id;

COMMENT ON VIEW dv_grdt_summary IS 'DV view: resumo de GRDTs com info de contrato';

-- View: Status de validação por contrato
CREATE OR REPLACE VIEW dv_contract_validation_stats AS
SELECT 
    contract_id,
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE status = 'VALIDATED') as validated_count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
    COUNT(*) FILTER (WHERE status = 'UNRECOGNIZED') as unrecognized_count,
    COUNT(*) FILTER (WHERE status = 'ERROR') as error_count,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'VALIDATED')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 
        2
    ) as validation_rate
FROM validated_documents
GROUP BY contract_id;

COMMENT ON VIEW dv_contract_validation_stats IS 'Estatísticas de validação por contrato';

-- ============================================================================
-- 6. FUNÇÃO PARA GERAR NÚMERO DE GRDT
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_grdt_number(p_contract_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_contract_code TEXT;
    v_year TEXT;
    v_sequence INT;
    v_grdt_number TEXT;
BEGIN
    -- Buscar código do contrato
    SELECT code INTO v_contract_code 
    FROM contracts 
    WHERE id = p_contract_id;
    
    -- Ano atual
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Próximo número sequencial para este contrato neste ano
    SELECT COALESCE(MAX(
        CAST(
            SPLIT_PART(grdt_number, '-', 4) AS INTEGER
        )
    ), 0) + 1
    INTO v_sequence
    FROM validation_batches
    WHERE contract_id = p_contract_id
    AND grdt_number LIKE '%' || v_year || '-%';
    
    -- Formato: eGRDT-{CONTRACT_CODE}-{YEAR}-{SEQ}
    v_grdt_number := 'eGRDT-' || v_contract_code || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_grdt_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_grdt_number IS 'Gera número único de GRDT no formato eGRDT-{CODE}-{YEAR}-{SEQ}';

-- ============================================================================
-- 7. RLS POLICIES PARA NOVAS TABELAS
-- ============================================================================

-- Validation Jobs: Mesmas regras de contracts
ALTER TABLE validation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "validation_jobs_select_accessible"
ON validation_jobs FOR SELECT
USING (
    contract_id IN (
        SELECT id FROM contracts 
        WHERE id IN (SELECT contract_id FROM contract_permissions WHERE user_id = auth.uid())
        OR company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() AND role IN ('company_manager', 'super_admin')
        )
    )
);

CREATE POLICY "validation_jobs_insert_with_permission"
ON validation_jobs FOR INSERT
WITH CHECK (
    contract_id IN (
        SELECT contract_id FROM contract_permissions 
        WHERE user_id = auth.uid() 
        AND (permissions->>'can_validate')::boolean = true
    )
    OR auth.uid() IN (SELECT id FROM users WHERE role IN ('company_manager', 'super_admin'))
);

-- Extraction Results: Mesmas regras de validated_documents
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extraction_results_select_accessible"
ON extraction_results FOR SELECT
USING (
    validated_document_id IN (
        SELECT id FROM validated_documents
        WHERE contract_id IN (
            SELECT id FROM contracts 
            WHERE id IN (SELECT contract_id FROM contract_permissions WHERE user_id = auth.uid())
            OR company_id IN (
                SELECT company_id FROM users 
                WHERE id = auth.uid() AND role IN ('company_manager', 'super_admin')
            )
        )
    )
);

-- ============================================================================
-- 8. ATUALIZAR COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE validation_batches IS 'GRDTs (Guias de Remessa de Documentos Técnicos) - gerenciado pelo DV';
COMMENT ON TABLE validated_documents IS 'Documentos validados - gerenciado pelo DV';
COMMENT ON TABLE manifest_items IS 'Itens do manifesto - gerenciado pelo DCS, recebe GRDT do DV';
COMMENT ON TABLE contracts IS 'Contratos - gerenciado pelo DCS';

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Doc Flow Schema - DCS/DV Separation (Migration 009) - 2026-02-04';

-- Phase 1 Migration: Supabase Schema
-- SAD App (doc-flow) - Web Migration
-- Created: 2026-02-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- 1. COMPANIES (Multi-tenant foundation)
-- ============================================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_companies_slug ON companies(slug);

COMMENT ON TABLE companies IS 'Multi-tenant companies using the platform';

-- ============================================================================
-- 2. CONTRACTS (Projects per company)
-- ============================================================================
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(company_id, code)
);

CREATE INDEX idx_contracts_company ON contracts(company_id);
CREATE INDEX idx_contracts_status ON contracts(status);

COMMENT ON TABLE contracts IS 'Projects/contracts within a company';

-- ============================================================================
-- 3. USERS (Integrated with Supabase Auth)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (
        role IN ('super_admin', 'company_manager', 'contract_lead', 'controller', 'collaborator', 'viewer')
    ),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth';

-- ============================================================================
-- 4. CONTRACT PERMISSIONS (User-Contract many-to-many)
-- ============================================================================
CREATE TABLE contract_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (
        role IN ('contract_lead', 'controller', 'collaborator', 'viewer')
    ),
    permissions JSONB DEFAULT '{
        "can_validate": true,
        "can_organize": false,
        "can_delete": false,
        "can_export": true
    }'::jsonb,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    
    UNIQUE(user_id, contract_id)
);

CREATE INDEX idx_contract_permissions_user ON contract_permissions(user_id);
CREATE INDEX idx_contract_permissions_contract ON contract_permissions(contract_id);

COMMENT ON TABLE contract_permissions IS 'Granular permissions per user per contract';

-- ============================================================================
-- 5. MANIFEST ITEMS (Source of truth for expected documents)
-- ============================================================================
CREATE TABLE manifest_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    document_code TEXT NOT NULL,
    revision TEXT,
    title TEXT,
    document_type TEXT,
    category TEXT,
    expected_delivery_date DATE,
    responsible_email TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(contract_id, document_code)
);

CREATE INDEX idx_manifest_contract ON manifest_items(contract_id);
CREATE INDEX idx_manifest_code ON manifest_items(document_code);
CREATE INDEX idx_manifest_type ON manifest_items(document_type);

COMMENT ON TABLE manifest_items IS 'Expected documents from manifest files';

-- ============================================================================
-- 6. VALIDATED DOCUMENTS (Validation results)
-- ============================================================================
CREATE TABLE validated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    manifest_item_id UUID REFERENCES manifest_items(id) ON DELETE SET NULL,
    
    -- File metadata
    filename TEXT NOT NULL,
    file_size BIGINT,
    file_hash TEXT,
    storage_path TEXT,
    
    -- Status
    status TEXT NOT NULL CHECK (
        status IN ('VALIDATED', 'UNRECOGNIZED', 'ERROR', 'PENDING')
    ),
    validation_date TIMESTAMPTZ DEFAULT NOW(),
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Grouping
    lot_number TEXT,
    grd_number TEXT,
    batch_id UUID,
    
    -- Errors
    error_message TEXT,
    error_details JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validated_contract ON validated_documents(contract_id);
CREATE INDEX idx_validated_manifest ON validated_documents(manifest_item_id);
CREATE INDEX idx_validated_status ON validated_documents(status);
CREATE INDEX idx_validated_lot ON validated_documents(lot_number);
CREATE INDEX idx_validated_batch ON validated_documents(batch_id);
CREATE INDEX idx_validated_date ON validated_documents(validation_date DESC);

COMMENT ON TABLE validated_documents IS 'Validated documents with status and metadata';

-- ============================================================================
-- 7. AUDIT LOG (Immutable event log)
-- ============================================================================
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_contract ON audit_log(contract_id);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

COMMENT ON TABLE audit_log IS 'Immutable audit log for all user actions';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE validated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Companies: Users see their own company
CREATE POLICY "users_select_own_company"
ON companies FOR SELECT
USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);

-- Users: See own profile + company members
CREATE POLICY "users_select_accessible"
ON users FOR SELECT
USING (
    id = auth.uid() 
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);

-- Contracts: See contracts with permissions
CREATE POLICY "contracts_select_with_access"
ON contracts FOR SELECT
USING (
    id IN (SELECT contract_id FROM contract_permissions WHERE user_id = auth.uid())
    OR company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('company_manager', 'super_admin')
    )
);

-- Contract Permissions: See own permissions
CREATE POLICY "contract_permissions_select_own"
ON contract_permissions FOR SELECT
USING (user_id = auth.uid());

-- Manifest Items: See items from accessible contracts
CREATE POLICY "manifest_items_select_accessible"
ON manifest_items FOR SELECT
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

-- Validated Documents: See documents from accessible contracts
CREATE POLICY "validated_documents_select_accessible"
ON validated_documents FOR SELECT
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

-- Audit Log: See logs for accessible contracts
CREATE POLICY "audit_log_select_accessible"
ON audit_log FOR SELECT
USING (
    user_id = auth.uid()
    OR contract_id IN (
        SELECT id FROM contracts 
        WHERE id IN (SELECT contract_id FROM contract_permissions WHERE user_id = auth.uid())
    )
    OR auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin')
);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manifest_items_updated_at
    BEFORE UPDATE ON manifest_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validated_documents_updated_at
    BEFORE UPDATE ON validated_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Development)
-- ============================================================================

-- Insert demo company
INSERT INTO companies (id, name, slug, settings) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'demo-company', '{}');

-- Insert demo contract
INSERT INTO contracts (id, company_id, name, code, description, status) VALUES
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 
     'Contrato de Exemplo', 'DEMO-001', 'Contrato para testes', 'active');

COMMENT ON SCHEMA public IS 'Phase 1 Migration Schema - Created 2026-02-02';

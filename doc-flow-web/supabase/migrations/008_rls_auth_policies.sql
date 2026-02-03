-- Migration 008: RLS Policies and Auth Setup
-- Fase 5 - Autenticação + Multi-tenant
-- ⚠️ IMPORTANT: RLS is DISABLED by default. Enable manually after testing.

-- ======================
-- USERS TABLE POLICIES
-- ======================

DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own 
ON users FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- ======================
-- COMPANIES TABLE POLICIES
-- ======================

DROP POLICY IF EXISTS companies_select_own ON companies;
CREATE POLICY companies_select_own 
ON companies FOR SELECT 
USING (
    id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid()
    )
);

-- ======================
-- CONTRACTS TABLE POLICIES
-- ======================

DROP POLICY IF EXISTS contracts_select_company ON contracts;
CREATE POLICY contracts_select_company 
ON contracts FOR SELECT 
USING (
    company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS contracts_insert_company ON contracts;
CREATE POLICY contracts_insert_company 
ON contracts FOR INSERT 
WITH CHECK (
    company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS contracts_update_company ON contracts;
CREATE POLICY contracts_update_company 
ON contracts FOR UPDATE 
USING (
    company_id IN (
        SELECT company_id 
        FROM users 
        WHERE id = auth.uid()
    )
);

-- ======================
-- VALIDATED_DOCUMENTS POLICIES
-- ======================

DROP POLICY IF EXISTS validated_documents_select_company ON validated_documents;
CREATE POLICY validated_documents_select_company 
ON validated_documents FOR SELECT 
USING (
    contract_id IN (
        SELECT c.id 
        FROM contracts c
        INNER JOIN users u ON u.company_id = c.company_id
        WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS validated_documents_insert_company ON validated_documents;
CREATE POLICY validated_documents_insert_company 
ON validated_documents FOR INSERT 
WITH CHECK (
    contract_id IN (
        SELECT c.id 
        FROM contracts c
        INNER JOIN users u ON u.company_id = c.company_id
        WHERE u.id = auth.uid()
    )
);

-- ======================
-- MANIFEST_ITEMS POLICIES
-- ======================

DROP POLICY IF EXISTS manifest_items_select_company ON manifest_items;
CREATE POLICY manifest_items_select_company 
ON manifest_items FOR SELECT 
USING (
    contract_id IN (
        SELECT c.id 
        FROM contracts c
        INNER JOIN users u ON u.company_id = c.company_id
        WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS manifest_items_all_company ON manifest_items;
CREATE POLICY manifest_items_all_company 
ON manifest_items FOR ALL 
USING (
    contract_id IN (
        SELECT c.id 
        FROM contracts c
        INNER JOIN users u ON u.company_id = c.company_id
        WHERE u.id = auth.uid()
    )
);

-- ======================
-- VALIDATION_BATCHES POLICIES
-- ======================

DROP POLICY IF EXISTS validation_batches_select_company ON validation_batches;
CREATE POLICY validation_batches_select_company 
ON validation_batches FOR SELECT 
USING (
    contract_id IN (
        SELECT c.id 
        FROM contracts c
        INNER JOIN users u ON u.company_id = c.company_id
        WHERE u.id = auth.uid()
    )
);

DROP POLICY IF EXISTS validation_batches_all_company ON validation_batches;
CREATE POLICY validation_batches_all_company 
ON validation_batches FOR ALL 
USING (
    contract_id IN (
        SELECT c.id 
        FROM contracts c
        INNER JOIN users u ON u.company_id = c.company_id
        WHERE u.id = auth.uid()
    )
);

-- ======================
-- ENABLE RLS (COMMENTED OUT)
-- ======================

-- ⚠️ UNCOMMENT THESE LINES TO ENABLE RLS (AFTER TESTING)
-- 
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE validated_documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE manifest_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE validation_batches ENABLE ROW LEVEL SECURITY;

-- ======================
-- HELPER FUNCTIONS
-- ======================

-- Function to check if user is admin
DROP FUNCTION IF EXISTS is_admin();
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role = 'admin'
        FROM users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's company_id
DROP FUNCTION IF EXISTS get_user_company_id();
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT company_id
        FROM users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Comments
COMMENT ON POLICY users_select_own ON users IS 'Users can only read their own user record';
COMMENT ON POLICY contracts_select_company ON contracts IS 'Users can only see contracts from their company';
COMMENT ON FUNCTION is_admin IS 'Helper function to check if current user is admin';
COMMENT ON FUNCTION get_user_company_id IS 'Helper function to get current user company';

-- ======================
-- NOTES
-- ======================
-- RLS is currently DISABLED for all tables
-- To enable: Uncomment the ALTER TABLE ... ENABLE ROW LEVEL SECURITY lines
-- Test all functionality before enabling in production
-- Remember: Python API needs SERVICE ROLE key to bypass RLS

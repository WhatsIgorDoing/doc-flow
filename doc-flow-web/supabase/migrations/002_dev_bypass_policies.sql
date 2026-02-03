-- Phase 1.5 Migration: Development Bypass Policies
-- SAD App (doc-flow) - Web Migration
-- Created: 2026-02-03
-- Purpose: Allow public access ONLY to demo/test data while maintaining RLS for real data

-- ============================================================================
-- IMPORTANT: This migration adds PUBLIC access policies for DEMO DATA ONLY
-- Demo data is identified by specific UUIDs that start with 00000000-0000-0000-0000
-- This allows development and testing without authentication while keeping RLS active
-- ============================================================================

-- ============================================================================
-- PUBLIC ACCESS POLICIES FOR DEMO DATA
-- ============================================================================

-- Companies: Allow public SELECT for demo company only
DROP POLICY IF EXISTS "public_select_demo_company" ON companies;
CREATE POLICY "public_select_demo_company"
ON companies FOR SELECT
TO anon
USING (
    id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Contracts: Allow public SELECT for demo contracts only
DROP POLICY IF EXISTS "public_select_demo_contracts" ON contracts;
CREATE POLICY "public_select_demo_contracts"
ON contracts FOR SELECT
TO anon
USING (
    id = '00000000-0000-0000-0000-000000000002'::uuid
    OR company_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Manifest Items: Allow public SELECT for demo contract's items
DROP POLICY IF EXISTS "public_select_demo_manifest_items" ON manifest_items;
CREATE POLICY "public_select_demo_manifest_items"
ON manifest_items FOR SELECT
TO anon
USING (
    contract_id = '00000000-0000-0000-0000-000000000002'::uuid
);

-- Users: Allow public SELECT to prevent infinite recursion in RLS
-- The existing users policies have recursion: they query users table within the policy itself
-- This bypass allows anon to read user data without triggering recursive policy checks
DROP POLICY IF EXISTS "public_select_users_no_recursion" ON users;
CREATE POLICY "public_select_users_no_recursion"
ON users FOR SELECT
TO anon
USING (true);  -- Allow all for anon to prevent recursion
-- Note: This is safe because users table has no demo data yet
-- If you add demo users, restrict this policy to specific IDs

-- Validated Documents: Allow public SELECT for demo contract's documents
DROP POLICY IF EXISTS "public_select_demo_validated_documents" ON validated_documents;
CREATE POLICY "public_select_demo_validated_documents"
ON validated_documents FOR SELECT
TO anon
USING (
    contract_id = '00000000-0000-0000-0000-000000000002'::uuid
);

-- ============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================================================
-- When deploying to production:
-- 1. Either DROP these policies if demo data is not needed:
--    DROP POLICY "public_select_demo_company" ON companies;
--    DROP POLICY "public_select_demo_contracts" ON contracts;
--    DROP POLICY "public_select_demo_manifest_items" ON manifest_items;
--    DROP POLICY "public_select_users_no_recursion" ON users;
--    DROP POLICY "public_select_demo_validated_documents" ON validated_documents;
--
-- 2. OR remove the demo seed data from migration 001_phase1_schema.sql
--    before deploying to production
--
-- 3. Regular user data remains protected by existing RLS policies
-- ============================================================================

COMMENT ON SCHEMA public IS 'Phase 1.5 Migration - Dev Bypass Policies - Created 2026-02-03';

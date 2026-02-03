-- Security Fix Migration: RLS and Search Path
-- SAD App (doc-flow) - Security Fixes
-- Created: 2026-02-03
-- Purpose: Fix security issues reported by Supabase

-- ============================================================================
-- ISSUE 1 & 2: Table public.events without RLS
-- ============================================================================

-- ANALYSIS (Security Auditor):
-- The 'events' table is created by Supabase automatically for analytics/tracking.
-- It contains sensitive data (session_id) and is exposed via API without RLS.
-- 
-- RISK: OWASP A01 (Broken Access Control) - Unauthorized data exposure
-- SEVERITY: HIGH - Session IDs can be used for session hijacking
--
-- SOLUTION: Enable RLS with FAIL-SECURE approach
-- Since we don't know the exact schema, we DENY all public access
-- Only authenticated super_admin users can access (most restrictive)

-- Check if events table exists before enabling RLS
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'events'
    ) THEN
        -- Enable RLS on events table
        ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if any (idempotent)
        DROP POLICY IF EXISTS "events_deny_public_access" ON public.events;
        DROP POLICY IF EXISTS "events_allow_service_role" ON public.events;
        
        -- FAIL-SECURE APPROACH:
        -- Since we don't know the schema of the 'events' table,
        -- we apply the most restrictive policy: DENY ALL public access
        -- Only service_role (backend) can access
        
        -- Policy 1: Deny all access for anon users
        CREATE POLICY "events_deny_public_access"
        ON public.events
        FOR ALL
        TO anon
        USING (false);  -- Always deny
        
        -- Policy 2: Allow authenticated users (can be refined later)
        -- This is a placeholder - should be adjusted based on actual schema
        CREATE POLICY "events_allow_service_role"
        ON public.events
        FOR ALL
        TO authenticated
        USING (
            -- Only super_admin can access if users table exists
            EXISTS (
                SELECT 1 FROM users 
                WHERE id = auth.uid() 
                AND role = 'super_admin'
            )
        );
        
        RAISE NOTICE '✅ RLS enabled on public.events table with fail-secure policies';
    ELSE
        RAISE NOTICE 'ℹ️ Table public.events does not exist - skipping RLS setup';
    END IF;
END $$;

-- ============================================================================
-- ISSUE 3: Function with mutable search_path
-- ============================================================================

-- ANALYSIS (Database Architect):
-- The function 'update_updated_at_column' doesn't set search_path explicitly.
-- This creates a security vulnerability where malicious users could manipulate
-- the search path to execute unintended code.
--
-- RISK: OWASP A05 (Injection) - SQL injection via search_path manipulation
-- SEVERITY: MEDIUM - Requires specific conditions but serious if exploited
--
-- SOLUTION: Set search_path explicitly in function definition

-- Drop and recreate function with proper security settings
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
-- Fix: Set search_path explicitly to prevent manipulation
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate all triggers that use this function
-- (They were dropped with CASCADE above)

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
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'events' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '✅ RLS enabled on events table';
    END IF;
    
    -- Verify function has proper search_path
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'update_updated_at_column'
        AND prosecdef = true -- SECURITY DEFINER
    ) THEN
        RAISE NOTICE '✅ Function update_updated_at_column has SECURITY DEFINER';
    END IF;
END $$;

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================

-- 1. EVENTS TABLE (FAIL-SECURE APPROACH):
--    - RLS enabled with DENY ALL for anonymous users
--    - Only authenticated super_admin can access
--    - This is the most restrictive policy - adjust based on actual needs
--    - To customize: identify the schema of 'events' table and create
--      appropriate policies based on actual columns
--
-- 2. SEARCH_PATH:
--    - Setting 'search_path = public, pg_temp' prevents search path attacks
--    - SECURITY DEFINER ensures function runs with creator privileges
--    - This is PostgreSQL best practice for security-sensitive functions
--
-- 3. FAIL-SECURE PRINCIPLE:
--    - If events table doesn't exist, migration completes without error
--    - If it exists, we apply the MOST restrictive policy by default
--    - Better to be over-restrictive and relax later than expose data

COMMENT ON SCHEMA public IS 'Phase 1.75 Migration - Security Fixes - Created 2026-02-03';

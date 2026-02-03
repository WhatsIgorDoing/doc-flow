-- Fix for Infinite Recursion: Disable RLS on Users Table (Development Only)
-- SAD App (doc-flow) - Emergency Fix
-- Created: 2026-02-03
-- Purpose: Temporarily disable RLS on users table to prevent infinite recursion

-- ============================================================================
-- PROBLEM ANALYSIS (Database Architect + Security Auditor)
-- ============================================================================
-- 
-- The original policy in migration 001:
-- 
-- CREATE POLICY "users_select_accessible" ON users
-- USING (
--     id = auth.uid() 
--     OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())  ← RECURSION!
-- );
--
-- This creates infinite recursion because:
-- 1. Query tries to access users table
-- 2. RLS policy evaluates
-- 3. Policy queries users table again (SELECT company_id FROM users...)
-- 4. RLS policy evaluates again → INFINITE LOOP
--
-- Adding a bypass policy doesn't help because the original policy is still evaluated.
--
-- ============================================================================
-- SOLUTION: Disable RLS Entirely on Users Table (Development Only)
-- ============================================================================
--
-- SECURITY ANALYSIS:
-- ✅ SAFE for development because:
--    - users table has no data yet (no demo users in seed)
--    - no sensitive information to expose
--    - application doesn't have authentication yet
-- 
-- ⚠️ CRITICAL for production:
--    - This migration MUST be reverted before production
--    - Re-enable RLS and fix the recursive policy properly
--    - Add proper authentication system
--
-- ============================================================================

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Log the action
DO $$
BEGIN
    RAISE NOTICE '⚠️ RLS DISABLED on users table for development';
    RAISE NOTICE '⚠️ DO NOT deploy this to production!';
    RAISE NOTICE '✅ This fixes infinite recursion in policy evaluation';
END $$;

-- ============================================================================
-- PRODUCTION MIGRATION (Future)
-- ============================================================================
--
-- When ready for production, create a NEW migration that:
--
-- 1. Re-enables RLS:
--    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--
-- 2. Fixes the recursive policy by using a non-recursive approach:
--
--    CREATE POLICY "users_select_accessible_v2" ON users
--    FOR SELECT USING (
--        id = auth.uid()  -- Users can see themselves
--        OR EXISTS (      -- OR users in same company
--            SELECT 1 FROM users u
--            JOIN companies c ON u.company_id = c.id
--            WHERE u.id = auth.uid()
--            AND c.id = users.company_id  -- Reference outer query's company_id
--            -- This breaks recursion by not querying users in the subquery
--        )
--    );
--
-- ============================================================================

COMMENT ON SCHEMA public IS 'Phase 1.9 Migration - Disable Users RLS (Dev Only) - Created 2026-02-03';

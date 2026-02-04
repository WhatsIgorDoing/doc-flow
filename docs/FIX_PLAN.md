# Orchestration Plan: Fix Validation Service Fetch Error

## 🚨 Problem
`TypeError: fetch failed` in `ValidationService.getValidatedDocuments`.
This occurs during a server-side API call (`GET /api/validation/[contractId]/documents`), indicating that the Supabase client cannot reach the Supabase instance.

## 🕵️ Analysis
- **Location**: `lib/validator/services/validation-service.ts` line 375.
- **Root Cause**: The `fetch` request made by `@supabase/ssr` (inside `lib/supabase/server.ts`) is failing at the network level.
- **Potential Causes**:
  - Invalid `NEXT_PUBLIC_SUPABASE_URL`.
  - DNS resolution issues (localhost vs 127.0.0.1) in Node 20+.
  - Self-signed certificate rejection (though `NODE_TLS_REJECT_UNAUTHORIZED=0` is set).
  - Network timeout or proxy issues.

## 🛠️ Proposed Changes

### Phase 1: Diagnosis (Backend Specialist)
1. **Enhance Logging**:
   - Modify `lib/validator/services/validation-service.ts` to log specific error cause (`error.cause`).
   - Log the sanitized `NEXT_PUBLIC_SUPABASE_URL` to ensure it's loaded correctly.

### Phase 2: Implementation (Backend Specialist)
1. **Configuration Fix**:
   - If using `localhost`, ensure `127.0.0.1` is used if on Node 18+.
   - Verify `.env.local` loading.
2. **Client Update** (if needed):
   - Modify `lib/supabase/server.ts` to pass explicit `fetch` options if necessary (e.g. `duplex: 'half'` or custom agent).

### Phase 3: Verification (Test Engineer)
1. **Manual Test**:
   - Run `npm run dev`.
   - Hit `GET /api/validation/[contractId]/documents`.
   - Verify 200 OK and data return.

## 👥 Agent Responsibilities
- **Backend Specialist**: Code modification and debugging.
- **Test Engineer**: Verification.
- **Orchestrator**: Coordination.

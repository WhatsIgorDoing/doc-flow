# Implementation Plan: Fix WebSocket Connection

## 🚨 Problem
`WebSocket connection failed`
The client-side Supabase Realtime connection is dropping or failing to establish. This affects live updates (progress bars, status changes) but not the core CRUD operations.

## 🕵️ Analysis
- **Error**: `WebSocket is closed before the connection is established`
- **Context**: Occurring in browser console (Client-side).
- **Likely Causes**:
    1.  Network firewall/proxy blocking WSS.
    2.  SSL verification issues (dev environment).
    3.  Supabase project paused (unlikely if API works).
    4.  Client timeout settings too aggressive.

## 🛠️ Proposed Changes

### 1. Client Configuration Tweak
Modify `lib/supabase/client.ts` to increase timeouts or adjust socket options.

```typescript
// Proposed Config
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      timeout: 20000, // Increase timeout
    }
  }
)
```

### 2. Diagnosis Step
Ask user if they are on a corporate VPN or strict network, which often blocks WebSocket (WSS).

## ✅ Verification
1.  **Manual Test**: Refresh page and check console for persistent WS errors.
2.  **Functional Test**: Trigger validation and see if progress bar moves without refresh.

## ⚠️ Notes
If this is a local network restriction, code changes might not fix it completely.

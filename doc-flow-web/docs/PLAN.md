# Plan: Unifying Explorer & Triage <!-- id: 0 -->
> **Goal:** Merge the Triage functionality into the Explorer screen using a "Focus Mode" (Drawer) approach, creating a unified and efficient workflow.

## User Review Required <!-- id: 1 -->
> [!IMPORTANT]
> This change will **delete** the dedicated `/triage` page. All triage actions will happen inside a side drawer on the `/explorer` page.

## Proposed Changes <!-- id: 2 -->

### 1. Component Architecture <!-- id: 3 -->

#### [NEW] `components/resolution/ResolutionSheet.tsx` <!-- id: 4 -->
- Adapt `ResolutionDialog.tsx` into a `Sheet` (Drawer) component.
- **Props:** `open`, `onOpenChange`, `contractId`, `document`, `onResolved`.
- **Content:** Search, Candidate List (Smart/Manual), Action Buttons (Resolve/Reject).
- **Style:** "Paper & Ink" design, matching the existing Upload sheet.

#### [MODIFY] `components/contract-nav.tsx` <!-- id: 5 -->
- **Remove:** "Triagem" navigation item.
- **Note:** Triage is no longer a place, it's an action.

#### [MODIFY] `app/(dashboard)/contracts/[id]/explorer/documents-table.tsx` <!-- id: 6 -->
- **State:** Add `triageDocument` state (holds the document currently being resolved).
- **Columns:** Add a "Actions" column (or enhance existing) with a "Resolver" button for `UNRECOGNIZED` items.
- **Integration:** Render `ResolutionSheet` controlled by `triageDocument` state.
- **Upload:** Ensure "Importar" button is clearly visible (already present).

#### [DELETE] `app/(dashboard)/contracts/[id]/triage/page.tsx` <!-- id: 7 -->
- Remove the obsolete page.

#### [DELETE] `components/resolution/ResolutionPanel.tsx` <!-- id: 8 -->
- Remove the dashboard-style panel component if no longer used.

### 2. Workflow <!-- id: 9 -->
1. User navigates to **Explorador**.
2. User sees a document with status "Não Reconhecido".
3. User clicks **"Resolver"** button on the row.
4. **ResolutionSheet** slides in from the right.
5. User selects the correct match or rejects the document.
6. Sheet closes, table updates in real-time (via existing invalidation).

## Verification Plan <!-- id: 10 -->

### Manual Verification <!-- id: 11 -->
1. **Upload Flow:** Upload a file via Explorer and verify it appears.
2. **Triage Flow:**
   - Find an unrecognizable document.
   - Click "Resolver".
   - Verify Drawer opens.
   - Perform resolution.
   - Verify Drawer closes and status updates to "Validado".
3. **Responsiveness:** Ensure Drawer works on smaller screens.

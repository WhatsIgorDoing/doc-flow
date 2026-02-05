
# UX/UI Implementation Sprint: "The Polish Phase"

## 🎯 Objective
Execute the recommendations from `UX_AUDIT_REPORT.md` to elevate the application's maturity. This sprint focuses on **Accessibility (A11y)**, **Cognitive Load Reduction**, and **Micro-interactions**.

## 📦 Dependencies strategy
- **Toast**: Use existing `sonner`.
- **Animations**: Use Tailwind `animate-*` and CSS keyframes (no heavy libs).
- **Charts**: Use semantic HTML/CSS bars for lightweight visualization.

---

## 📅 Sprint Phases

### Phase 1: Accessibility & Foundation (Critical)
*Goal: Ensure the app is perceivable and operable for all users (WCAG 2.1).*

#### 1. A11y Fixes (Batches)
- **Target**: `app/(dashboard)/contracts/[id]/batches/page.tsx`
- **Change**: Add `aria-label` to Edit/Delete/Export buttons in the Batch Card.
- **Verification**: Code review check for `aria-label` attributes.

#### 2. Visual Contrast (Dashboard)
- **Target**: `components/validation/validation-dashboard.tsx`
- **Change**: Replace `opacity-50` icons with `bg-{color}-100` + `text-{color}-600` for robust contrast.
- **Verification**: Visual check (simulate low contrast monitor).

---

### Phase 2: Cognitive Flow (Usability)
*Goal: Reduce decision paralysis and improve information scanning.*

#### 3. Unify "Create Batch" Flow (Hick's Law)
- **Target**: `app/(dashboard)/contracts/[id]/batches/page.tsx`
- **Change**:
    - Remove the secondary "Criar Lote com Seleção" button from the `Unassigned Documents` card.
    - Update the main "Novo Lote" button to open `BatchDialog` directly.
    - Inside `BatchDialog`, allow "Select All Available Docs" option if no docs are pre-selected.
    - **Logic**: If docs are selected via checkboxes, the main button text changes to "Criar Lote ({n})".

#### 4. Candidate Grouping (Resolution)
- **Target**: `components/resolution/resolution-dialog.tsx`
- **Change**:
    - Group logic: Split candidates into `Suggestions` (Source = extraction/suggestion) and `Manual Search`.
    - Add sticky headers/separators in the list.
    - Add `Tooltip` to the Confidence Badge explaining the %.

#### 5. Confidence Visualization (Gestalt)
- **Target**: `components/validation/validation-dashboard.tsx`
- **Change**: Replace raw numbers in "Confiança das Validações" with a simple CSS Stacked Bar:
    ```tsx
    <div className="flex h-2 w-full rounded-full overflow-hidden">
        <div style={{ width: 'X%' }} className="bg-green-500" />
        <div style={{ width: 'Y%' }} className="bg-yellow-500" />
        <div style={{ width: 'Z%' }} className="bg-red-500" />
    </div>
    ```

---

### Phase 3: The "Delight" Layer
*Goal: Add personality and reward user progress.*

#### 6. "Zero Inbox" Celebration
- **Target**: `components/validation/validation-dashboard.tsx`
- **Change**: Add a bouncing animation to the CheckCircle when all counts are zero.
- **CSS**: Add custom `@keyframes bounce-subtle` in global CSS or Tailwind config.

#### 7. Humanized Feedback
- **Target**: `components/resolution/resolution-dialog.tsx`
- **Change**: Update `onResolved` generic toast to:
    - High Confidence (>90%): "✨ Match perfeito! Documento associado."
    - Normal: "Documento associado com sucesso."

---

## ✅ Verification Plan

### Automated
- **Lint**: Run `npm run lint` (ensure jsx-a11y rules pass).
- **Audit**: Run `checklist.py` (frontend focus).

### Manual Walkthrough
1.  **Tab Navigation**: Navigate `BatchesPage` using only keyboard (Tab/Enter). Check focus on Edit/Delete buttons.
2.  **Creation Flow**: Select 2 docs -> Click "Criar Lote" -> Verify Dialog opens with 2 docs pre-selected.
3.  **Visuals**: Check Dashboard contrast and "Zero Inbox" state.

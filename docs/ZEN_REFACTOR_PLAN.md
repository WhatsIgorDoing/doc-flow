# Zen Productivity Refactor Plan

## 🎨 Objective
Transform "Doc Flow" into a "World Class" product with a "Paper & Ink" aesthetic, reduced cognitive load, and optimistic UI patterns.

## 🏗️ Architecture & Changes

### 1. Visual Foundation (Tailwind Config)
**Target**: `tailwind.config.ts`
- **Action**: Replace "Apple-inspired" palette with "Paper & Ink" semantic system.
- **New Token System**:
    - `background`: `#F9F9FB` (Rice Paper) - No pure white.
    - `foreground`: `#1A1D23` (Deep Ink) - No pure black.
    - `surface`: `#FFFFFF` + `backdrop-blur` (Glass).
    - `primary`: `#24292F` (Ink Blue) or `#3B82F6` (Zen Blue) - TBD based on "calm" requirement.
    - **Shadows**: Add `layered` and `inner-glow` utilities.

### 2. Navigation & Nomenclature (The "Admin-less" UI)
**Target**: `components/contract-nav.tsx`
- **Renaming**:
    - `Validation` -> **Visão Geral** (Overview)
    - `Batches` -> **Fluxo de Trabalho** (Workflow)
    - `Resolution` -> **Triagem** (Triage)
    - `Analytics` -> **Insights**
- **Icons**: Update to use thinner strokes (`strokeWidth={1.5}`) to mimic Phosphor Light.

### 3. Component Architecture
#### [NEW] `components/ui/zen-card.tsx`
- A reusable Card component that implements the "Depth & Light" principle:
    - Layered Shadows (Ambient + Direct).
    - Inner Glow (Top highlight).
    - Micro-interaction on hover (Lift).

### 4. UX Engineering (Optimistic UI)
**Target**: `components/ui/action-button.tsx` (New or refactor existing)
- Implement a pattern for instant state feedback.
- **Pattern**:
    ```tsx
    const handleClick = () => {
        setOptimisticState(true); // Instant
        mutateAsync().catch(() => setOptimisticState(false)); // Revert on fail
    }
    ```

---

## 📅 Execution Phases

### Phase 1: The "Ink" Foundation
- Update `tailwind.config.ts` with new colors/shadows.
- Update `globals.css` base styles (fonts, tabular-nums).

### Phase 2: Structural Renaming
- Refactor `contract-nav.tsx` with new labels and icons.
- Verify routing consistency.

### Phase 3: Zen Components
- Create `ZenCard`.
- Replace existing `Card` usage in `BatchesPage` with `ZenCard`.

### Phase 4: Motion & Physics
- Add `active:scale-98` to Buttons.
- Add "Spring" transitions to Dialogs.

## ✅ Verification
- **Visual**: Manual check of colors (No #000 or #FFF visible).
- **Navigation**: Click through renamed tabs to ensure links still work.
- **Motion**: Verify button clicks feel tactile.

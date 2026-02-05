# Plan: Doc Flow Precision v2 (Hybrid Zen/Pro)

## 🎯 Objective
Create a **"Pro Tool"** experience that balances the sophisticated aesthetics of "Paper & Ink" with the information density required for engineering document control.

> **Mantra**: "Calm container, precise content."

---

## 1. Information Architecture (Corrected)

### Navigation Structure
Refactoring `components/contract-nav.tsx` to align with expert mental models:

| Key          | Old label  | **New Label**       | Icon (Phosphor style) | Rationale                        |
| :----------- | :--------- | :------------------ | :-------------------- | :------------------------------- |
| `validation` | Validação  | **Visão Geral**     | `Layout` (Dashboard)  | The command center.              |
| `manifest`   | Manifesto  | **Manifesto**       | `ListChecks`          | Industry standard term. Keep it. |
| `documents`  | Documentos | **Explorador**      | `FolderOpen`          | Implies browsing/search.         |
| `resolution` | Resolução  | **Triagem**         | `Scales` (Balance)    | Active verb for decision making. |
| `batches`    | Lotes      | **Gestão de Lotes** | `Layers`              | Technical and precise.           |
| `analytics`  | Analytics  | **Insights**        | `ChartLineUp`         | Strategic view.                  |

**Icon Style**: Stroke Width `1.5px` (Light), Size `16px`.

---

## 2. Visual System: "Paper & Ink" Frame, "Data" Core

### The Frame (Sidebar, Header, Dialogs)
*   **Background**: Rice Paper (`#F9F9FB`).
*   **Surface**: Glass (`bg-white/80 backdrop-blur-md`).
*   **Typography**: Serif Headers (`Lora` or system serif) for page titles only.
*   **Shadows**: `shadow-layered` (Soft ambient + sharp key light).

### The Core (Tables & Lists)
*   **Density**: **High**. avoid `p-6`. Use `px-4 py-2` for table cells.
*   **Typography**:
    *   Metadata/Dates: `text-xs text-muted-foreground tabular-nums`.
    *   Codes/Identifiers: `font-mono text-sm font-medium text-ink-900`.
*   **Separators**: Subtle. `border-b border-gray-100` instead of heavy lines.
*   **Row Actions**: Visible on hover only (reduce noise).

---

## 3. Feedback Strategy: Honest vs. Optimistic

### A. Optimistic Actions (Instant)
*For frequent, low-risk interactions.*
**Component**: `useOptimisticAction` hook.
**Use Cases**:
*   Matching a document in Triagem.
*   Deleting a batch.
*   Editing a tag.

### B. Narrative Loading (Honest)
*For process-heavy, variable-time operations.*
**Component**: `<NarrativeProgress steps={[...]} />`
**Use Cases**:
*   Uploading files (OCR processing time).
*   Generating ZIP exports (Compression time).

**Behavior**:
1.  Show linear progress bar (real or simulated).
2.  Cycle through text labels: *"Lendo metadados..."* -> *"Comprimindo arquivos..."* -> *"Finalizando pacote..."*.
3.  **NEVER** use a generic spinner for operations > 2s.

---

## 📅 Execution Roadmap

### Step 1: Styles & Config
*   Update `tailwind.config.ts` with Semantic Colors (Ink, Paper, Success-Emerald, Error-Rose).
*   Define `text-xs`, `font-mono` utilities for data density.

### Step 2: Navigation Refactor
*   Update labels and icons in `ContractNav`.
*   Apply "Glass" background to the sub-nav container.

### Step 3: Data Density Polish (Validation Results)
*   Refactor `ValidationResults` table:
    *   Reduce padding.
    *   Apply `tabular-nums`.
    *   Use badges with refined colors (no default high-contrast shadcn badges).

### Step 4: Feedback Engineering
*   Create `NarrativeProgress` component.
*   Implement `NarrativeProgress` in `BatchExportButton` (replacing the current generic loader).

## ✅ Verification
*   **Density Check**: Can I see 15+ rows on a standard laptop screen?
*   **Nav Check**: Do terms feel "Professional" (Lotes, Manifesto) vs "Abstract" (Workflow)?

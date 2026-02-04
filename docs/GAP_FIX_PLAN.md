# Implementation Plan: Gap Fixes (Evaluation Verified)

## 🚨 Problem Statement
1.  **Visibility:** Validated documents sitting in "limbo" (not in a batch).
2.  **Local Export:** Need client-side generation of Excel/Zip to avoid heavy uploads.

## 🔍 Evaluation Findings
*   **Existing Logic:** `BatchService.getUnassignedDocuments()` already exists and filters correctly (Status=VALIDATED/NEEDS_SUFFIX, Batch=NULL).
*   **Existing API:** `GET /api/validation/[contractId]/documents?unassigned=true` exposes this logic. **We will reuse this.**
*   **Missing Logic:**
    *   `POST /api/contracts/[id]/batches` creates a batch but doesn't assign documents.
    *   `GET /api/contracts/[id]/batches/[batchId]` does not exist (needed to get file metadata for the Excel export).

## 🛠️ Implementation Steps

### 1. Dependencies (Client-Side)
```bash
npm install exceljs jszip file-saver
npm install -D @types/file-saver
```

### 2. Backend: Enhanced Batch APIs
**Target:** `app/api/contracts/[id]/batches/route.ts` & `[batchId]/route.ts`

*   **Update POST:** Modify to accept `documentIds: string[]`.
    *   Logic: Create Batch -> If `documentIds` exists -> Call `batchService.assignDocumentsToBatch`.
*   **Create GET [batchId]:** New endpoint to fetch single batch details + **List of Documents**.
    *   Required for the "Export Package" feature to know *what* to put in the Excel Manifest.

### 3. Frontend: Unbatched Documents List
**Target:** `app/(dashboard)/contracts/[id]/batches/page.tsx`

*   **New Section:** "Documentos Disponíveis" (Accordion or Card).
*   **Data Fetch:** `useQuery(['unassigned-docs'], ...)` calling `/api/validation/...`.
*   **Selection:** Checkbox table.
*   **Action:** "Criar Lote" -> Opens `BatchDialog` passing specific `documentIds`.

### 4. Frontend: Client-Side Export
**Target:** `components/batches/BatchExportButton.tsx` (New Component)

*   **Props:** `batchId`, `batchName`.
*   **Flow:**
    1.  User clicks "Exportar Pacote".
    2.  App fetches Batch Metadata (`GET /api/contracts/[id]/batches/[batchId]`).
    3.  **Directory Picker:** User selects local folder with PDF/DWG files.
    4.  **Matching:** App iterates local files and matches validation status/names from Metadata.
    5.  **Generation:**
        *   Build `Manifesto.xlsx` (Columns: Code, Title, Revision, Status, File Name).
        *   Zip `Manifesto.xlsx` + Matched Files.
    6.  **Download:** `saveAs(zipBlob, "Lote_XYZ.zip")`.

## ✅ Verification Plan

### Manual Verification
1.  **Assign:** Select 3 docs -> Create Batch -> Verify they move from "Available" to the new Batch.
2.  **Export:** Click Export -> Select Folder -> Verify ZIP contains correct Excel + Files.

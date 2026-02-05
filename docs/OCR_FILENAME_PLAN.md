# Implementation Plan: OCR Filename Correction

## 🎯 Goal
Automatically correct uploaded filenames by extracting the document code from the file content (Header/First Page) using OCR/Text Extraction. This ensures that files named "scan001.pdf" are correctly identified as "ABC-123.pdf" and matched against the manifest.

## 🛠️ Components

### 1. Dependencies
We need actual extraction libraries to replace the placeholders.
- `pdf-parse`: For text-based PDFs (fast).
- `tesseract.js`: For scanned PDFs/Images (OCR).
- `pdf-lib` (Optional): If we need to split PDFs for OCR efficiency (OCR only first page), but for now we'll send the buffer.

```bash
npm install pdf-parse tesseract.js
npm install -D @types/pdf-parse
```

### 2. Service: `ExtractionService`
**Location:** `lib/validator/services/extraction-service.ts`

**Changes:**
1.  **`extractFromPdf`**:
    *   Use `pdf-parse` to extracting text.
2.  **`extractFromImage`**:
    *   Use `tesseract.js` to recognize text (eng+por).
3.  **Efficiency**:
    *   For PDFs, try text extraction first. If text length is < 50 chars, assume it's scanned and fallback to OCR (if feasible client-side/server-side capability allows).
    *   *Note*: `pdf-parse` is server-side friendly. `tesseract.js` is heavy but works.

### 3. Service: `ValidationService`
**Location:** `lib/validator/services/validation-service.ts`

**Changes:**
1.  Instantiate `ExtractionService`.
2.  Inside `validateFiles`:
    *   Loop through files.
    *   **Step 1: Extract**: Call `extractionService.extractFromDocument`.
    *   **Step 2: Correct**: Check if `extractedData.documentCode` is found.
        *   If found AND `normalized(filename) != normalized(extractedCode)`:
            *   Update `file.filename` to `extractedCode + original_extension`.
            *   Log the correction (maybe add a `original_filename` field to `validated_documents` for audit?).
    *   **Step 3: Validate**: Pass the (potentially renamed) file to `validateSingleFile`.

### 4. Database Schema
**Migration**: `016_add_original_filename.sql` (Optional but recommended)
- Add `original_filename` to `validated_documents` to track that auto-correction happened.

## ✅ Verification Plan

### Manual Verification
1.  **Text PDF**:
    *   Rename a valid PDF (e.g. `ABC-123.pdf`) to `random_name.pdf`.
    *   Upload it.
    *   Verify it appears as `ABC-123.pdf` (or `ABC-123` in the UI) and status is `VALIDATED`.
2.  **Image/Scanned PDF** (if OCR enabled):
    *   Upload an image with a code visible.
    *   Verify rename.

### Automated Tests
- Create a unit test for `ValidationService` mocking the `ExtractionService` response to verify the rename logic works.

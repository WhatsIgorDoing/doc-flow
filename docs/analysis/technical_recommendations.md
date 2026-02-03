# Recomendações Técnicas - Implementação de Features Faltantes

## 🏗️ Arquitetura Proposta

### Visão Geral

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Pages]
        Upload[Upload Component]
        Results[Results Display]
    end
    
    subgraph "API Layer - Next.js"
        API1[POST /upload-batch]
        API2[POST /validate]
        API3[GET /export-excel]
        API4[POST /extract-text]
    end
    
    subgraph "Service Layer"
        UploadService[Upload Service]
        ValidationService[Validation Service]
        OCRService[OCR Service]
        ExportService[Export Service]
    end
    
    subgraph "Background Processing"
        Queue[Job Queue<br/>BullMQ]
        Worker1[File Processor]
        Worker2[Validator]
        Worker3[Text Extractor]
    end
    
    subgraph "Storage"
        Storage[Supabase Storage<br/>Files]
        DB[(PostgreSQL<br/>Metadata)]
        Cache[(Redis<br/>Temp Data)]
    end
    
    UI --> Upload
    Upload --> API1
    Results --> API2
    
    API1 --> UploadService
    API2 --> ValidationService
    API3 --> ExportService
    API4 --> OCRService
    
    UploadService --> Queue
    ValidationService --> Queue
    OCRService --> Queue
    
    Queue --> Worker1
    Queue --> Worker2
    Queue --> Worker3
    
    Worker1 --> Storage
    Worker2 --> DB
    Worker3 --> Cache
    
    style Queue fill:#f9f,stroke:#333
    style Storage fill:#bbf,stroke:#333
    style DB fill:#bfb,stroke:#333
```

---

## 📦 Stack Tecnológico Recomendado

### Frontend (Client-Side)

| Funcionalidade     | Biblioteca              | Versão | Razão                           |
| ------------------ | ----------------------- | ------ | ------------------------------- |
| Upload de arquivos | `react-dropzone`        | ^14.0  | Drag & drop, múltiplos arquivos |
| Progress bars      | `nprogress`             | ^0.2   | Feedback visual                 |
| Tables avançadas   | `@tanstack/react-table` | ^8.0   | Já em uso, sorting/filtering    |
| Notificações       | `sonner`                | ^1.0   | Já em uso                       |

### Backend (Server-Side)

| Funcionalidade             | Biblioteca     | Versão | Razão                     |
| -------------------------- | -------------- | ------ | ------------------------- |
| **Upload/File Processing** |
| Multipart upload           | `formidable`   | ^3.0   | Parse multipart form data |
| ZIP extraction             | `adm-zip`      | ^0.5   | Descompactar lotes        |
| File validation            | `file-type`    | ^19.0  | Verificar MIME types      |
| **OCR/Text Extraction**    |
| PDF parsing                | `pdf-parse`    | ^1.1   | Extração de texto PDF     |
| DOCX parsing               | `mammoth`      | ^1.6   | Extração de texto DOCX    |
| OCR (fallback)             | `tesseract.js` | ^5.0   | Para PDFs escaneados      |
| **Excel Generation**       |
| Excel export               | `exceljs`      | ^4.4   | Geração e formatação      |
| **Background Jobs**        |
| Job queue                  | `bullmq`       | ^5.0   | Redis-based queue         |
| Cron jobs                  | Vercel Cron    | -      | Tarefas agendadas         |

---

## 🔧 Implementação por Funcionalidade

### F-002: Upload e Scan de Lote

#### Arquitetura

```typescript
// app/api/contracts/[id]/upload-batch/route.ts

import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import AdmZip from 'adm-zip';
import { createClient } from '@/lib/supabase/server';
import { queueFileProcessing } from '@/lib/queue';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contractId = params.id;
  
  // 1. Parse multipart form data
  const form = formidable({
    maxFileSize: 500 * 1024 * 1024, // 500 MB
    uploadDir: '/tmp/uploads',
    keepExtensions: true,
  });
  
  const { files } = await form.parse(req);
  const zipFile = files.batch[0];
  
  // 2. Extract ZIP
  const zip = new AdmZip(zipFile.filepath);
  const entries = zip.getEntries();
  
  // 3. Upload files to Supabase Storage
  const supabase = await createClient();
  const fileRecords = [];
  
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    
    const fileName = entry.entryName;
    const fileBuffer = entry.getData();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('document-batches')
      .upload(`${contractId}/${fileName}`, fileBuffer);
      
    if (!error) {
      // Create database record
      const { data: docRecord } = await supabase
        .from('validated_documents')
        .insert({
          contract_id: contractId,
          filename: fileName,
          file_size: fileBuffer.length,
          storage_path: data.path,
          status: 'PENDING',
        })
        .select()
        .single();
        
      fileRecords.push(docRecord);
    }
  }
  
  // 4. Queue validation job
  await queueFileProcessing({
    contractId,
    fileIds: fileRecords.map(f => f.id),
  });
  
  return NextResponse.json({
    success: true,
    uploaded: fileRecords.length,
    jobId: 'processing-' + contractId,
  });
}
```

#### Configuração de Storage

```sql
-- Criar bucket no Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-batches', 'document-batches', false);

-- Política de acesso
CREATE POLICY "Users can upload to their contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-batches' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM contracts 
    WHERE company_id = auth.jwt() ->> 'company_id'
  )
);
```

---

### F-003: Validação Automática

#### Algoritmo de Matching

```typescript
// lib/services/validation-service.ts

import { createClient } from '@/lib/supabase/server';

interface ValidationOptions {
  contractId: string;
  fileIds: string[];
}

export async function validateBatch({ contractId, fileIds }: ValidationOptions) {
  const supabase = await createClient();
  
  // 1. Load manifest
  const { data: manifestItems } = await supabase
    .from('manifest_items')
    .select('*')
    .eq('contract_id', contractId);
    
  const manifestMap = new Map(
    manifestItems.map(item => [normalizeCode(item.document_code), item])
  );
  
  // 2. Process each file
  for (const fileId of fileIds) {
    const { data: file } = await supabase
      .from('validated_documents')
      .select('*')
      .eq('id', fileId)
      .single();
      
    const baseName = getFileBaseName(file.filename);
    const hasSuffix = checkHasSuffix(file.filename);
    const matchedItem = manifestMap.get(normalizeCode(baseName));
    
    let status: string;
    let manifestItemId: string | null = null;
    
    if (matchedItem && hasSuffix) {
      status = 'VALIDATED';
      manifestItemId = matchedItem.id;
    } else if (matchedItem && !hasSuffix) {
      status = 'NEEDS_SUFFIX';
      manifestItemId = matchedItem.id;
    } else {
      status = 'UNRECOGNIZED';
    }
    
    // 3. Update file status
    await supabase
      .from('validated_documents')
      .update({
        status,
        manifest_item_id: manifestItemId,
        validation_date: new Date().toISOString(),
      })
      .eq('id', fileId);
  }
}

// Helper functions
function normalizeCode(code: string): string {
  return code
    .replace(/_[A-Z0-9]$/, '') // Remove suffix _A, _B, _0, _1
    .replace(/_Rev\d+$/, '')   // Remove _Rev0, _Rev1
    .trim()
    .toUpperCase();
}

function getFileBaseName(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  return normalizeCode(nameWithoutExt);
}

function checkHasSuffix(filename: string): boolean {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  return /_[A-Z0-9]$/.test(nameWithoutExt) || /_Rev\d+$/.test(nameWithoutExt);
}
```

---

### F-005: OCR e Extração de Texto

#### Service Implementation

```typescript
// lib/services/ocr-service.ts

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import { createClient } from '@/lib/supabase/server';

interface ExtractionResult {
  text: string;
  extractedCode?: string;
  confidence: number;
}

export async function extractTextFromFile(
  filePath: string,
  fileType: string
): Promise<ExtractionResult> {
  const supabase = await createClient();
  
  // Download file from Supabase Storage
  const { data: fileBuffer } = await supabase.storage
    .from('document-batches')
    .download(filePath);
    
  let text = '';
  
  // Extract based on file type
  if (fileType === 'application/pdf') {
    text = await extractFromPDF(fileBuffer);
  } else if (fileType.includes('word') || fileType.includes('document')) {
    text = await extractFromDOCX(fileBuffer);
  }
  
  // If text is too short, try OCR (might be scanned)
  if (text.length < 50) {
    console.log('Text too short, trying OCR...');
    text = await performOCR(fileBuffer);
  }
  
  // Extract document code using regex patterns
  const extractedCode = findDocumentCode(text);
  
  return {
    text,
    extractedCode,
    confidence: extractedCode ? 0.9 : 0.1,
  };
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function performOCR(buffer: Buffer): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(buffer, 'por', {
    logger: m => console.log(m),
  });
  return text;
}

function findDocumentCode(text: string): string | null {
  // Patterns migrated from patterns.yaml
  const patterns = [
    /Relatório:\s*([A-Z0-9_\.\-\s]+?)(?:\s*-|\s*$|\r|\n)/i,
    /Código:\s*([A-Z0-9_\.\-]+)/i,
    /([A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_[\d\.]+_[A-Z]+_RIR_[A-Z0-9\-]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}
```

---

### F-012: Exportação de Manifesto Excel

#### Excel Generation Service

```typescript
// lib/services/export-service.ts

import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';

export async function generateManifestExcel(
  contractId: string,
  batchId?: string
): Promise<Buffer> {
  const supabase = await createClient();
  
  // 1. Fetch validated documents
  let query = supabase
    .from('validated_documents')
    .select(`
      *,
      manifest_item:manifest_items(*)
    `)
    .eq('contract_id', contractId)
    .eq('status', 'VALIDATED');
    
  if (batchId) {
    query = query.eq('batch_id', batchId);
  }
  
  const { data: documents } = await query;
  
  // 2. Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Manifesto');
  
  // 3. Define columns
  worksheet.columns = [
    { header: 'Código do Documento', key: 'document_code', width: 35 },
    { header: 'Revisão', key: 'revision', width: 10 },
    { header: 'Título', key: 'title', width: 60 },
    { header: 'Nome do Arquivo', key: 'filename', width: 35 },
    { header: 'Extensão', key: 'extension', width: 10 },
    { header: 'Tipo', key: 'document_type', width: 20 },
    { header: 'Categoria', key: 'category', width: 20 },
    { header: 'Responsável', key: 'responsible', width: 30 },
  ];
  
  // 4. Style header
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFF00' }, // Yellow
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;
  
  // 5. Add data rows
  documents.forEach(doc => {
    const row = worksheet.addRow({
      document_code: doc.manifest_item?.document_code,
      revision: doc.manifest_item?.revision,
      title: doc.manifest_item?.title,
      filename: doc.filename,
      extension: doc.filename.split('.').pop(),
      document_type: doc.manifest_item?.document_type,
      category: doc.manifest_item?.category,
      responsible: doc.manifest_item?.responsible_email,
    });
    
    // Style data rows
    row.alignment = { horizontal: 'left', vertical: 'middle' };
    row.font = { size: 10 };
    row.height = 20;
    
    // Add borders
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });
  
  // 6. Add summary row
  const summaryRow = worksheet.addRow({
    document_code: 'FIM',
    revision: '',
    title: `Total: ${documents.length} documentos`,
  });
  summaryRow.font = { bold: true, size: 11 };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }, // Light gray
  };
  
  // 7. Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

#### API Endpoint

```typescript
// app/api/contracts/[id]/export-manifest/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { generateManifestExcel } from '@/lib/services/export-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contractId = params.id;
  const batchId = req.nextUrl.searchParams.get('batch');
  
  const excelBuffer = await generateManifestExcel(contractId, batchId);
  
  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="manifesto-${contractId}.xlsx"`,
    },
  });
}
```

---

## 🔄 Background Processing com BullMQ

### Setup

```typescript
// lib/queue/index.ts

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!);

export const fileProcessingQueue = new Queue('file-processing', { connection });

// Add job to queue
export async function queueFileProcessing(data: any) {
  await fileProcessingQueue.add('process-files', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
}

// Worker
const worker = new Worker('file-processing', async job => {
  const { contractId, fileIds } = job.data;
  
  // Process validation
  await validateBatch({ contractId, fileIds });
  
  // Update progress
  job.updateProgress(100);
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

---

## 🔐 Segurança e Performance

### Rate Limiting

```typescript
// middleware.ts (Next.js)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

### File Size Limits

```typescript
// next.config.ts

export default {
  api: {
    bodyParser: {
      sizeLimit: '500mb', // Increase for large uploads
    },
    responseLimit: '500mb',
  },
  serverRuntimeConfig: {
    maxUploadSize: 500 * 1024 * 1024, // 500 MB
  },
};
```

---

## 📊 Monitoring e Logging

### Structured Logging

```typescript
// lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Usage
logger.info({ contractId, fileCount }, 'Starting batch validation');
logger.error({ error, fileId }, 'Failed to process file');
```

---

**Última atualização:** 03/02/2026  
**Próximos passos:** Implementar PoCs para validar bibliotecas

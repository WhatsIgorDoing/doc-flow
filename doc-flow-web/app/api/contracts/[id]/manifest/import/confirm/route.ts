import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';
import { EXCEL_TEMPLATES, Discipline } from '@/lib/excel/templates';

const cleanValue = (val: any, depth = 0): string | number | boolean | null => {
    if (depth > 3) return String(val); // Safety break
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number' || typeof val === 'boolean') return val;

    // Handle Formula results
    if (val && typeof val === 'object' && 'result' in val) {
        return cleanValue(val.result, depth + 1);
    }

    // Handle Hyperlinks
    if (val && typeof val === 'object' && 'text' in val) {
        return cleanValue(val.text, depth + 1);
    }

    // Handle Rich Text
    if (val && typeof val === 'object' && 'richText' in val && Array.isArray(val.richText)) {
        return val.richText.map((rt: any) => rt.text).join('').trim();
    }

    // Date
    if (val instanceof Date) {
        return val.toISOString();
    }

    try {
        const str = String(val);
        if (str === '[object Object]') return '';
        return str;
    } catch {
        return '';
    }
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    console.log('--- Starting Excel Import ---');
    try {
        const { id: contractId } = await params;
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const discipline = formData.get('discipline') as Discipline;

        if (!file || !discipline) {
            return NextResponse.json({ error: 'Arquivo e disciplina são obrigatórios' }, { status: 400 });
        }

        console.log(`Discipline: ${discipline}, File Size: ${file.size}`);

        const template = EXCEL_TEMPLATES[discipline];
        const supabase = await createClient();

        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        console.log('Workbook loaded. Scanning sheets...');

        const itemsToInsert: any[] = [];
        const failedItems: any[] = [];

        workbook.eachSheet((sheet, sheetId) => {
            console.log(`Processing Sheet ${sheetId}: ${sheet.name}`);

            // Skip Cover/Legend sheets
            const normalizedName = sheet.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const IGNORED = ['CAPA', 'LEGENDA', 'HISTORICO', 'REVISOES', 'LOG', 'INSTRUCOES'];
            if (IGNORED.some(ignored => normalizedName.includes(ignored))) {
                console.log(`Skipping ignored sheet: ${sheet.name}`);
                return;
            }

            // 1. Auto-Discover Header Row
            let bestHeaderRow = template.headerRow; // Default fallback
            let maxMatches = 0;
            let bestHeaderMap = new Map<string, number>();

            // Scan first 20 rows to find the best header match
            for (let r = 1; r <= 20; r++) {
                const currentMap = new Map<string, number>();
                let currentMatches = 0;
                const row = sheet.getRow(r);

                row.eachCell((cell, colNumber) => {
                    const cellText = cleanValue(cell.value)?.toString().trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || '';

                    Object.entries(template.columns).forEach(([headerName, fieldKey]) => {
                        const normalizedHeader = headerName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        if (cellText === normalizedHeader || cellText.includes(normalizedHeader) || normalizedHeader.includes(cellText)) {
                            if (!currentMap.has(fieldKey)) {
                                currentMap.set(fieldKey, colNumber);
                                currentMatches++;
                            }
                        }
                    });
                });

                if (currentMatches > maxMatches) {
                    maxMatches = currentMatches;
                    bestHeaderRow = r;
                    bestHeaderMap = currentMap;
                }
            }

            console.log(`Sheet "${sheet.name}": Best header at Row ${bestHeaderRow} (${maxMatches} matches).`);

            // If we didn't find a good header, maybe skip the sheet or use default?
            // If matches are very low (e.g. 0 or 1), it might be a non-data sheet strictly.
            if (maxMatches < 2) {
                console.log(`Sheet "${sheet.name}" skipped: No recognizable headers found.`);
                return;
            }

            const headerMap = bestHeaderMap;
            const dataStartRow = bestHeaderRow + 1;

            // 2. Process Data Rows
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber < dataStartRow) return;

                const ALLOWED_COLUMNS = new Set([
                    'contract_id', 'discipline', 'document_code', 'revision',
                    'title', 'document_type', 'category',
                    'expected_delivery_date', 'responsible_email', 'metadata',
                    'unit', 'actual_delivery_date', 'external_status'
                ]);

                const DATE_FIELDS = new Set(['expected_delivery_date', 'actual_delivery_date']);

                const rowData: Record<string, any> = {
                    contract_id: contractId,
                    discipline: discipline,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const metadata: Record<string, any> = {
                    original_sheet_name: sheet.name
                };

                const rawData: Record<string, any> = {
                    _sheet: sheet.name,
                    _row: rowNumber
                };

                let hasData = false;

                // Iterate through the MAP, not the fixed letters
                headerMap.forEach((colIndex, field) => {
                    const cell = row.getCell(colIndex);
                    const val = cleanValue(cell.value);

                    if (val) {
                        hasData = true;
                        let shouldUseColumn = ALLOWED_COLUMNS.has(field);

                        // Strict Date Validation
                        if (shouldUseColumn && DATE_FIELDS.has(field)) {
                            const isDateString = typeof val === 'string' && val.length > 5 && !isNaN(Date.parse(val));
                            if (!isDateString) shouldUseColumn = false;
                        }

                        if (shouldUseColumn) {
                            rowData[field] = val;
                        } else {
                            metadata[field] = val;
                        }

                        rawData[field] = val;
                    }
                });

                rowData.metadata = metadata;

                if (hasData) {
                    if (rowData['document_code']) {
                        itemsToInsert.push(rowData);
                    } else {
                        failedItems.push({
                            ...rawData,
                            _reason: 'Código do documento não encontrado (Coluna mapeada)'
                        });
                    }
                }
            });
        });

        console.log(`Scan complete. Items to insert: ${itemsToInsert.length}, Failed: ${failedItems.length}`);

        if (itemsToInsert.length === 0) {
            return NextResponse.json({ count: 0, errors: failedItems });
        }

        const BATCH_SIZE = 1000;
        let insertedCount = 0;

        for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
            console.log(`Inserting batch ${i / BATCH_SIZE + 1} / ${Math.ceil(itemsToInsert.length / BATCH_SIZE)}`);
            const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('manifest_items')
                .upsert(batch, {
                    onConflict: 'contract_id,document_code',
                    ignoreDuplicates: true
                });

            if (error) {
                console.error(`Supabase Insert Error (Batch ${i}):`, error);
                return NextResponse.json({
                    error: `Erro ao salvar lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`
                }, { status: 500 });
            }
            insertedCount += batch.length;
        }

        console.log('Import success.');
        return NextResponse.json({
            count: insertedCount,
            errors: failedItems
        });

    } catch (error) {
        console.error('Excel Import Critical Failure:', error);
        const msg = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ error: `Erro crítico: ${msg}` }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createClient } from '@/lib/supabase/server';
import { EXCEL_TEMPLATES, Discipline } from '@/lib/excel/templates';

const cleanValue = (val: any) => {
    if (typeof val === 'string') return val.trim();
    if (val && typeof val === 'object' && 'text' in val) return val.text;
    return val;
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: contractId } = await params;
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const discipline = formData.get('discipline') as Discipline;

        if (!file || !discipline) {
            return NextResponse.json({ error: 'Arquivo e disciplina são obrigatórios' }, { status: 400 });
        }

        const template = EXCEL_TEMPLATES[discipline];
        const supabase = await createClient(); // Use await for server client

        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const itemsToInsert: any[] = [];

        workbook.eachSheet((sheet, sheetId) => {
            // Processing logic - similar to preview
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber < template.startRow) return;

                const rowData: Record<string, any> = {
                    contract_id: contractId,
                    discipline: discipline,
                    original_sheet_name: sheet.name, // Save exact source sheet
                    // Defaults
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                let hasData = false;
                Object.entries(template.columns).forEach(([colLetter, field]) => {
                    const cell = row.getCell(colLetter);
                    const val = cleanValue(cell.value);
                    if (val) {
                        hasData = true;
                        rowData[field] = val;
                    }
                });

                if (hasData && rowData['document_code']) {
                    itemsToInsert.push(rowData);
                }
            });
        });

        if (itemsToInsert.length === 0) {
            return NextResponse.json({ count: 0 });
        }

        // Insert into Supabase in batches of 1000 to avoid timeouts/limits
        const BATCH_SIZE = 1000;
        let insertedCount = 0;

        for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
            const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
                .from('manifest_items')
                .upsert(batch, {
                    onConflict: 'document_code',
                    ignoreDuplicates: true
                });

            if (error) {
                console.error(`Supabase Insert Error (Batch ${i} - ${i + BATCH_SIZE}):`, error);
                // Return error immediately or continue? 
                // For data integrity, stopping is safer than partial imports with unknown gaps.
                return NextResponse.json({
                    error: `Erro ao salvar lote ${Math.floor(i / BATCH_SIZE) + 1}. Verifique logs.`
                }, { status: 500 });
            }
            insertedCount += batch.length;
        }

        return NextResponse.json({ count: insertedCount });

    } catch (error) {
        console.error('Excel Import Error:', error);
        return NextResponse.json({ error: 'Erro crítico na importação' }, { status: 500 });
    }
}

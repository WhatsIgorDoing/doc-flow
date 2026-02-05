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

        const sheet = workbook.getWorksheet(template.sheetName);
        if (!sheet) {
            return NextResponse.json({ error: `Aba "${template.sheetName}" não encontrada.` }, { status: 400 });
        }

        const itemsToInsert: any[] = [];

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber < template.startRow) return;

            const rowData: Record<string, any> = {
                contract_id: contractId,
                discipline: discipline,
                original_sheet_name: template.sheetName,
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

        if (itemsToInsert.length === 0) {
            return NextResponse.json({ count: 0 });
        }

        // Insert into Supabase
        // Note: Supabase insert returns the inserted rows or error.
        const { error } = await supabase
            .from('manifest_items')
            .upsert(itemsToInsert, {
                onConflict: 'document_code', // Assumption: Update if exists, or ignore?
                ignoreDuplicates: true       // Plan said "Skip existing".
            });

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: 'Erro ao salvar no banco de dados' }, { status: 500 });
        }

        return NextResponse.json({ count: itemsToInsert.length });

    } catch (error) {
        console.error('Excel Import Error:', error);
        return NextResponse.json({ error: 'Erro crítico na importação' }, { status: 500 });
    }
}

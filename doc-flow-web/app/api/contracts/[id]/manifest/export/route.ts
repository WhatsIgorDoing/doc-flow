import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { createClient } from '@/lib/supabase/server';
import { EXCEL_TEMPLATES, Discipline } from '@/lib/excel/templates';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: contractId } = await params;
        const url = new URL(request.url);
        const discipline = url.searchParams.get('discipline') as Discipline;

        if (!discipline || !EXCEL_TEMPLATES[discipline]) {
            return NextResponse.json({ error: 'Disciplina inválida ou não informada.' }, { status: 400 });
        }

        const templateConfig = EXCEL_TEMPLATES[discipline];
        const templatePath = path.join(process.cwd(), 'public', templateConfig.templatePath);

        // 1. Load Template
        if (!fs.existsSync(templatePath)) {
            return NextResponse.json({
                error: `Template auditado não encontrado: ${templateConfig.templatePath}. Por favor, contate o admin.`
            }, { status: 404 });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const sheet = workbook.getWorksheet(templateConfig.sheetName);

        if (!sheet) {
            return NextResponse.json({
                error: `Aba obrigatória "${templateConfig.sheetName}" não encontrada no template.`
            }, { status: 500 });
        }

        // 2. Fetch Data
        const supabase = await createClient();
        const { data: items, error } = await supabase
            .from('manifest_items')
            .select('*')
            .eq('contract_id', contractId)
            .eq('discipline', discipline)
            .order('document_code', { ascending: true }); // Ordered by Code

        if (error) throw error;

        // 3. Fill Rows (Strict Mode: Insert data, preserve style)
        // We start filling at startRow.
        // Important: Should we INSERT rows (pushing down footer) or OVERWRITE?
        // "Strict Template" usually implies a fixed table. But if we have 1000 items and the template has 10 empty rows...
        // Best practice: Insert new rows inheriting style from the startRow.

        const startRow = templateConfig.startRow;

        if (items && items.length > 0) {
            // Strategy: We loop and write. If we go beyond existing rows, ExcelJS handles it.
            // To preserve "Footer" logic (if any), we might need insertRow. 
            // For now, assuming standard "List" template, we overwrite/append.

            items.forEach((item, index) => {
                const currentRowIndex = startRow + index;
                const row = sheet.getRow(currentRowIndex);

                // Map fields
                Object.entries(templateConfig.columns).forEach(([colLetter, field]) => {
                    const cell = row.getCell(colLetter);
                    cell.value = item[field] || '';
                    // Ideally, we copy style from the Start Row's cells if they are new.
                    // But ExcelJS getRow usually keeps basic styles if referencing existing row.
                });

                row.commit();
            });
        }

        // 4. Return Stream
        const buffer = await workbook.xlsx.writeBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Export_${templateConfig.label}_${new Date().toISOString().split('T')[0]}.xlsx"`
            }
        });

    } catch (error) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Erro ao gerar exportação.' }, { status: 500 });
    }
}

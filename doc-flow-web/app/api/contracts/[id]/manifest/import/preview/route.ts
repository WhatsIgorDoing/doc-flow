import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { EXCEL_TEMPLATES, Discipline } from '@/lib/excel/templates';

// Helper to clean cell values
const cleanValue = (val: any) => {
    if (typeof val === 'string') return val.trim();
    if (val && typeof val === 'object' && 'text' in val) return val.text; // For rich text
    return val;
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // params is a Promise in Next 15+
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
        if (!template) {
            return NextResponse.json({ error: 'Disciplina inválida' }, { status: 400 });
        }

        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        // Get Sheet
        const sheet = workbook.getWorksheet(template.sheetName);
        if (!sheet) {
            // Fallback: try first sheet if specific name fails (flexible for user error)
            // But for "Strict Compliance" we might want to be strict.
            // Let's rely on the template name for now.
            return NextResponse.json({ error: `Aba "${template.sheetName}" não encontrada.` }, { status: 400 });
        }

        const sampleData: any[] = [];
        let validRows = 0;
        let invalidRows = 0;

        // Iterate Rows
        // startRow is 1-based.
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber < template.startRow) return;

            // Extract using column mapping
            const rowData: Record<string, any> = {};
            let hasData = false;

            Object.entries(template.columns).forEach(([colLetter, field]) => {
                const cell = row.getCell(colLetter);
                const val = cleanValue(cell.value);
                if (val) hasData = true;
                rowData[field] = val;
            });

            if (hasData) {
                // Basic Validation (e.g. document_code required)
                if (rowData['document_code']) {
                    validRows++;
                    if (sampleData.length < 5) {
                        sampleData.push(rowData);
                    }
                } else {
                    invalidRows++;
                }
            }
        });

        return NextResponse.json({
            validRows,
            invalidRows,
            sample: sampleData
        });

    } catch (error) {
        console.error('Excel Preview Error:', error);
        return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 500 });
    }
}

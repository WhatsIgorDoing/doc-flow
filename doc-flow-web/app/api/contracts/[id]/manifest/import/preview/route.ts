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

        // Create explicit map for results
        const sampleData: any[] = [];
        let validRows = 0;
        let invalidRows = 0;
        const processedSheets: string[] = [];

        workbook.eachSheet((sheet, sheetId) => {
            // Heuristic: Check if header row exists or just try to parse
            // If the sheet strictly doesn't match the columns, it should yield 0 valid rows
            // But we must be careful not to count random cells as "invalidRows" in a cover sheet.
            // Strategy: Only count "invalidRows" if we found at least ONE valid row in the sheet?
            // Or better: Just count. If a sheet is garbage, it might add to invalidRows, which is noise.
            // Refined Strategy: If a sheet has NO valid 'document_code' in the first 50 rows, ignore it entirely?
            // Let's stick to: Parse all. If 'document_code' is present, it's valid.

            let sheetValidRows = 0;

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber < template.startRow) return;

                const rowData: Record<string, any> = {};
                let hasData = false;

                Object.entries(template.columns).forEach(([colLetter, field]) => {
                    const cell = row.getCell(colLetter);
                    const val = cleanValue(cell.value);
                    if (val) hasData = true;
                    rowData[field] = val;
                });

                if (hasData) {
                    if (rowData['document_code']) {
                        validRows++;
                        sheetValidRows++;
                        if (sampleData.length < 5) {
                            sampleData.push({ ...rowData, _sheet: sheet.name });
                        }
                    } else {
                        // Only count invalid if we are in a sheet that SEEMS to be data (has >0 valid rows so far or likely structure)
                        // For now, let's just count global invalid, but maybe we shouldn't show it if it's too high (misinterpretation).
                        invalidRows++;
                    }
                }
            });

            if (sheetValidRows > 0) {
                processedSheets.push(sheet.name);
            }
        });

        if (validRows === 0) {
            return NextResponse.json({
                error: `Nenhuma linha válida encontrada em nenhuma aba. Verifique o layout (Início na linha ${template.startRow}, Coluna A = Código).`
            }, { status: 400 });
        }

        return NextResponse.json({
            validRows,
            invalidRows, // This might be high due to non-data sheets, but acceptable for now.
            sample: sampleData,
            sheets: processedSheets
        });

    } catch (error) {
        console.error('Excel Preview Error:', error);
        return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 500 });
    }
}

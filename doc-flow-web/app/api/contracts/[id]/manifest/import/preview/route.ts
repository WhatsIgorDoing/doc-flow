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
            // Skip Cover/Legend sheets
            const normalizedName = sheet.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const IGNORED = ['CAPA', 'LEGENDA', 'HISTORICO', 'REVISOES', 'LOG', 'INSTRUCOES'];
            if (IGNORED.some(ignored => normalizedName.includes(ignored))) {
                return;
            }

            // 1. Scan Headers to build dynamic map
            const headerMap = new Map<string, number>(); // Field Name -> Column Index
            const headerRow = sheet.getRow(template.headerRow);

            headerRow.eachCell((cell, colNumber) => {
                const cellText = cleanValue(cell.value)?.toString().trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || '';

                Object.entries(template.columns).forEach(([headerName, fieldKey]) => {
                    const normalizedHeader = headerName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (cellText.includes(normalizedHeader) || normalizedHeader.includes(cellText)) {
                        if (!headerMap.has(fieldKey)) {
                            headerMap.set(fieldKey, colNumber);
                        }
                    }
                });
            });

            let sheetValidRows = 0;

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber < template.startRow) return;

                const rowData: Record<string, any> = {};
                let hasData = false;

                headerMap.forEach((colIndex, field) => {
                    const cell = row.getCell(colIndex);
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
                        // Only count invalid if inside a valid data sheet
                        if (sheetValidRows > 0) invalidRows++;
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

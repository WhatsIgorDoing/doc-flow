export type Discipline = 'quality' | 'commissioning' | 'cv';

export interface TemplateConfig {
    discipline: Discipline;
    label: string;
    sheetName: string; // The sheet where data is located
    headerRow: number; // The row index where the header check starts (1-based)
    startRow: number; // The row index where data starts (1-based)
    columns: Record<string, string>; // Map Excel Column Letter -> Manifest Field
    templatePath: string; // Path to the blank .xlsx in public folder
}

export const EXCEL_TEMPLATES: Record<Discipline, TemplateConfig> = {
    quality: {
        discipline: 'quality',
        label: 'Qualidade',
        sheetName: 'LISTA DE DOCUMENTOS',
        headerRow: 9, // "CÓDIGO" header is usually around row 9
        startRow: 11, // Data starts after header
        columns: {
            'A': 'document_code',
            'B': 'title',
            // Add other mappings as verified from LD-5290...003_B.xlsx
        },
        templatePath: '/templates/quality_template.xlsx'
    },
    commissioning: {
        discipline: 'commissioning',
        label: 'Comissionamento',
        sheetName: 'LISTA DE DOCUMENTOS', // Verify this from 002_025_01.xlsx
        headerRow: 1, // Placeholder
        startRow: 2,  // Placeholder
        columns: {
            'A': 'document_code',
            'B': 'title'
        },
        templatePath: '/templates/commissioning_template.xlsx'
    },
    cv: {
        discipline: 'cv',
        label: 'Currículos',
        sheetName: 'LISTA DE DOCUMENTOS', // Verify this from 001_C.xlsx
        headerRow: 1, // Placeholder
        startRow: 2,  // Placeholder
        columns: {
            'A': 'document_code',
            'B': 'title'
        },
        templatePath: '/templates/cv_template.xlsx'
    }
};

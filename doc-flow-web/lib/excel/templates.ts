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
        sheetName: 'N-1710',
        headerRow: 9, // "CÓDIGO" header is usually around row 9
        startRow: 11, // Data starts after header
        columns: {
            // Using Header Names for dynamic mapping
            'DOCUMENTO N-1710': 'document_code',
            'REVISÃO': 'revision',
            'TÍTULO': 'title',
            'UNIDADE/ÁREA': 'unit',
            'ESCOPO': 'scope',
            'PROPÓSITO DE EMISSÃO': 'purpose',
            'DATA PREVISTA DE EMISSÃO': 'expected_delivery_date',
            'DATA EFETIVA DE EMISSÃO': 'actual_delivery_date',
            'N-1710': 'n1710',
            'ISO 9001': 'iso9001',
            'GRDT': 'grdt',
            'STATUS': 'status_quality',
            'PARA CONTRUÇÃO': 'for_construction',
            'REVISÃO QUE ESTÁ LIBERADA': 'released_revision',
            'EMISSOR': 'issuer',
            'QUEM?': 'who',
            'PRAZO': 'deadline',
            'STATUS SIGEM': 'external_status',
            'OBSERVAÇÕES': 'remarks',
            'TAXONOMIA/CONSAG': 'taxonomy',
            'ALOCAÇÃO SIGEM': 'allocation_sigem',
            'PW': 'pw'
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

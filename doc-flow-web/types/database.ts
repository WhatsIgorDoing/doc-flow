/**
 * Database types for Supabase schema.
 * Generated from Phase 1 migration plan.
 */

export type DocumentStatus = 'VALIDATED' | 'UNRECOGNIZED' | 'ERROR' | 'PENDING' | 'NEEDS_SUFFIX';

export type UserRole =
    | 'super_admin'
    | 'company_manager'
    | 'contract_lead'
    | 'controller'
    | 'collaborator'
    | 'viewer';

export type ContractStatus = 'active' | 'archived' | 'completed';

export type ContractRole =
    | 'contract_lead'
    | 'controller'
    | 'collaborator'
    | 'viewer';

export interface Company {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    created_at: string;
    updated_at: string;
    settings: Record<string, unknown>;
}

export interface Contract {
    id: string;
    company_id: string;
    name: string;
    code: string;
    description: string | null;
    status: ContractStatus;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    updated_at: string;
    metadata: Record<string, unknown>;
}

export interface User {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    role: UserRole;
    company_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface ContractPermission {
    id: string;
    user_id: string;
    contract_id: string;
    role: ContractRole;
    permissions: {
        can_validate?: boolean;
        can_organize?: boolean;
        can_delete?: boolean;
        can_export?: boolean;
    };
    granted_at: string;
    granted_by: string | null;
}

export interface ManifestItem {
    id: string;
    contract_id: string;
    document_code: string;
    revision: string | null;
    title: string | null;
    document_type: string | null;
    category: string | null;
    expected_delivery_date: string | null;
    responsible_email: string | null;
    metadata: Record<string, unknown>;
    discipline: 'quality' | 'commissioning' | 'cv' | null;
    original_sheet_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface ValidatedDocument {
    id: string;
    contract_id: string;
    manifest_item_id: string | null;
    filename: string;
    file_size: number | null;
    file_hash: string | null;
    storage_path: string | null;
    status: DocumentStatus;
    validation_date: string;
    validated_by: string | null;
    lot_number: string | null;
    grd_number: string | null;
    batch_id: string | null;
    error_message: string | null;
    error_details: Record<string, unknown> | null;
    confidence?: number;
    matched_document_code?: string;
    created_at: string;
    updated_at: string;
}

export interface AuditLog {
    id: number;
    user_id: string | null;
    action: string;
    resource_type: string;
    resource_id: string | null;
    contract_id: string | null;
    changes: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    timestamp: string;
}

// Extended types with relations
export interface ValidatedDocumentWithRelations extends ValidatedDocument {
    manifest_item?: ManifestItem;
    validated_by_user?: User;
}

export interface ContractWithCompany extends Contract {
    company?: Company;
}

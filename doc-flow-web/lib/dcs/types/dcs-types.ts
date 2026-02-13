/**
 * Document Control System (DCS) - Types
 *
 * Entidades e tipos do sistema de controle de documentos.
 * Owner: DCS
 */

// ============================================================================
// ENTITIES
// ============================================================================

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  company_id: string;
  name: string;
  code: string;
  description?: string;
  status: ContractStatus;
  started_at?: string;
  ended_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ContractStatus = 'active' | 'archived' | 'completed';

export interface ManifestItem {
  id: string;
  contract_id: string;
  document_code: string;
  revision?: string;
  title?: string;
  document_type?: string;
  category?: string;
  expected_delivery_date?: string;
  responsible_email?: string;
  metadata: Record<string, unknown>;
  // Campos preenchidos pelo DV (via evento)
  grdt_number?: string;
  grdt_assigned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole =
  | 'super_admin'
  | 'company_manager'
  | 'contract_lead'
  | 'controller'
  | 'collaborator'
  | 'viewer';

export interface ContractPermission {
  id: string;
  user_id: string;
  contract_id: string;
  role: ContractRole;
  permissions: PermissionSet;
  granted_at: string;
  granted_by?: string;
}

export type ContractRole = 'contract_lead' | 'controller' | 'collaborator' | 'viewer';

export interface PermissionSet {
  can_validate: boolean;
  can_organize: boolean;
  can_delete: boolean;
  can_export: boolean;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CreateContractDTO {
  company_id: string;
  name: string;
  code: string;
  description?: string;
  started_at?: string;
}

export interface UpdateContractDTO {
  name?: string;
  description?: string;
  status?: ContractStatus;
  ended_at?: string;
}

export interface CreateManifestItemDTO {
  contract_id: string;
  document_code: string;
  revision?: string;
  title?: string;
  document_type?: string;
  category?: string;
  expected_delivery_date?: string;
  responsible_email?: string;
}

export interface UpdateManifestItemDTO {
  revision?: string;
  title?: string;
  document_type?: string;
  category?: string;
  expected_delivery_date?: string;
  responsible_email?: string;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IContractService {
  getContract(id: string): Promise<Contract | null>;
  getContractsByCompany(companyId: string): Promise<Contract[]>;
  createContract(data: CreateContractDTO): Promise<Contract>;
  updateContract(id: string, data: UpdateContractDTO): Promise<Contract>;
  deleteContract(id: string): Promise<void>;
}

export interface IManifestService {
  getManifestItems(contractId: string): Promise<ManifestItem[]>;
  getManifestItem(id: string): Promise<ManifestItem | null>;
  createManifestItem(data: CreateManifestItemDTO): Promise<ManifestItem>;
  updateManifestItem(id: string, data: UpdateManifestItemDTO): Promise<ManifestItem>;
  deleteManifestItem(id: string): Promise<void>;
  bulkCreateManifestItems(items: CreateManifestItemDTO[]): Promise<ManifestItem[]>;
  // Chamado pelo evento grdt.assigned do DV
  assignGrdtToManifestItem(
    manifestItemId: string,
    grdtNumber: string
  ): Promise<ManifestItem>;
}

export interface IExportService {
  exportManifestToExcel(contractId: string, options?: ExportOptions): Promise<Buffer>;
  exportBatchToExcel(batchId: string, options?: ExportOptions): Promise<Buffer>;
}

export interface ExportOptions {
  includeValidationStatus?: boolean;
  includeGrdtInfo?: boolean;
  templatePath?: string;
}

import type { ProcessInfo } from './api.js';

export interface Contract {
  id: number;
  internal_uuid?: string;
  file_name: string;
  file_type?: string;
  created_at: string;
  extractions?: ContractExtractions;
  custom_extractions?: CustomExtraction[];
  score?: ResourceScore;
}

export interface CustomExtraction {
  extractor_id: number;
  extractor_name: string | null;
  data: unknown;
}

export interface ContractCommitmentDeliverable {
  type: string;
  description: string;
  quantity: number;
  fulfilled: number;
  [key: string]: unknown;
}

export type ContractCitationStructure =
  | 'paragraph'
  | 'document_header'
  | 'document_footer'
  | 'table'
  | 'list_item'
  | 'schedule'
  | 'exhibit'
  | 'addendum'
  | 'other';

export interface ContractCitation {
  field: string | null;
  page: number | null;
  section_number: string | null;
  section_title: string | null;
  section_structure: ContractCitationStructure | null;
  citation: string | null;
}

/** @deprecated Use ContractCitation. */
export type ContractCommitmentCitation = ContractCitation;

export type ContractCommitmentLinkedAsset = {
  id: number;
  source?: string;
  created_at: string;
  updated_at?: string;
} & (
  | {
    type: 'recording';
    contract_recording_id: number;
    recording_id: number;
    contract_composition_id?: never;
    composition_id?: never;
  }
  | {
    type: 'composition';
    contract_composition_id: number;
    composition_id: number;
    contract_recording_id?: never;
    recording_id?: never;
  }
);

export interface ContractCommitment {
  id: number;
  title?: string;
  type?: string;
  description?: string;
  recurring_unit?: string;
  recurring_quantity?: string;
  linked_deliverables: ContractCommitmentDeliverable[];
  citations?: ContractCitation[];
  created_at?: string;
  updated_at?: string;
  linked_assets: ContractCommitmentLinkedAsset[];
}

export interface ContractExtractions {
  commitments?: ContractCommitment[];
  [key: string]: unknown;
}

export interface ResourceScore {
  summary: { score?: number; meanScore?: number; failed?: number; warned?: number } | null;
  triggered_rules: Array<{ rule_id: string; status: 'fail' | 'warn'; severity: string; message: string | null }>;
}

export interface ContractProcesses {
  staging_id: number;
  contract_id: number | null;
  staging_done: boolean;
  extraction_done: boolean;
  staging_terminal: boolean;
  requires_action: boolean;
  available_actions: Array<'retry'>;
  pause_reason: string | null;
  staging_processes: ProcessInfo;
  extraction_processes: {
    stage: string;
    extractions: ExtractionItem[];
  } | null;
}

export interface ExtractionItem {
  name: string;
  status: string;
  completed_at?: string;
}

export interface ContractsUploadOptions {
  base64?: string;
  fileName?: string;
  extractions?: string;
  folder?: string;
  tags?: string;
}

export interface ContractsStatusOptions {
  watch?: boolean;
  timeout?: string;
}

export interface ContractsListOptions {
  page: string;
  perPage: string;
  extractorIds?: string;
  includes?: string;
  score?: boolean;
  citations?: boolean;
  json?: boolean;
}

export interface ContractsGetOptions {
  includes?: string;
  score?: boolean;
  citations?: boolean;
  json?: boolean;
}

export interface ContractsDownloadOptions {
  output?: string;
}

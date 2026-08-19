import type { ProcessInfo } from './api.js';

export interface Contract {
  id: number;
  file_name: string;
  created_at: string;
  score?: ResourceScore;
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
  score?: boolean;
}

export interface ContractsDownloadOptions {
  output?: string;
}

import type { ProcessInfo } from './api.js';

export interface Contract {
  id: number;
  file_name: string;
  created_at: string;
}

export interface ContractUploadResult {
  staging_id: number;
  staging_stage: string;
  staging_done: boolean;
  extractions_done: boolean;
  created_at: string;
}

export interface ContractProcesses {
  staging_id: number;
  contract_id: number | null;
  staging_done: boolean;
  extraction_done: boolean;
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
}

export interface ContractsStatusOptions {
  watch?: boolean;
}

export interface ContractsListOptions {
  page: string;
  perPage: string;
}

export interface ContractsDownloadOptions {
  output?: string;
}

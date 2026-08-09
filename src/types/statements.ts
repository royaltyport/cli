import type { ProcessInfo } from './api.js';

export interface Statement {
  id: number;
  file_name: string;
  created_at: string;
}

export interface StatementProcesses {
  staging_id: number;
  statement_id: number | null;
  staging_done: boolean;
  processing_done: boolean;
  staging_processes: ProcessInfo;
  processing_processes: {
    status: string;
    stage: number;
    remarks: Record<string, unknown>;
  } | null;
}

export interface StatementsUploadOptions {
  base64?: string;
  fileName?: string;
}

export interface StatementsStatusOptions {
  watch?: boolean;
  timeout?: string;
}

export interface StatementsListOptions {
  page: string;
  perPage: string;
}

export interface StatementsDownloadOptions {
  output?: string;
}

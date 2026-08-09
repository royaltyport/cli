import type { ProcessInfo } from './api.js';

export interface Statement {
  id: number;
  file_name: string;
  created_at: string;
  extraction_stage: StatementExtractionStage;
}

export type StatementExtractionStage =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'timed_out'
  | 'skipped';

export interface StatementProcesses {
  staging_id: number;
  statement_id: number | null;
  staging_done: boolean;
  extraction_done: boolean;
  staging_processes: ProcessInfo;
  extraction_processes: {
    stage: StatementExtractionStage;
    step: number;
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

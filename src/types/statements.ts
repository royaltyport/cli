import type { ProcessInfo } from './api.js';
import type { ResourceScore } from './contracts.js';

export interface Statement {
  id: number;
  file_name: string;
  created_at: string;
  score?: ResourceScore;
}

export interface StatementProcesses {
  staging_id: number;
  statement_id: number | null;
  staging_done: boolean;
  extraction_done: boolean;
  staging_terminal: boolean;
  requires_action: boolean;
  available_actions: Array<'retry'>;
  pause_reason: string | null;
  staging_processes: ProcessInfo;
  extraction_processes: {
    stage: string;
    step: number;
    remarks: Record<string, unknown>;
  } | null;
}

export interface StatementsUploadOptions {
  base64?: string;
  fileName?: string;
  folder?: string;
  accountingPeriod?: string;
  targetPeriod?: string;
  royaltyCurrency?: string;
  transactionCurrency?: string;
  payee?: string;
  payor?: string;
  scenarioFamily?: string;
  targetFamily?: string;
  tags?: string;
}

export interface StatementsStatusOptions {
  watch?: boolean;
  timeout?: string;
}

export interface StatementsListOptions {
  page: string;
  perPage: string;
  score?: boolean;
}

export interface StatementsDownloadOptions {
  output?: string;
}

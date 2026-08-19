// Response of POST /v1/{resource}/uploads (step 1: mint a signed upload URL)
export interface UploadUrlResult {
  staging_id: number;
  upload_url: string;
  file_path: string;
  context_attached: boolean;
}

export interface UploadPeriod {
  value: string;
}

export interface StatementUploadContext {
  accountingPeriod?: UploadPeriod;
  targetPeriod?: UploadPeriod;
  currencyRoyalty?: string;
  currencyTransaction?: string;
  payee?: string;
  payor?: string;
  classification?: {
    scenarioFamily: string;
    targetFamily: string;
  };
  tags?: string[];
}

export interface ContractUploadContext {
  tags?: string[];
}

export interface UploadCompleteResult {
  staging_id: number;
  status: 'uploaded' | 'queued' | 'paused';
  context_applied: boolean;
  snapshot_hash?: string;
  enqueued?: number;
  paused?: number;
}

export interface UploadFlowInput {
  filePath?: string;
  base64?: string;
  bytes?: Uint8Array;
  fileName?: string;
}

export interface UploadFlowOptions {
  extractions?: string[];
  folderName?: string | null;
  context?: StatementUploadContext | ContractUploadContext;
  onStep?: (label: string) => void;
  token?: string;
}

export interface UploadFlowResult extends UploadCompleteResult {
  file_path: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total_count: number;
  page: number;
  per_page: number;
}

export interface DownloadResult {
  url: string;
  fileName?: string;
}

export interface ProcessInfo {
  stage: string;
  info: Record<string, { info: Record<string, unknown>; status: string }>;
}

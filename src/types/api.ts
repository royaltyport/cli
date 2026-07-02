// Response of POST /v1/{resource}/uploads (step 1: mint a signed upload URL)
export interface UploadUrlResult {
  staging_id: number;
  upload_url: string;
  file_path: string;
}

export interface UploadFlowInput {
  filePath?: string;
  base64?: string;
  bytes?: Uint8Array;
  fileName?: string;
}

export interface UploadFlowOptions {
  extractions?: string[];
  onStep?: (label: string) => void;
  token?: string;
}

export interface UploadFlowResult {
  staging_id: number;
  status: 'uploaded';
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

/** Additive source-wide processing state. Optional for older API deployments. */
export interface DocumentProcessingState {
  status?: 'unknown' | 'awaiting_upload' | 'queued' | 'processing' | 'finalizing' | 'cancelling' | 'paused' | 'completed' | 'failed' | 'rejected' | 'cancelled' | 'skipped' | 'timed_out';
  phase?: 'upload' | 'staging' | 'extraction' | 'finalizing';
  terminal?: boolean;
  poll_after_seconds?: number | null;
  upload_status?: string | null;
  pause_id?: string | null;
  pause?: { id?: string; type?: 'document_limit' | 'split_required' | 'unknown'; code: string; message: string; details: Record<string, unknown>; actions?: Array<{ type: 'retry' | 'approve_split'; method: 'POST'; href: string }>; [key: string]: unknown } | null;
  resources?: Array<{ type: 'contract' | 'statement'; id: number; href: string }>;
  error?: { code: string; message: string } | null;
  links?: { self: string; retry?: string | null; resolve?: string | null };
  split_manifest?: { decision_id: string; expected_count: number; materialized_count: number; promoted_count: number; source: unknown; children: unknown[] } | null;
  document_processes?: Array<{ id: number; stage: string | null }>;
}

export interface ResolutionOptions {
  /** Reuse this exact key and payload after a timeout or network failure. */
  idempotencyKey: string;
}
export interface RetryStagingResolution {
  pause_id: string;
  action: 'retry';
  input: Record<string, never>;
}
export interface SplitAgreement {
  title: string;
  start_page: number;
  end_page: number;
  process: boolean;
}
export interface ApproveSplitResolution {
  pause_id: string;
  action: 'approve_split';
  input: { agreements: SplitAgreement[] };
}
export type ContractStagingResolution = RetryStagingResolution | ApproveSplitResolution;

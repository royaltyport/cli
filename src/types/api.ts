export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

export type SseEventCallback = (event: SseEvent) => void;

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

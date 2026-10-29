import type { UploadCompleteResult } from '../types/api.js';

export function uploadResultRows(result: UploadCompleteResult): [string, string | number][] {
  const rows: [string, string | number][] = [
    ['Status', result.status], ['Context Applied', result.context_applied ? 'yes' : 'no'],
  ];
  if (result.processing_status !== undefined) rows.push(['Processing Status', result.processing_status ?? 'no new admission']);
  if (result.usage_meter !== undefined) rows.push(['Document Usage', result.usage_meter ?? 'unavailable']);
  if (result.usage_limit !== undefined) rows.push(['Document Limit', result.usage_limit ?? 'unavailable']);
  if (result.snapshot_hash) rows.push(['Snapshot Hash', result.snapshot_hash]);
  if (result.enqueued !== undefined) rows.push(['Enqueued', result.enqueued]);
  if (result.paused !== undefined) rows.push(['Paused', result.paused]);
  if (result.links?.self) rows.push(['Processing URL', result.links.self]);
  return rows;
}

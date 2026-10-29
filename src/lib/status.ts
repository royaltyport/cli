import { dim, brand, warning, error as errorColor } from './theme.js';
import { printTable, printStatusLine, printInfo } from './output.js';
import type { ContractIngestion, StatementIngestion } from '../types/index.js';

type Ingestion = ContractIngestion | StatementIngestion;
export type IngestionTerminalState = 'completed' | 'failed' | 'action_required' | null;

export function getIngestionTerminalState(data: Ingestion): IngestionTerminalState {
  if (typeof data.status !== 'string' || typeof data.terminal !== 'boolean') {
    throw new Error('Invalid Birch ingestion response: status and terminal are required');
  }
  if (data.status === 'unknown') {
    throw new Error(data.error?.message ?? 'Source completion cannot be verified; inspect this upload in the Platform');
  }
  if (data.status === 'paused') return 'action_required';
  if (!data.terminal) return null;
  if (['failed', 'rejected', 'cancelled', 'timed_out'].includes(data.status)) return 'failed';
  if (data.status === 'completed' || data.status === 'skipped') return 'completed';
  throw new Error(`Invalid Birch terminal status: ${data.status}`);
}

const STATUS_COLORS: Record<string, (text: string) => string> = {
  completed: brand, pending: dim, failed: errorColor, retry: warning, processing: warning, queued: dim,
};

export function formatStatus(status: string): string {
  return (STATUS_COLORS[status] ?? dim)(status);
}

export function printIngestionStatus(
  data: Ingestion,
  { resourceType, projectId }: { resourceType: string; projectId?: string },
): void {
  getIngestionTerminalState(data);
  const isContract = resourceType === 'contract';
  printStatusLine([
    ['Staging ID', data.staging_id], ['Status', data.status], ['Phase', data.phase],
    ['Terminal', data.terminal ? 'yes' : 'no'], ['Pause ID', data.pause?.id], ['Pause Reason', data.pause?.code],
  ]);
  if (data.status === 'paused') {
    const actions = data.pause?.actions ?? [];
    if (actions.length) {
      printInfo(`Available pause actions: ${actions.map(action => action.type).join(', ')}.`);
      if (projectId && data.pause?.id) {
        printInfo(`Resolve this pause with royaltyport ${isContract ? 'contracts' : 'statements'} resolve --help; reuse one stable idempotency key for each decision.`);
      }
    } else {
      printInfo('Processing is paused; no API resolution is advertised. Inspect this upload in the Platform.');
    }
  }
  for (const document of data.document_processes) {
    console.log(`${isContract ? 'Contract' : 'Statement'} ${document.id}: ${formatStatus(document.stage ?? 'queued')}`);
    if ('extractions' in document && document.extractions.length) {
      printTable(['Extraction', 'Status', 'Completed At'], document.extractions.map(step => [
        step.name, formatStatus(step.status ?? 'pending'), step.completed_at ?? '-',
      ]));
    }
    if ('step' in document) {
      printStatusLine([['Step', document.step], ['Remarks', JSON.stringify(document.remarks ?? {})]]);
    }
  }
}

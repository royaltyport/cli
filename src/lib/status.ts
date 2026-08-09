import { dim, brand, warning, error as errorColor } from './theme.js';
import { printTable, printStatusLine, printInfo } from './output.js';
import type { ContractProcesses, StatementProcesses } from '../types/index.js';

export type ProcessTerminalState = 'completed' | 'failed' | null;

export function getProcessTerminalState(
  data: ContractProcesses | StatementProcesses,
  resourceType: 'contract' | 'statement',
): ProcessTerminalState {
  if (data.staging_processes.stage === 'failed') return 'failed';

  if (resourceType === 'contract') {
    const contract = data as ContractProcesses;
    if (contract.extraction_processes?.stage === 'failed') return 'failed';
    if (contract.extraction_processes?.extractions.some(item => item.status === 'failed')) return 'failed';
    return contract.staging_done && contract.extraction_done ? 'completed' : null;
  }

  const statement = data as StatementProcesses;
  if (
    statement.extraction_processes?.stage === 'failed'
    || statement.extraction_processes?.stage === 'timed_out'
  ) return 'failed';
  return statement.staging_done && statement.extraction_done ? 'completed' : null;
}

export const STATUS_COLORS: Record<string, (text: string) => string> = {
  completed: brand,
  pending: dim,
  failed: errorColor,
  timed_out: errorColor,
  retry: warning,
  processing: warning,
  paused: warning,
  queued: dim,
  skipped: dim,
};

export function formatStatus(status: string): string {
  const colorFn = STATUS_COLORS[status] || dim;
  return colorFn(status);
}

export function printProcessStatus(
  data: ContractProcesses | StatementProcesses,
  { resourceType }: { resourceType: string },
): void {
  const isContract = resourceType === 'contract';

  const statusEntries: [string, string | number | null | undefined][] = [
    ['Staging ID', data.staging_id],
    [
      isContract ? 'Contract ID' : 'Statement ID',
      isContract ? (data as ContractProcesses).contract_id : (data as StatementProcesses).statement_id,
    ],
    ['Staging', formatStatus(data.staging_processes.stage)],
    ['Staging Done', data.staging_done ? brand('yes') : dim('no')],
  ];

  if (isContract) {
    statusEntries.push(['Extraction Done', (data as ContractProcesses).extraction_done ? brand('yes') : dim('no')]);
  } else {
    statusEntries.push(['Extraction Done', (data as StatementProcesses).extraction_done ? brand('yes') : dim('no')]);
  }

  console.log();
  printStatusLine(statusEntries);

  if (data.staging_processes.stage === 'failed') {
    const info = data.staging_processes.info || {};
    const check = info.staging_check;
    if (check?.status === 'failed') {
      console.log();
      console.log(errorColor(`Staging failed: staging_check`));
      if (check.info && Object.keys(check.info).length > 0) {
        console.log(dim(`  ${JSON.stringify(check.info)}`));
      }
    }
  }

  if (isContract) {
    const contractData = data as ContractProcesses;
    if (contractData.extraction_processes) {
      console.log();
      console.log(`Extraction stage: ${formatStatus(contractData.extraction_processes.stage)}`);

      const exts = contractData.extraction_processes.extractions || [];
      if (exts.length > 0) {
        const rows = exts.map(e => [
          e.name,
          formatStatus(e.status),
          e.completed_at ? new Date(e.completed_at).toLocaleString() : '-',
        ]);
        console.log();
        printTable(['Extraction', 'Status', 'Completed At'], rows);
      } else {
        printInfo('No extraction steps recorded yet.');
      }
    } else if (contractData.staging_done && contractData.staging_processes.stage === 'completed') {
      console.log();
      printInfo('Waiting for extraction to start...');
    }
  } else {
    const statementData = data as StatementProcesses;
    if (statementData.extraction_processes) {
      console.log();
      console.log(`Extraction stage: ${formatStatus(statementData.extraction_processes.stage)}`);
      console.log(dim(`Extraction step: ${statementData.extraction_processes.step}`));
    } else if (statementData.staging_done && statementData.staging_processes.stage === 'completed') {
      console.log();
      printInfo('Waiting for extraction to start...');
    }
  }
}

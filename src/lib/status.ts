import { dim, brand, warning, error as errorColor } from './theme.js';
import { printTable, printStatusLine, printInfo } from './output.js';
import type { ContractProcesses, StatementProcesses } from '../types/index.js';

export const STATUS_COLORS: Record<string, (text: string) => string> = {
  completed: brand,
  pending: dim,
  failed: errorColor,
  retry: warning,
  processing: warning,
  queued: dim,
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
    statusEntries.push(['Processing Done', (data as StatementProcesses).processing_done ? brand('yes') : dim('no')]);
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
  }
}

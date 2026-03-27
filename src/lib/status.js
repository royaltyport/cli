import { dim, brand, warning, error as errorColor } from './theme.js';
import { printTable, printStatusLine, printInfo } from './output.js';

export const STATUS_COLORS = {
  completed: brand,
  pending: dim,
  failed: errorColor,
  retry: warning,
  processing: warning,
  queued: dim,
};

export function formatStatus(status) {
  const colorFn = STATUS_COLORS[status] || dim;
  return colorFn(status);
}

export function printProcessStatus(data, { resourceType }) {
  const isContract = resourceType === 'contract';

  const statusEntries = [
    ['Staging ID', data.staging_id],
    [isContract ? 'Contract ID' : 'Statement ID', isContract ? data.contract_id : data.statement_id],
    ['Staging', formatStatus(data.staging_processes.stage)],
    ['Staging Done', data.staging_done ? brand('yes') : dim('no')],
  ];

  if (isContract) {
    statusEntries.push(['Extraction Done', data.extraction_done ? brand('yes') : dim('no')]);
  } else {
    statusEntries.push(['Processing Done', data.processing_done ? brand('yes') : dim('no')]);
  }

  console.log();
  printStatusLine(statusEntries);

  if (data.staging_processes.stage === 'failed') {
    const info = data.staging_processes.info || {};
    const check = info.staging_check || {};
    if (check.status === 'failed') {
      console.log();
      console.log(errorColor(`Staging failed: staging_check`));
      if (check.info && Object.keys(check.info).length > 0) {
        console.log(dim(`  ${JSON.stringify(check.info)}`));
      }
    }
  }

  if (isContract && data.extraction_processes) {
    console.log();
    console.log(`Extraction stage: ${formatStatus(data.extraction_processes.stage)}`);

    const exts = data.extraction_processes.extractions || [];
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
  } else if (isContract && data.staging_done && data.staging_processes.stage === 'completed') {
    console.log();
    printInfo('Waiting for extraction to start...');
  }
}

import { printApiError } from '../lib/api-error-output.js';
import { uploadResultRows } from '../lib/upload-result.js';
import { registerResourceAgentsCommand } from './agents.js';
import { documentIngestionPath } from '../lib/api-version.js';
import { registerDocumentResolutionCommand } from './document-resolution.js';
import { existsSync } from 'node:fs';
import type { Command } from 'commander';
import ora from 'ora';
import { apiGet, apiPut, apiUploadFlow, apiUploadComplete, apiDownloadFile, requireAuth } from '../lib/api.js';
import { printTable, printError, printSuccess, printInfo, printJson } from '../lib/output.js';
import { getIngestionTerminalState, printIngestionStatus } from '../lib/status.js';
import { buildStatementUploadContext } from '../lib/upload-context.js';
import { spinnerColor } from '../lib/theme.js';
import { buildStatementUpdatePatch } from '../lib/statement-updates.js';
import type {
  StatementsUploadOptions,
  StatementsStatusOptions,
  StatementsListOptions,
  StatementsUpdateOptions,
  StatementUpdateResult,
  StatementsDownloadOptions,
  StatementIngestion,
  PaginatedResult,
  Statement,
  DownloadResult,
  UploadCompleteResult,
} from '../types/index.js';

export function registerStatementsCommand(program: Command): void {
  const statements = program
    .command('statements')
    .description('Manage statements: upload, list, update, download, and track processing status');

  registerDocumentResolutionCommand(statements, 'statement');
  registerResourceAgentsCommand(statements, 'statement');

  statements
    .command('upload')
    .description('Upload a supported statement file to a project (max 50 MB)')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('[file_path]', 'Path to the statement file')
    .option('--base64 <string>', 'Base64-encoded file content (alternative to file_path)')
    .option('--file-name <name>', 'File name (required with --base64)')
    .option('--folder <path>', 'Relative source folder path')
    .option('--accounting-period <period>', 'Accounting period, for example 2026M1, 2026Q1, 2026H1, or 2026Y')
    .option('--target-period <period>', 'Target booking period, for example 2026M1, 2026Q1, 2026H1, or 2026Y')
    .option('--royalty-currency <code>', 'Three-letter royalty currency')
    .option('--transaction-currency <code>', 'Three-letter transaction currency')
    .option('--payee <name>', 'Royalty recipient or rights owner')
    .option('--payor <name>', 'Statement issuer, distributor, or payer')
    .option('--scenario-family <family>', 'Statement scenario family')
    .option('--target-family <family>', 'Statement target family; required with --scenario-family')
    .option('--tags <list>', 'Comma-separated tag names; missing project statement tags are created')
    .action(async (projectId: string, filePath: string | undefined, options: StatementsUploadOptions) => {
      try {
        await requireAuth();

        const hasFile = !!filePath;
        const hasBase64 = !!options.base64;

        if (!hasFile && !hasBase64) {
          printError('Provide either a file path or --base64 <string>.');
          process.exit(1);
        }
        if (hasFile && hasBase64) {
          printError('Provide either a file path or --base64, not both.');
          process.exit(1);
        }
        if (hasBase64 && !options.fileName) {
          printError('--file-name is required when using --base64.');
          process.exit(1);
        }
        if (hasFile && !existsSync(filePath!)) {
          printError(`File not found: ${filePath}`);
          process.exit(1);
        }
        const context = buildStatementUploadContext(options);

        const spinner = ora({ text: 'Uploading statement...', color: spinnerColor }).start();

        let result;
        try {
          result = await apiUploadFlow(
            'statements',
            projectId,
            { filePath, base64: options.base64, fileName: options.fileName },
            {
              folderName: options.folder,
              context,
              onStep: (label) => { spinner.text = `${label}...`; },
            },
          );
        } finally {
          spinner.stop();
        }

        printSuccess('Statement uploaded successfully.');
        console.log();
        printTable(
          ['Field', 'Value'],
          [
            ['Staging ID', result.staging_id],
            ...uploadResultRows(result),
          ],
        );
        console.log();
        printInfo(`Track progress: royaltyport statements status ${projectId} ${result.staging_id}`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  statements
    .command('complete')
    .description('Re-run upload finalization for a statement whose file bytes are already uploaded')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<staging_id>', 'Staging ID (returned from upload)')
    .action(async (projectId: string, stagingId: string) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Finalizing upload...', color: spinnerColor }).start();
        let result: UploadCompleteResult;
        try {
          result = await apiUploadComplete('statements', projectId, Number(stagingId));
        } finally {
          spinner.stop();
        }

        printSuccess('Statement upload finalized.');
        printTable(['Field', 'Value'], [
          ...uploadResultRows(result),
        ]);
        printInfo(`Track progress: royaltyport statements status ${projectId} ${stagingId}`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  statements
    .command('status')
    .description('Check processing status for a statement')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<staging_id>', 'Staging ID (returned from upload)')
    .option('-w, --watch', 'Poll for updates until all processing completes')
    .option('--timeout <seconds>', 'Maximum watch duration in seconds', '900')
    .action(async (projectId: string, stagingId: string, options: StatementsStatusOptions) => {
      try {
        await requireAuth();

        const fetchStatus = async (): Promise<StatementIngestion> => {
          const response = await apiGet(
            documentIngestionPath('statement', stagingId, projectId),
          );
          return response.data as StatementIngestion;
        };

        if (options.watch) {
          const timeoutMs = Number(options.timeout) * 1000;
          if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('--timeout must be a positive number');
          const deadline = Date.now() + timeoutMs;
          const spinner = ora({ text: 'Waiting for processing...', color: spinnerColor }).start();

          let data: StatementIngestion;
          let terminalState;
          try {
            while (true) {
              data = await fetchStatus();

              spinner.text = `${data.phase}: ${data.status} (${data.document_processes.length} documents)`;

              terminalState = getIngestionTerminalState(data);
              if (terminalState) break;
              if (Date.now() >= deadline) throw new Error(`Timed out after ${options.timeout} seconds waiting for statement processing`);
              const pollSeconds = data.poll_after_seconds;
              await new Promise(r => setTimeout(r, typeof pollSeconds === 'number' && pollSeconds > 0 ? pollSeconds * 1000 : 3000));
            }
          } finally {
            spinner.stop();
          }

          printIngestionStatus(data, { resourceType: 'statement', projectId });
          if (terminalState === 'failed') throw new Error('Statement processing failed');
        } else {
          const spinner = ora({ text: 'Fetching status...', color: spinnerColor }).start();
          const data = await fetchStatus();
          spinner.stop();
          printIngestionStatus(data, { resourceType: 'statement', projectId });
        }
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  statements
    .command('update')
    .description('Update statement tags, parties, periods, or currencies')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<statement_id>', 'Statement numeric ID')
    .option('--tags <list>', 'Comma-separated replacement tag names')
    .option('--clear-tags', 'Remove every tag from the statement')
    .option('--payee <name>', 'Set the licensor/payee name')
    .option('--clear-payee', 'Clear the licensor/payee')
    .option('--payor <name>', 'Set the licensee/payor name')
    .option('--clear-payor', 'Clear the licensee/payor')
    .option('--accounting-period <period>', 'Set the accounting period, for example 2026Q1')
    .option('--clear-accounting-period', 'Clear the accounting period override')
    .option('--target-period <period>', 'Set the target period, for example 2026Q1')
    .option('--clear-target-period', 'Clear the target period override')
    .option('--transaction-currency <code>', 'Set the three-letter transaction currency')
    .option('--clear-transaction-currency', 'Clear the transaction currency override')
    .option('--royalty-currency <code>', 'Set the three-letter royalty currency')
    .option('--clear-royalty-currency', 'Clear the royalty currency override')
    .option('--json', 'Print the complete API data payload as JSON')
    .action(async (projectId: string, statementId: string, options: StatementsUpdateOptions) => {
      try {
        const patch = buildStatementUpdatePatch(options);
        await requireAuth();

        const spinner = ora({ text: 'Updating statement metadata...', color: spinnerColor }).start();
        const response = await apiPut(
          `/v1/statements/${encodeURIComponent(statementId)}?${new URLSearchParams({ projectId }).toString()}`,
          patch,
        ).finally(() => spinner.stop());

        const result = response.data as StatementUpdateResult;
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess('Statement metadata updated.');
        printTable(['Field', 'Value'], [
          ['ID', result.id],
          ['Tags', result.tags.join(', ') || '-'],
          ['Payee', result.payee ?? '-'],
          ['Payor', result.payor ?? '-'],
          ['Accounting Period', result.accounting_period ?? '-'],
          ['Target Period', result.target_period ?? '-'],
          ['Transaction Currency', result.currency_tx ?? '-'],
          ['Royalty Currency', result.currency ?? '-'],
        ]);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  statements
    .command('list')
    .description('List statements in a project')
    .argument('<project_id>', 'Project ID (UUID)')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-n, --per-page <perPage>', 'Results per page', '20')
    .option('--score', 'Include score summary and failed/warned rules')
    .action(async (projectId: string, options: StatementsListOptions) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching statements...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/statements?projectId=${projectId}&page=${options.page}&perPage=${options.perPage}${options.score ? '&score=true' : ''}`,
        );
        spinner.stop();

        const { items, total_count, page, per_page } = response.data as PaginatedResult<Statement>;
        if (!items || items.length === 0) {
          printInfo('No statements found.');
          return;
        }

        const rows = items.map(s => [
          s.id,
          s.file_name || '-',
          s.created_at ? new Date(s.created_at).toLocaleDateString() : '-',
          options.score ? (s.score?.summary?.score ?? '-') : undefined,
        ]);

        printTable(options.score ? ['ID', 'File Name', 'Created', 'Score'] : ['ID', 'File Name', 'Created'], rows.map(row => row.filter(value => value !== undefined)));
        console.log();
        printInfo(`Page ${page} of ${Math.ceil(total_count / per_page)} (${total_count} total)`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  statements
    .command('download')
    .description('Download a statement file')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<statement_id>', 'Statement ID')
    .option('-o, --output <path>', 'Output file path (default: original filename in current directory)')
    .action(async (projectId: string, statementId: string, options: StatementsDownloadOptions) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching download URL...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/statements/${statementId}/download?projectId=${projectId}`,
        );

        const { url, fileName } = response.data as DownloadResult;
        const destPath = options.output || fileName || `${statementId}.pdf`;

        spinner.text = `Downloading ${destPath}...`;
        await apiDownloadFile(url, destPath);
        spinner.stop();

        printSuccess(`Statement downloaded to ${destPath}`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });
}

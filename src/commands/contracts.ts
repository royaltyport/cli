import { printApiError } from '../lib/api-error-output.js';
import { uploadResultRows } from '../lib/upload-result.js';
import { registerResourceAgentsCommand } from './agents.js';
import { documentIngestionPath } from '../lib/api-version.js';
import { registerDocumentResolutionCommand } from './document-resolution.js';
import { existsSync } from 'node:fs';
import type { Command } from 'commander';
import ora from 'ora';
import { apiGet, apiPut, apiUploadFlow, apiUploadComplete, apiDownloadFile, requireAuth } from '../lib/api.js';
import { buildContractExtractionPath, parseContractExtractionKey, summarizeContractExtractionItem } from '../lib/contracts.js';
import { printTable, printError, printSuccess, printInfo, printJson } from '../lib/output.js';
import { getIngestionTerminalState, printIngestionStatus } from '../lib/status.js';
import { buildContractUploadContext } from '../lib/upload-context.js';
import { spinnerColor } from '../lib/theme.js';
import { parseExtractorIds } from '../lib/custom-extractors.js';
import { buildTagReplacement } from '../lib/tags.js';
import type {
  ContractsUploadOptions,
  ContractsStatusOptions,
  ContractsListOptions,
  ContractsGetOptions,
  ContractsExtractionsOptions,
  ContractsUpdateOptions,
  ContractUpdateResult,
  ContractsDownloadOptions,
  ContractIngestion,
  PaginatedResult,
  Contract,
  DownloadResult,
  UploadCompleteResult,
} from '../types/index.js';

export function registerContractsCommand(program: Command): void {
  const contracts = program
    .command('contracts')
    .description('Manage contracts: upload, list, retrieve, update, download, and track processing status');

  registerDocumentResolutionCommand(contracts, 'contract');
  registerResourceAgentsCommand(contracts, 'contract');

  contracts
    .command('upload')
    .description('Upload a contract PDF to a project (max 50 MB, PDF only)')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('[file_path]', 'Path to the PDF file')
    .option('--base64 <string>', 'Base64-encoded file content (alternative to file_path)')
    .option('--file-name <name>', 'File name (required with --base64)')
    .option('--extractions <list>', 'Comma-separated extraction IDs: extract-accounting-period, extract-assets, extract-balances, extract-commitments, extract-compensations, extract-control-areas, extract-costs, extract-creative-approvals, extract-dates, extract-language, extract-royalties, extract-signatures, extract-splits, extract-targets')
    .option('--folder <path>', 'Relative source folder path')
    .option('--tags <list>', 'Comma-separated tag names; missing project contract tags are created')
    .action(async (projectId: string, filePath: string | undefined, options: ContractsUploadOptions) => {
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

        const extractions = options.extractions
          ? options.extractions.split(',').map(e => e.trim()).filter(Boolean)
          : undefined;
        const context = buildContractUploadContext(options);

        const spinner = ora({ text: 'Uploading contract...', color: spinnerColor }).start();

        let result;
        try {
          result = await apiUploadFlow(
            'contracts',
            projectId,
            { filePath, base64: options.base64, fileName: options.fileName },
            {
              extractions,
              folderName: options.folder,
              context,
              onStep: (label) => { spinner.text = `${label}...`; },
            },
          );
        } finally {
          spinner.stop();
        }

        printSuccess('Contract uploaded successfully.');
        console.log();
        printTable(
          ['Field', 'Value'],
          [
            ['Staging ID', result.staging_id],
            ...uploadResultRows(result),
          ],
        );
        console.log();
        printInfo(`Track progress: royaltyport contracts status ${projectId} ${result.staging_id}`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  contracts
    .command('complete')
    .description('Re-run upload finalization for a contract whose file bytes are already uploaded')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<staging_id>', 'Staging ID (returned from upload)')
    .action(async (projectId: string, stagingId: string) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Finalizing upload...', color: spinnerColor }).start();
        let result: UploadCompleteResult;
        try {
          result = await apiUploadComplete('contracts', projectId, Number(stagingId));
        } finally {
          spinner.stop();
        }

        printSuccess('Contract upload finalized.');
        printTable(['Field', 'Value'], [
          ...uploadResultRows(result),
        ]);
        printInfo(`Track progress: royaltyport contracts status ${projectId} ${stagingId}`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  contracts
    .command('status')
    .description('Check processing status for a contract')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<staging_id>', 'Staging ID (returned from upload)')
    .option('-w, --watch', 'Poll for updates until all processing completes')
    .option('--timeout <seconds>', 'Maximum watch duration in seconds', '900')
    .action(async (projectId: string, stagingId: string, options: ContractsStatusOptions) => {
      try {
        await requireAuth();

        const fetchStatus = async (): Promise<ContractIngestion> => {
          const response = await apiGet(
            documentIngestionPath('contract', stagingId, projectId),
          );
          return response.data as ContractIngestion;
        };

        if (options.watch) {
          const timeoutMs = Number(options.timeout) * 1000;
          if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('--timeout must be a positive number');
          const deadline = Date.now() + timeoutMs;
          const spinner = ora({ text: 'Waiting for processing...', color: spinnerColor }).start();

          let data: ContractIngestion;
          let terminalState;
          try {
            while (true) {
              data = await fetchStatus();

              spinner.text = `${data.phase}: ${data.status} (${data.document_processes.length} documents)`;

              terminalState = getIngestionTerminalState(data);
              if (terminalState) break;
              if (Date.now() >= deadline) throw new Error(`Timed out after ${options.timeout} seconds waiting for contract processing`);
              const pollSeconds = data.poll_after_seconds;
              await new Promise(r => setTimeout(r, typeof pollSeconds === 'number' && pollSeconds > 0 ? pollSeconds * 1000 : 3000));
            }
          } finally {
            spinner.stop();
          }

          printIngestionStatus(data, { resourceType: 'contract', projectId });
          if (terminalState === 'failed') throw new Error('Contract processing failed');
        } else {
          const spinner = ora({ text: 'Fetching status...', color: spinnerColor }).start();
          const data = await fetchStatus();
          spinner.stop();
          printIngestionStatus(data, { resourceType: 'contract', projectId });
        }
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  contracts
    .command('get')
    .description('Get a contract by numeric ID or internal UUID')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<contract_id>', 'Contract numeric ID or internal UUID')
    .option('--score', 'Include score summary and failed/warned rules')
    .option('--citations', 'Return citations with extracted items')
    .option('--json', 'Print the complete API data payload as JSON')
    .action(async (projectId: string, contractId: string, options: ContractsGetOptions) => {
      try {
        await requireAuth();

        const searchParams = new URLSearchParams({ projectId });
        if (options.score) searchParams.set('score', 'true');
        if (options.citations) searchParams.set('citations', 'true');

        const spinner = ora({ text: 'Fetching contract...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/contracts/${encodeURIComponent(contractId)}?${searchParams.toString()}`,
        ).finally(() => spinner.stop());

        const contract = response.data as Contract;
        if (options.json) {
          printJson(contract);
          return;
        }

        const details: (string | number)[][] = [
          ['ID', contract.id],
          ['Integration UUID', contract.internal_uuid || '-'],
          ['File Name', contract.file_name || '-'],
          ['File Type', contract.file_type || '-'],
          ['Created', contract.created_at ? new Date(contract.created_at).toLocaleString() : '-'],
        ];
        if (options.score) details.push(['Score', contract.score?.summary?.score ?? '-']);
        printTable(['Field', 'Value'], details);


      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  contracts
    .command('extractions')
    .description('Page through one extracted contract sub-resource')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<contract_id>', 'Contract numeric ID or internal UUID')
    .argument('<key>', 'Extraction key, such as recordings, compositions, or commitments')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-n, --per-page <perPage>', 'Results per page (max 250)', '100')
    .option('--citations', 'Return citations with extracted items')
    .option('--expected-revision <revision>', 'Require the recordings/compositions readiness revision (Birch only)')
    .option('--json', 'Print the paginated payload and conditional revision as JSON')
    .option('--envelope', 'Print full JSON response with metadata and navigation links')
    .action(async (
      projectId: string,
      contractId: string,
      key: string,
      options: ContractsExtractionsOptions,
    ) => {
      try {
        const extraction = parseContractExtractionKey(key);
        const path = buildContractExtractionPath(projectId, contractId, extraction, options);
        await requireAuth();

        const spinner = ora({ text: `Fetching ${extraction}...`, color: spinnerColor }).start();
        const response = await apiGet(
          path,
        ).finally(() => spinner.stop());

        const result = response.data as PaginatedResult<Record<string, unknown>>;
        if (options.json || options.envelope) {
          printJson(options.envelope || options.expectedRevision ? response : result);
          return;
        }
        if (result.items.length === 0) {
          printInfo(`No ${extraction} found.`);
          return;
        }

        printTable(
          ['ID', 'Summary', 'Created'],
          result.items.map(item => [
            typeof item.id === 'number' || typeof item.id === 'string' ? item.id : '-',
            summarizeContractExtractionItem(item),
            typeof item.created_at === 'string'
              ? new Date(item.created_at).toLocaleDateString()
              : '-',
          ]),
        );
        console.log();
        printInfo(`Page ${result.page} of ${Math.ceil(result.total_count / result.per_page)} (${result.total_count} total)`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  contracts
    .command('update')
    .description('Replace the complete tag list of a contract')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<contract_id>', 'Contract numeric ID or internal UUID')
    .option('--tags <list>', 'Comma-separated replacement tag names')
    .option('--clear-tags', 'Remove every tag from the contract')
    .option('--json', 'Print the complete API data payload as JSON')
    .action(async (projectId: string, contractId: string, options: ContractsUpdateOptions) => {
      try {
        const tags = buildTagReplacement(options.tags, options.clearTags);
        await requireAuth();

        const spinner = ora({ text: 'Updating contract tags...', color: spinnerColor }).start();
        const response = await apiPut(
          `/v1/contracts/${encodeURIComponent(contractId)}?${new URLSearchParams({ projectId }).toString()}`,
          { tags },
        ).finally(() => spinner.stop());

        const result = response.data as ContractUpdateResult;
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess('Contract tags updated.');
        printTable(['Field', 'Value'], [
          ['ID', result.id],
          ['Tags', result.tags.join(', ') || '-'],
        ]);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  contracts
    .command('list')
    .description('List contracts in a project')
    .argument('<project_id>', 'Project ID (UUID)')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-n, --per-page <perPage>', 'Results per page', '20')
    .option('--extractor-ids <ids>', 'Comma-separated custom extractor IDs whose results to include')
    .option('--score', 'Include score summary and failed/warned rules')
    .option('--citations', 'Return citations with extracted items')
    .option('--json', 'Print the complete API data payload as JSON')
    .action(async (projectId: string, options: ContractsListOptions) => {
      try {
        await requireAuth();

        const extractorIds = options.extractorIds ? parseExtractorIds(options.extractorIds) : undefined;
        const searchParams = new URLSearchParams({
          projectId,
          page: options.page,
          perPage: options.perPage,
        });
        if (extractorIds) searchParams.set('extractorIds', extractorIds.join(','));
        if (options.score) searchParams.set('score', 'true');
        if (options.citations) searchParams.set('citations', 'true');

        const spinner = ora({ text: 'Fetching contracts...', color: spinnerColor }).start();
        const response = await apiGet(`/v1/contracts?${searchParams.toString()}`)
          .finally(() => spinner.stop());

        const { items, total_count, page, per_page } = response.data as PaginatedResult<Contract>;
        if (options.json) {
          printJson(response.data);
          return;
        }
        if (!items || items.length === 0) {
          printInfo('No contracts found.');
          return;
        }

        const columns = ['ID', 'File Name', 'Created'];
        if (extractorIds) columns.push('Custom Extractions');
        if (options.score) columns.push('Score');

        const rows = items.map((contract): (string | number)[] => {
          const row: (string | number)[] = [
            contract.id,
            contract.file_name || '-',
            contract.created_at ? new Date(contract.created_at).toLocaleDateString() : '-',
          ];
          if (extractorIds) row.push(JSON.stringify(contract.custom_extractions ?? []));
          if (options.score) row.push(contract.score?.summary?.score ?? '-');
          return row;
        });

        printTable(columns, rows);
        console.log();
        printInfo(`Page ${page} of ${Math.ceil(total_count / per_page)} (${total_count} total)`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });

  contracts
    .command('download')
    .description('Download a contract file')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<contract_id>', 'Contract ID')
    .option('-o, --output <path>', 'Output file path (default: original filename in current directory)')
    .action(async (projectId: string, contractId: string, options: ContractsDownloadOptions) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching download URL...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/contracts/${contractId}/download?projectId=${projectId}`,
        );

        const { url, fileName } = response.data as DownloadResult;
        const destPath = options.output || fileName || `${contractId}.pdf`;

        spinner.text = `Downloading ${destPath}...`;
        await apiDownloadFile(url, destPath);
        spinner.stop();

        printSuccess(`Contract downloaded to ${destPath}`);
      } catch (err) {
        printApiError(err);
        process.exit(1);
      }
    });
}

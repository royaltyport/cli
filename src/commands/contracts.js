import { existsSync } from 'node:fs';
import ora from 'ora';
import { apiGet, apiUploadMultipart, apiUploadJson, apiDownloadFile, requireAuth } from '../lib/api.js';
import { printTable, printError, printSuccess, printInfo } from '../lib/output.js';
import { printProcessStatus } from '../lib/status.js';
import { spinnerColor } from '../lib/theme.js';

export function registerContractsCommand(program) {
  const contracts = program
    .command('contracts')
    .description('Manage contracts: upload, list, download, and track processing status');

  contracts
    .command('upload')
    .description('Upload a contract PDF to a project')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('[file_path]', 'Path to the PDF file')
    .option('--base64 <string>', 'Base64-encoded file content (alternative to file_path)')
    .option('--file-name <name>', 'File name (required with --base64)')
    .option('--extractions <list>', 'Comma-separated extraction IDs: extract-accounting-period, extract-assets, extract-commitments, extract-compensations, extract-control-areas, extract-costs, extract-creative-approvals, extract-dates, extract-royalties, extract-signatures, extract-splits, extract-targets')
    .action(async (projectId, filePath, options) => {
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

        const extractions = options.extractions
          ? options.extractions.split(',').map(e => e.trim()).filter(Boolean)
          : undefined;

        const spinner = ora({ text: 'Uploading contract...', color: spinnerColor }).start();

        const onProgress = ({ event, data: eventData }) => {
          if (event === 'progress') {
            spinner.text = `Uploading contract... ${eventData.percent}%`;
          }
        };

        let data;
        if (hasBase64) {
          data = await apiUploadJson(
            `/v1/contracts?projectId=${projectId}`,
            { file: options.base64, fileName: options.fileName, ...(extractions && { extractions }) },
            onProgress,
          );
        } else {
          if (!existsSync(filePath)) {
            spinner.stop();
            printError(`File not found: ${filePath}`);
            process.exit(1);
          }
          data = await apiUploadMultipart(
            `/v1/contracts?projectId=${projectId}`,
            filePath,
            { ...(extractions && { extractions: JSON.stringify(extractions) }) },
            onProgress,
          );
        }

        spinner.stop();

        const contract = data.data;
        printSuccess('Contract uploaded successfully.');
        console.log();
        printTable(
          ['Field', 'Value'],
          [
            ['Staging ID', contract.staging_id],
            ['Staging Stage', contract.staging_stage],
            ['Staging Done', contract.staging_done ? 'yes' : 'no'],
            ['Extractions Done', contract.extractions_done ? 'yes' : 'no'],
            ['Created At', new Date(contract.created_at).toLocaleString()],
          ],
        );
        console.log();
        printInfo(`Track progress: royaltyport contracts status ${projectId} ${contract.staging_id}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  contracts
    .command('status')
    .description('Check processing status for a contract')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<staging_id>', 'Staging ID (returned from upload)')
    .option('-w, --watch', 'Poll for updates until all processing completes')
    .action(async (projectId, stagingId, options) => {
      try {
        await requireAuth();

        const fetchStatus = async () => {
          const response = await apiGet(
            `/v1/contracts/${stagingId}/processes?projectId=${projectId}`,
          );
          return response.data;
        };

        if (options.watch) {
          const spinner = ora({ text: 'Waiting for processing...', color: spinnerColor }).start();

          let data;
          while (true) {
            data = await fetchStatus();

            if (!data.staging_done) {
              spinner.text = `Staging: ${data.staging_processes.stage}...`;
            } else if (!data.extraction_done) {
              const exts = data.extraction_processes?.extractions || [];
              const completed = exts.filter(e => e.status === 'completed').length;
              spinner.text = `Extraction: ${data.extraction_processes?.stage} (${completed}/${exts.length} steps done)`;
            }

            if (data.staging_done && data.extraction_done) break;
            await new Promise(r => setTimeout(r, 3000));
          }

          spinner.stop();
          printProcessStatus(data, { resourceType: 'contract' });
        } else {
          const spinner = ora({ text: 'Fetching status...', color: spinnerColor }).start();
          const data = await fetchStatus();
          spinner.stop();
          printProcessStatus(data, { resourceType: 'contract' });
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  contracts
    .command('list')
    .description('List contracts in a project')
    .argument('<project_id>', 'Project ID (UUID)')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-n, --per-page <perPage>', 'Results per page', '20')
    .action(async (projectId, options) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching contracts...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/contracts?projectId=${projectId}&page=${options.page}&perPage=${options.perPage}`,
        );
        spinner.stop();

        const { items, total_count, page, per_page } = response.data;
        if (!items || items.length === 0) {
          printInfo('No contracts found.');
          return;
        }

        const rows = items.map(c => [
          c.id,
          c.file_name || '-',
          c.created_at ? new Date(c.created_at).toLocaleDateString() : '-',
        ]);

        printTable(['ID', 'File Name', 'Created'], rows);
        console.log();
        printInfo(`Page ${page} of ${Math.ceil(total_count / per_page)} (${total_count} total)`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  contracts
    .command('download')
    .description('Download a contract file')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<contract_id>', 'Contract ID')
    .option('-o, --output <path>', 'Output file path (default: original filename in current directory)')
    .action(async (projectId, contractId, options) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching download URL...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/contracts/${contractId}/download?projectId=${projectId}`,
        );

        const { url, fileName } = response.data;
        const destPath = options.output || fileName || `${contractId}.pdf`;

        spinner.text = `Downloading ${destPath}...`;
        await apiDownloadFile(url, destPath);
        spinner.stop();

        printSuccess(`Contract downloaded to ${destPath}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}

import { existsSync } from 'node:fs';
import ora from 'ora';
import { apiGet, apiUploadMultipart, apiUploadJson, apiDownloadFile, requireAuth } from '../lib/api.js';
import { printTable, printError, printSuccess, printInfo } from '../lib/output.js';
import { printProcessStatus } from '../lib/status.js';
import { spinnerColor } from '../lib/theme.js';

export function registerStatementsCommand(program) {
  const statements = program
    .command('statements')
    .description('Manage statements: upload, list, download, and track processing status');

  statements
    .command('upload')
    .description('Upload a statement PDF to a project')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('[file_path]', 'Path to the PDF file')
    .option('--base64 <string>', 'Base64-encoded file content (alternative to file_path)')
    .option('--file-name <name>', 'File name (required with --base64)')
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

        const spinner = ora({ text: 'Uploading statement...', color: spinnerColor }).start();

        const onProgress = ({ event, data: eventData }) => {
          if (event === 'progress') {
            spinner.text = `Uploading statement... ${eventData.percent}%`;
          }
        };

        let data;
        if (hasBase64) {
          data = await apiUploadJson(
            `/v1/statements?projectId=${projectId}`,
            { file: options.base64, fileName: options.fileName },
            onProgress,
          );
        } else {
          if (!existsSync(filePath)) {
            spinner.stop();
            printError(`File not found: ${filePath}`);
            process.exit(1);
          }
          data = await apiUploadMultipart(
            `/v1/statements?projectId=${projectId}`,
            filePath,
            {},
            onProgress,
          );
        }

        spinner.stop();

        const statement = data.data;
        printSuccess('Statement uploaded successfully.');
        console.log();
        printTable(
          ['Field', 'Value'],
          [
            ['Staging ID', statement.staging_id],
            ['Staging Stage', statement.staging_stage],
            ['Staging Done', statement.staging_done ? 'yes' : 'no'],
            ['Processing Done', statement.processing_done ? 'yes' : 'no'],
            ['Created At', new Date(statement.created_at).toLocaleString()],
          ],
        );
        console.log();
        printInfo(`Track progress: royaltyport statements status ${projectId} ${statement.staging_id}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  statements
    .command('status')
    .description('Check processing status for a statement')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<staging_id>', 'Staging ID (returned from upload)')
    .option('-w, --watch', 'Poll for updates until all processing completes')
    .action(async (projectId, stagingId, options) => {
      try {
        await requireAuth();

        const fetchStatus = async () => {
          const response = await apiGet(
            `/v1/statements/${stagingId}/processes?projectId=${projectId}`,
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
            }

            if (data.staging_done) break;
            await new Promise(r => setTimeout(r, 3000));
          }

          spinner.stop();
          printProcessStatus(data, { resourceType: 'statement' });
        } else {
          const spinner = ora({ text: 'Fetching status...', color: spinnerColor }).start();
          const data = await fetchStatus();
          spinner.stop();
          printProcessStatus(data, { resourceType: 'statement' });
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  statements
    .command('list')
    .description('List statements in a project')
    .argument('<project_id>', 'Project ID (UUID)')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-n, --per-page <perPage>', 'Results per page', '20')
    .action(async (projectId, options) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching statements...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/statements?projectId=${projectId}&page=${options.page}&perPage=${options.perPage}`,
        );
        spinner.stop();

        const { items, total_count, page, per_page } = response.data;
        if (!items || items.length === 0) {
          printInfo('No statements found.');
          return;
        }

        const rows = items.map(s => [
          s.id,
          s.file_name || '-',
          s.created_at ? new Date(s.created_at).toLocaleDateString() : '-',
        ]);

        printTable(['ID', 'File Name', 'Created'], rows);
        console.log();
        printInfo(`Page ${page} of ${Math.ceil(total_count / per_page)} (${total_count} total)`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  statements
    .command('download')
    .description('Download a statement file')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<statement_id>', 'Statement ID')
    .option('-o, --output <path>', 'Output file path (default: original filename in current directory)')
    .action(async (projectId, statementId, options) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching download URL...', color: spinnerColor }).start();
        const response = await apiGet(
          `/v1/statements/${statementId}/download?projectId=${projectId}`,
        );

        const { url, fileName } = response.data;
        const destPath = options.output || fileName || `${statementId}.pdf`;

        spinner.text = `Downloading ${destPath}...`;
        await apiDownloadFile(url, destPath);
        spinner.stop();

        printSuccess(`Statement downloaded to ${destPath}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}

import { printApiError } from '../lib/api-error-output.js';
import type { Command } from 'commander';
import { apiPost } from '../lib/api.js';
import { buildResolution, type ResolveOptions } from '../lib/document-resolution.js';
import { printError, printJson } from '../lib/output.js';

export function registerDocumentResolutionCommand(parent: Command, kind: 'contract' | 'statement'): void {
  parent.command('resolve')
    .description('Resolve an observed pause using a stable idempotency key')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<staging_id>', 'Source staging ID returned by upload/status')
    .requiredOption('--pause-id <uuid>', 'Current pause UUID from processing status')
    .requiredOption('--action <action>', kind === 'contract' ? 'retry or approve_split' : 'retry')
    .requiredOption('--idempotency-key <key>', 'Stable key; reuse the same key and payload after a timeout')
    .option('--input-json <json>', 'Resolution input object (default: {})')
    .option('--input-file <path>', 'Read resolution input JSON from a file')
    .option('--json', 'Print the complete API response including decision metadata')
    .action(async (projectId: string, stagingId: string, options: ResolveOptions) => {
      try {
        if (!Number.isSafeInteger(Number(stagingId)) || Number(stagingId) < 1) throw new Error('staging_id must be a positive safe integer');
        const body = await buildResolution(kind, options);
        const response = await apiPost(`/v1/${kind}s/staging/${encodeURIComponent(stagingId)}/resolve?${new URLSearchParams({ projectId })}`, body, undefined, { idempotencyKey: options.idempotencyKey });
        printJson(options.json ? response : response.data);
      } catch (err) {
        printApiError(err);
        process.exitCode = 1;
      }
    });
}

import type { Command } from 'commander';
import { apiGet } from '../lib/api.js';
import { assertVersionedOperation } from '../lib/api-version.js';
import { getApiVersion } from '../lib/config.js';
import { printError, printJson } from '../lib/output.js';

interface RunOptions {
  resourceType?: string;
  resourceId?: string;
  processKey?: string;
  status?: string;
  limit?: string;
  cursor?: string;
}

async function readAgents(path: string): Promise<void> {
  try {
    // Check before authentication can refresh an OAuth token or send a request.
    assertVersionedOperation(path, getApiVersion());
    printJson(await apiGet(path));
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

export function registerResourceAgentsCommand(parent: Command, kind: 'contract' | 'statement'): void {
  parent.command('agents')
    .description('Inspect downstream processing and reader readiness (Birch only)')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument(`<${kind}_id>`, `Canonical ${kind} ID, not the staging ID`)
    .action((projectId: string, resourceId: string) => readAgents(
      `/v1/${kind}s/${encodeURIComponent(resourceId)}/agents?${new URLSearchParams({ projectId })}`,
    ));
}

export function registerAgentsCommand(program: Command): void {
  const agents = program.command('agents').description('Inspect downstream agent runs (Birch only)');
  agents.command('runs')
    .description('List agent runs with cursor pagination')
    .argument('<project_id>', 'Project ID (UUID)')
    .option('--resource-type <type>', 'contract, statement, or project')
    .option('--resource-id <id>', 'Canonical document ID or project UUID; requires --resource-type')
    .option('--process-key <key>', 'Process key')
    .option('--status <status>', 'Run status')
    .option('--limit <limit>', 'Results per page (1–100; default 20)')
    .option('--cursor <cursor>', 'Opaque next_cursor; keep the same filters and limit')
    .action((projectId: string, options: RunOptions) => {
      const query = new URLSearchParams({ projectId });
      for (const key of ['resourceType', 'resourceId', 'processKey', 'status', 'limit', 'cursor'] as const) {
        if (options[key] !== undefined) query.set(key, options[key]);
      }
      return readAgents(`/v1/agents/runs?${query}`);
    });
  agents.command('run')
    .description('Read one agent run and its steps')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<run_id>', 'Agent run ID (UUID)')
    .action((projectId: string, runId: string) => readAgents(
      `/v1/agents/runs/${encodeURIComponent(runId)}?${new URLSearchParams({ projectId })}`,
    ));
}

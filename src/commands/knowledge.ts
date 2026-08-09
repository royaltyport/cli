import type { Command } from 'commander';
import ora from 'ora';
import { apiGet, requireAuth } from '../lib/api.js';
import { printError, printInfo, printTable } from '../lib/output.js';
import { spinnerColor } from '../lib/theme.js';
import type { KnowledgeSearchOptions, KnowledgeSearchResult } from '../types/index.js';

export function registerKnowledgeCommand(program: Command): void {
  const knowledge = program
    .command('knowledge')
    .description('Search governed organization knowledge applicable to a project');

  knowledge
    .command('search')
    .description('Search knowledge nodes, claims, and graph relationships')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<query>', 'Knowledge search query')
    .option('-n, --limit <limit>', 'Maximum number of results', '8')
    .action(async (projectId: string, query: string, options: KnowledgeSearchOptions) => {
      try {
        await requireAuth();
        const limit = Number(options.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
          throw new Error('--limit must be an integer between 1 and 20');
        }

        const spinner = ora({ text: 'Searching knowledge...', color: spinnerColor }).start();
        let response: Record<string, unknown>;
        try {
          response = await apiGet(
            `/v1/projects/${projectId}/knowledge/search?q=${encodeURIComponent(query)}&limit=${limit}`,
          );
        } finally {
          spinner.stop();
        }

        const data = response.data as KnowledgeSearchResult;
        if (data.results.length === 0) {
          printInfo('No knowledge found.');
          return;
        }

        printTable(
          ['ID', 'Kind', 'Name', 'Claims', 'Relationships'],
          data.results.map(item => [
            item.id,
            item.kind,
            item.name,
            item.claims.length,
            item.relationships.length,
          ]),
        );

        console.log();
        printInfo(`Knowledge last indexed: ${data.freshness.last_indexed_at || 'not available'}`);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

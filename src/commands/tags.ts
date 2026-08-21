import type { Command } from 'commander';
import ora from 'ora';
import { apiGet, apiPut, requireAuth } from '../lib/api.js';
import { printError, printInfo, printJson, printSuccess, printTable } from '../lib/output.js';
import { buildTagReplacement, parseTagScope } from '../lib/tags.js';
import { spinnerColor } from '../lib/theme.js';
import type {
  PaginatedResult,
  Tag,
  TagsListOptions,
  TagsUpdateOptions,
  TagUpdateResult,
} from '../types/index.js';

export function registerTagsCommand(program: Command): void {
  const tags = program
    .command('tags')
    .description('List project tags and replace tags on contracts or statements');

  tags
    .command('list')
    .description('List tag definitions and usage counts for one resource scope')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<scope>', 'Tag scope: contracts or statements')
    .option('-p, --page <page>', 'Page number', '1')
    .option('-n, --per-page <perPage>', 'Results per page', '100')
    .option('--search <text>', 'Case-insensitive tag-name substring')
    .option('--json', 'Print the complete API data payload as JSON')
    .action(async (projectId: string, scopeValue: string, options: TagsListOptions) => {
      try {
        const scope = parseTagScope(scopeValue);
        await requireAuth();

        const searchParams = new URLSearchParams({
          projectId,
          scope,
          page: options.page,
          perPage: options.perPage,
        });
        if (options.search !== undefined) searchParams.set('search', options.search);

        const spinner = ora({ text: 'Fetching tags...', color: spinnerColor }).start();
        const response = await apiGet(`/v1/tags?${searchParams.toString()}`)
          .finally(() => spinner.stop());

        const result = response.data as PaginatedResult<Tag>;
        if (options.json) {
          printJson(result);
          return;
        }
        if (result.items.length === 0) {
          printInfo('No tags found.');
          return;
        }
        printTable(
          ['ID', 'Tag', 'Scope', 'Usage'],
          result.items.map((tag) => [tag.id, tag.tag, tag.scope, tag.usage_count]),
        );
        console.log();
        printInfo(`Page ${result.page} of ${Math.max(1, Math.ceil(result.total_count / result.per_page))} (${result.total_count} total)`);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  tags
    .command('update')
    .description('Replace every tag on one contract or statement')
    .argument('<project_id>', 'Project ID (UUID)')
    .argument('<scope>', 'Tag scope: contracts or statements')
    .argument('<resource_id>', 'Numeric contract or statement ID')
    .option('--tags <list>', 'Comma-separated replacement tag names')
    .option('--clear-tags', 'Remove every tag from the resource')
    .option('--json', 'Print the complete API data payload as JSON')
    .action(async (
      projectId: string,
      scopeValue: string,
      resourceId: string,
      options: TagsUpdateOptions,
    ) => {
      try {
        const scope = parseTagScope(scopeValue);
        const replacement = buildTagReplacement(options.tags, options.clearTags);
        await requireAuth();

        const spinner = ora({ text: 'Updating tags...', color: spinnerColor }).start();
        const response = await apiPut(
          `/v1/tags?${new URLSearchParams({ projectId }).toString()}`,
          { scope, resourceId, tags: replacement },
        ).finally(() => spinner.stop());

        const result = response.data as TagUpdateResult;
        if (options.json) {
          printJson(result);
          return;
        }
        printSuccess('Tags updated.');
        printTable(['Field', 'Value'], [
          ['Resource ID', result.resource_id],
          ['Scope', result.scope],
          ['Tags', result.tags.map((tag) => tag.tag).join(', ') || '-'],
        ]);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

import type { Command } from 'commander';
import ora from 'ora';
import { apiGet, requireAuth } from '../lib/api.js';
import { printTable, printError, printInfo } from '../lib/output.js';
import { spinnerColor } from '../lib/theme.js';
import type { Project } from '../types/index.js';

export function registerProjectsCommand(program: Command): void {
  program
    .command('projects')
    .description('List available projects')
    .action(async () => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Fetching projects...', color: spinnerColor }).start();
        const response = await apiGet('/v1/projects');
        spinner.stop();

        const projects = response.data as Project[];
        if (!projects || projects.length === 0) {
          printInfo('No projects found.');
          return;
        }

        const rows = projects.map((p) => [
          p.id,
          p.name,
          new Date(p.created_at).toLocaleDateString(),
        ]);

        printTable(['ID', 'Name', 'Created'], rows);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

import type { Command } from 'commander';
import ora from 'ora';
import { apiGet, apiPost, requireAuth } from '../lib/api.js';
import { printTable, printError, printInfo, printSuccess } from '../lib/output.js';
import { spinnerColor } from '../lib/theme.js';
import type { Project, ProjectsCreateOptions } from '../types/index.js';

export function registerProjectsCommand(program: Command): void {
  const projectsCommand = program
    .command('projects')
    .description('List and create projects')
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

  projectsCommand
    .command('create')
    .description('Create a project (organization admin required)')
    .argument('<name>', 'Project name')
    .option('--entity-name <name>', 'Legal entity name')
    .action(async (name: string, options: ProjectsCreateOptions) => {
      try {
        await requireAuth();
        const spinner = ora({ text: 'Creating project...', color: spinnerColor }).start();
        let response: Record<string, unknown>;
        try {
          response = await apiPost('/v1/projects', { name, entityName: options.entityName });
        } finally {
          spinner.stop();
        }
        const project = response.data as Project;
        printSuccess('Project created successfully.');
        printTable(['ID', 'Name'], [[project.id, project.name]]);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

import ora from 'ora';
import { apiPost, apiGet, requireAuth } from '../lib/api.js';
import { printError, printInfo } from '../lib/output.js';
import { warning, dim, spinnerColor } from '../lib/theme.js';

export function registerProjectCommand(program) {
  const project = program
    .command('project')
    .description('Use bash commands to explore a project filesystem');

  project
    .command('info')
    .description('Show the AGENTS.md for a project sandbox (filesystem overview and instructions)')
    .argument('<project_id>', 'Project ID')
    .action(async (projectId) => {
      try {
        await requireAuth();

        const spinner = ora({ text: 'Connecting to sandbox...', color: spinnerColor }).start();
        await apiPost(`/v1/projects/${projectId}/sandbox/connect`, {});
        spinner.text = 'Reading AGENTS.md...';

        const response = await apiGet(`/v1/projects/${projectId}/sandbox/files?path=${encodeURIComponent('AGENTS.md')}`);
        spinner.stop();

        if (response.data?.type === 'file' && response.data.content) {
          console.log(response.data.content);
        } else {
          printInfo('No AGENTS.md found in this project sandbox.');
        }
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });

  project
    .command('exec')
    .description('Execute bash commands in a project sandbox')
    .argument('<project_id>', 'Project ID')
    .argument('<commands...>', 'Bash commands to execute')
    .option('--parallel', 'Run commands in parallel instead of sequentially')
    .action(async (projectId, commands, options) => {
      try {
        await requireAuth();

        await apiPost(`/v1/projects/${projectId}/sandbox/connect`, {});

        const mode = options.parallel ? 'parallel' : 'sequential';
        const response = await apiPost(`/v1/projects/${projectId}/sandbox/exec`, { commands, mode });
        const results = response.data;
        const multiple = results.length > 1;

        let exitCode = 0;
        for (const result of results) {
          if (multiple) {
            console.log(dim(`> ${result.command}`));
          }
          if (result.stdout) process.stdout.write(result.stdout);
          if (result.stderr) process.stderr.write(warning(result.stderr));
          if (result.exitCode !== 0) exitCode = result.exitCode;
          if (multiple) console.log();
        }

        process.exit(exitCode);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}

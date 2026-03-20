import ora from 'ora';
import { apiPost, apiGet, requireAuth } from '../lib/api.js';
import { printError, printInfo } from '../lib/output.js';
import { warning, spinnerColor } from '../lib/theme.js';

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
        requireAuth();

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
    .description('Execute a bash command in a project sandbox')
    .argument('<project_id>', 'Project ID')
    .argument('<command>', 'Bash command to execute')
    .action(async (projectId, command) => {
      try {
        requireAuth();

        await apiPost(`/v1/projects/${projectId}/sandbox/connect`, {});

        const response = await apiPost(`/v1/projects/${projectId}/sandbox/exec`, { command });
        const { stdout, stderr, exitCode } = response.data;

        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(warning(stderr));

        process.exit(exitCode);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}

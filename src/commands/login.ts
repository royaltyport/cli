import { createInterface } from 'node:readline/promises';
import type { Command } from 'commander';
import ora from 'ora';
import { apiGet } from '../lib/api.js';
import { setToken, setApiUrl, setOAuthTokens, getConfigPath } from '../lib/config.js';
import { startOAuthFlow } from '../lib/oauth.js';
import { printError, printSuccess, printInfo } from '../lib/output.js';
import { spinnerColor, dim } from '../lib/theme.js';
import type { LoginOptions } from '../types/index.js';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Authenticate with Royaltyport (opens browser by default)')
    .option('-t, --token <token>', 'Use an API token (rp_...) instead of browser login')
    .option('--api-url <url>', 'Custom API URL (default: https://api.royaltyport.com)')
    .action(async (options: LoginOptions) => {
      try {
        if (options.apiUrl) {
          setApiUrl(options.apiUrl);
        }

        // Token-based login (for server-side / headless environments)
        if (options.token) {
          await loginWithToken(options.token);
          return;
        }

        // If stdin is not a TTY (piped input), prompt for token
        if (!process.stdin.isTTY) {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const token = await rl.question('Enter your API token (rp_...): ');
          rl.close();
          await loginWithToken(token.trim());
          return;
        }

        // Browser-based OAuth login (default)
        await loginWithBrowser();
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

async function loginWithBrowser(): Promise<void> {
  printInfo('Opening browser for authentication...');
  printInfo(dim('Waiting for authorization (timeout: 120s)...'));

  const tokens = await startOAuthFlow();

  const spinner = ora({ text: 'Validating session...', color: spinnerColor }).start();

  try {
    const response = await apiGet('/v1/projects', tokens.access_token);
    const projects = response.data as unknown[];
    const projectCount = Array.isArray(projects) ? projects.length : 0;
    spinner.succeed(`Authenticated successfully (${projectCount} project${projectCount !== 1 ? 's' : ''} accessible)`);
  } catch (err) {
    spinner.fail('Session validation failed');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  setOAuthTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
  printSuccess('Logged in via browser.');
  printInfo(`Config stored at ${dim(getConfigPath())}`);
}

async function loginWithToken(token: string): Promise<void> {
  if (!token) {
    printError('Token cannot be empty.');
    process.exit(1);
  }

  const spinner = ora({ text: 'Validating token...', color: spinnerColor }).start();

  try {
    const response = await apiGet('/v1/projects', token);
    const projects = response.data as unknown[];
    const projectCount = Array.isArray(projects) ? projects.length : 0;
    spinner.succeed(`Authenticated successfully (${projectCount} project${projectCount !== 1 ? 's' : ''} accessible)`);
  } catch (err) {
    spinner.fail('Token validation failed');
    printError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  setToken(token);
  printSuccess('Token saved.');
  printInfo(`Config stored at ${dim(getConfigPath())}`);
}

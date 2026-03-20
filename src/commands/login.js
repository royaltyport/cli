import { createInterface } from 'node:readline/promises';
import ora from 'ora';
import { apiGet } from '../lib/api.js';
import { setToken, setApiUrl, getConfigPath } from '../lib/config.js';
import { printError, printSuccess, printInfo } from '../lib/output.js';
import { spinnerColor, dim } from '../lib/theme.js';

export function registerLoginCommand(program) {
  program
    .command('login')
    .description('Authenticate with your Royaltyport API token')
    .option('-t, --token <token>', 'API token (rp_...)')
    .option('--api-url <url>', 'Custom API URL (default: https://api.royaltyport.com)')
    .action(async (options) => {
      try {
        let token = options.token;

        if (!token) {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          token = await rl.question('Enter your API token (rp_...): ');
          rl.close();
        }

        token = token.trim();
        if (!token) {
          printError('Token cannot be empty.');
          process.exit(1);
        }

        if (options.apiUrl) {
          setApiUrl(options.apiUrl);
        }

        const spinner = ora({ text: 'Validating token...', color: spinnerColor }).start();

        try {
          const response = await apiGet('/v1/projects', token);
          const projectCount = Array.isArray(response.data) ? response.data.length : 0;
          spinner.succeed(`Authenticated successfully (${projectCount} project${projectCount !== 1 ? 's' : ''} accessible)`);
        } catch (err) {
          spinner.fail('Token validation failed');
          printError(err.message);
          process.exit(1);
        }

        setToken(token);
        printSuccess('Token saved.');
        printInfo(`Config stored at ${dim(getConfigPath())}`);
      } catch (err) {
        printError(err.message);
        process.exit(1);
      }
    });
}

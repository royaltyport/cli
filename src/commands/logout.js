import { clearConfig } from '../lib/config.js';
import { printSuccess } from '../lib/output.js';

export function registerLogoutCommand(program) {
  program
    .command('logout')
    .description('Clear stored credentials')
    .action(() => {
      clearConfig();
      printSuccess('Logged out. Credentials cleared.');
    });
}

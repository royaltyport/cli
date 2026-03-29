import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { registerLoginCommand } from './commands/login.js';
import { registerLogoutCommand } from './commands/logout.js';
import { registerProjectsCommand } from './commands/projects.js';
import { registerProjectCommand } from './commands/project.js';
import { registerContractsCommand } from './commands/contracts.js';
import { registerStatementsCommand } from './commands/statements.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string };

const program = new Command();

program
  .name('royaltyport')
  .description('Royaltyport CLI — authenticate, list projects, and execute commands in a sandboxed project filesystem')
  .version(pkg.version);

registerLoginCommand(program);
registerLogoutCommand(program);
registerProjectsCommand(program);
registerProjectCommand(program);
registerContractsCommand(program);
registerStatementsCommand(program);

export { program };

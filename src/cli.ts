import { API_RELEASE } from './lib/api-version.js';
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { registerLoginCommand } from './commands/login.js';
import { registerLogoutCommand } from './commands/logout.js';
import { registerProjectsCommand } from './commands/projects.js';
import { registerProjectCommand } from './commands/project.js';
import { registerContractsCommand } from './commands/contracts.js';
import { registerStatementsCommand } from './commands/statements.js';
import { registerTagsCommand } from './commands/tags.js';
import { registerAgentsCommand } from './commands/agents.js';
import { registerKnowledgeCommand } from './commands/knowledge.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string };

export function createProgram(): Command {
  const program = new Command();

  program
    .name('royaltyport')
    .description('Royaltyport CLI — authenticate, list projects, and execute commands in a sandboxed project filesystem')
    .version(pkg.version);

  program.command('api-version')
    .description('Show the fixed API release used by this CLI')
    .allowExcessArguments(false)
    .action(() => console.log(API_RELEASE));

  registerLoginCommand(program);
  registerLogoutCommand(program);
  registerProjectsCommand(program);
  registerProjectCommand(program);
  registerContractsCommand(program);
  registerStatementsCommand(program);
  registerTagsCommand(program);
  registerKnowledgeCommand(program);
  registerAgentsCommand(program);

  return program;
}

export const program = createProgram();

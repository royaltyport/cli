import { getApiVersion, pinCommandApiVersion, setApiVersion } from './lib/config.js';
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

const program = new Command();

program
  .name('royaltyport')
  .description('Royaltyport CLI — authenticate, list projects, and execute commands in a sandboxed project filesystem')
  .version(pkg.version)
  .option('--api-version <release>', 'Exact API contract (separate from --version)')
  .hook('preAction', command => { pinCommandApiVersion(command.optsWithGlobals().apiVersion); });

program.command('api-version')
  .description('Show the effective API release, or persist an exact profile release')
  .argument('[release]', 'Exact API release to save for this CLI profile')
  .action((release?: string) => {
    if (release !== undefined) {
      setApiVersion(release);
      console.log(`Saved API release ${release}. Explicit --api-version and ROYALTYPORT_API_VERSION take precedence.`);
    } else {
      console.log(getApiVersion());
    }
  });

registerLoginCommand(program);
registerLogoutCommand(program);
registerProjectsCommand(program);
registerProjectCommand(program);
registerContractsCommand(program);
registerStatementsCommand(program);
registerTagsCommand(program);
registerKnowledgeCommand(program);
registerAgentsCommand(program);

export { program };

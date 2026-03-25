#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { program } from 'commander';
import { registerLoginCommand } from '../src/commands/login.js';
import { registerLogoutCommand } from '../src/commands/logout.js';
import { registerProjectsCommand } from '../src/commands/projects.js';
import { registerProjectCommand } from '../src/commands/project.js';
import { registerContractsCommand } from '../src/commands/contracts.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

program
  .name('royaltyport')
  .description('Royaltyport CLI — authenticate, list projects, and execute commands in a sandboxed project filesystem')
  .version(pkg.version);

registerLoginCommand(program);
registerLogoutCommand(program);
registerProjectsCommand(program);
registerProjectCommand(program);
registerContractsCommand(program);

program.parse();

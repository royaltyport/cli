#!/usr/bin/env node

import { program } from 'commander';
import { registerLoginCommand } from '../src/commands/login.js';
import { registerLogoutCommand } from '../src/commands/logout.js';
import { registerProjectsCommand } from '../src/commands/projects.js';
import { registerProjectCommand } from '../src/commands/project.js';

program
  .name('royaltyport')
  .description('Royaltyport CLI — authenticate, list projects, and execute sandbox commands')
  .version('0.1.0');

registerLoginCommand(program);
registerLogoutCommand(program);
registerProjectsCommand(program);
registerProjectCommand(program);

program.parse();

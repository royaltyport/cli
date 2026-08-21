import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { program } from './cli.js';

function child(parent: Command, name: string): Command {
  const found = parent.commands.find((command) => command.name() === name);
  if (!found) throw new Error(`Missing command: ${name}`);
  return found;
}

function optionNames(command: Command): string[] {
  return command.options.map((option) => option.long);
}

describe('CLI update and tag commands', () => {
  it('registers contract and statement update commands', () => {
    expect(child(child(program, 'contracts'), 'update').usage()).toContain('<project_id> <contract_id>');
    const statementUpdate = child(child(program, 'statements'), 'update');
    expect(statementUpdate.usage()).toContain('<project_id> <statement_id>');
    expect(optionNames(statementUpdate)).toEqual(expect.arrayContaining([
      '--tags',
      '--clear-tags',
      '--payee',
      '--clear-payee',
      '--accounting-period',
      '--clear-accounting-period',
      '--transaction-currency',
      '--clear-transaction-currency',
    ]));
  });

  it('registers tag list and update commands', () => {
    const tags = child(program, 'tags');
    expect(child(tags, 'list').usage()).toContain('<project_id> <scope>');
    expect(child(tags, 'update').usage()).toContain('<project_id> <scope> <resource_id>');
  });
});

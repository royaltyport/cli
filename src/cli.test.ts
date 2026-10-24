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

  it('registers paginated contract extraction access', () => {
    const contracts = child(program, 'contracts');
    const extraction = child(contracts, 'extractions');
    expect(extraction.usage()).toContain('<project_id> <contract_id> <key>');
    expect(optionNames(extraction)).toEqual(expect.arrayContaining([
      '--page',
      '--per-page',
      '--citations',
      '--expected-revision',
      '--json',
    ]));
    expect(extraction.options.find(option => option.long === '--per-page')?.defaultValue).toBe('100');
  });

  it('registers tag list and update commands', () => {
    const tags = child(program, 'tags');
    expect(child(tags, 'list').usage()).toContain('<project_id> <scope>');
    expect(child(tags, 'update').usage()).toContain('<project_id> <scope> <resource_id>');
  });
});


it('registers durable resolution in both real document command groups', () => {
  for (const name of ['contracts', 'statements']) {
    const resolve = child(child(program, name), 'resolve');
    expect(resolve.usage()).toContain('<project_id> <staging_id>');
    expect(optionNames(resolve)).toEqual(expect.arrayContaining(['--pause-id', '--action', '--idempotency-key', '--input-json', '--input-file', '--json']));
    for (const flag of ['--pause-id', '--action', '--idempotency-key']) {
      expect(resolve.options.find(option => option.long === flag)?.mandatory).toBe(true);
    }
  }
});


it('registers downstream resource and run inspection', () => {
  for (const name of ['contracts', 'statements']) expect(child(child(program, name), 'agents')).toBeDefined();
  const agents = child(program, 'agents');
  expect(child(agents, 'run').usage()).toContain('<project_id> <run_id>');
  expect(optionNames(child(agents, 'runs'))).toEqual(expect.arrayContaining([
    '--resource-type', '--resource-id', '--process-key', '--status', '--limit', '--cursor',
  ]));
});

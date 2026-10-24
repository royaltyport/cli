import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { apiGet, requireAuth } from '../lib/api.js';
import { getApiVersion } from '../lib/config.js';
import { printError, printJson } from '../lib/output.js';
import { registerAgentsCommand, registerResourceAgentsCommand } from './agents.js';
import { registerContractsCommand } from './contracts.js';

vi.mock('../lib/api.js', () => ({ apiGet: vi.fn(), requireAuth: vi.fn() }));
vi.mock('../lib/config.js', () => ({ getApiVersion: vi.fn(() => '2026-10-20.birch') }));
vi.mock('../lib/output.js', () => ({ printJson: vi.fn(), printError: vi.fn() }));

function program(): Command {
  const root = new Command();
  registerAgentsCommand(root);
  for (const kind of ['contract', 'statement'] as const) registerResourceAgentsCommand(root.command(`${kind}s`), kind);
  return root;
}
async function run(args: string[]): Promise<void> {
  await program().parseAsync(args, { from: 'user' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getApiVersion).mockReturnValue('2026-10-20.birch');
  vi.mocked(apiGet).mockResolvedValue({ data: [], meta: { has_more: false, next_cursor: null }, links: { next: null } });
  process.exitCode = 0;
});

describe('Agents commands', () => {
  it.each(['contract', 'statement'])('reads canonical %s agents and prints the full envelope', async kind => {
    await run([`${kind}s`, 'agents', 'project/1', '42']);
    expect(apiGet).toHaveBeenCalledWith(`/v1/${kind}s/42/agents?projectId=project%2F1`);
    expect(printJson).toHaveBeenCalledWith({ data: [], meta: { has_more: false, next_cursor: null }, links: { next: null } });
  });

  it('serializes every list filter and an opaque cursor', async () => {
    await run(['agents', 'runs', 'project-1', '--resource-type', 'contract', '--resource-id', '42',
      '--process-key', 'contract-processing', '--status', 'completed_with_issues', '--limit', '5', '--cursor', 'next+/=']);
    const query = new URL(String(vi.mocked(apiGet).mock.calls[0]?.[0]), 'https://example.com');
    expect(query.pathname).toBe('/v1/agents/runs');
    expect(Object.fromEntries(query.searchParams)).toEqual({ projectId: 'project-1', resourceType: 'contract', resourceId: '42',
      processKey: 'contract-processing', status: 'completed_with_issues', limit: '5', cursor: 'next+/=' });
  });

  it('reads a single run', async () => {
    await run(['agents', 'run', 'project-1', 'run/id']);
    expect(apiGet).toHaveBeenCalledWith('/v1/agents/runs/run%2Fid?projectId=project-1');
  });

  it.each([
    ['contracts', 'agents', 'p', '42'], ['statements', 'agents', 'p', '42'],
    ['agents', 'runs', 'p'], ['agents', 'run', 'p', 'run-id'],
  ])('rejects Aster before authentication or network: %j', async (...args) => {
    vi.mocked(getApiVersion).mockReturnValue('2026-04-20.aster');
    await run(args);
    expect(apiGet).not.toHaveBeenCalled();
    expect(requireAuth).not.toHaveBeenCalled();
    expect(printError).toHaveBeenCalledWith(expect.stringContaining('2026-10-20.birch'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('rejects Aster conditional extraction before auth can refresh credentials', async () => {
    const root = new Command();
    registerContractsCommand(root);
    vi.mocked(getApiVersion).mockReturnValue('2026-04-20.aster');
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('command exited'); });
    try {
      await expect(root.parseAsync(['contracts', 'extractions', 'p', '42', 'recordings',
        '--expected-revision', 'r1_token', '--json'], { from: 'user' })).rejects.toThrow('command exited');
      expect(apiGet).not.toHaveBeenCalled();
      expect(requireAuth).not.toHaveBeenCalled();
      expect(printError).toHaveBeenCalledWith(expect.stringContaining('2026-10-20.birch'));
    } finally {
      exit.mockRestore();
    }
  });

  it('forwards expectedRevision and prints the verified meta.revision on conditional extraction', async () => {
    const root = new Command();
    registerContractsCommand(root);
    const body = { data: { items: [], total_count: 0, page: 2, per_page: 1 }, meta: { revision: 'r1_current' } };
    vi.mocked(apiGet).mockResolvedValue(body);
    await root.parseAsync(['contracts', 'extractions', 'project-1', '42', 'recordings', '--page', '2', '--per-page', '1',
      '--expected-revision', 'r1_current', '--json'], { from: 'user' });
    expect(apiGet).toHaveBeenCalledWith('/v1/contracts/42/extractions/recordings?projectId=project-1&page=2&perPage=1&expectedRevision=r1_current');
    expect(printJson).toHaveBeenCalledWith(body);
  });
});

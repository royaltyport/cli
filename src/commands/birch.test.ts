import { Command } from 'commander';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiGet, requireAuth } from '../lib/api.js';
import { printJson } from '../lib/output.js';
import { registerContractsCommand } from './contracts.js';
import { registerStatementsCommand } from './statements.js';
import { createProgram } from '../cli.js';

vi.mock('../lib/api.js', () => ({ apiGet: vi.fn(), requireAuth: vi.fn(), apiPut: vi.fn(),
  apiUploadFlow: vi.fn(), apiUploadComplete: vi.fn(), apiDownloadFile: vi.fn(), apiPost: vi.fn() }));
vi.mock('../lib/output.js', () => ({ printJson: vi.fn(), printError: vi.fn(), printInfo: vi.fn(),
  printTable: vi.fn(), printSuccess: vi.fn(), printStatusLine: vi.fn() }));

function commands(): Command {
  const root = new Command().exitOverride().configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerContractsCommand(root);
  registerStatementsCommand(root);
  return root;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

it.each([
  ['contracts', 'retry', 'p', '42'], ['statements', 'retry', 'p', '42'],
  ['contracts', 'list', 'p', '--includes', 'commitments'],
  ['contracts', 'get', 'p', '42', '--includes', 'recordings'],
])('rejects removed command syntax before authentication: %j', async (...args) => {
  await expect(commands().parseAsync(args, { from: 'user' })).rejects.toThrow();
  expect(requireAuth).not.toHaveBeenCalled();
  expect(apiGet).not.toHaveBeenCalled();
});

it.each([
  ['--api-version', '2026-04-20.aster', 'projects'], ['api-version', '2026-04-20.aster'],
])('has no release-selection surface: %j', async (...args) => {
  const root = createProgram().exitOverride().configureOutput({ writeOut: () => {}, writeErr: () => {} });
  for (const command of root.commands) command.exitOverride();
  await expect(root.parseAsync(args, { from: 'user' })).rejects.toThrow();
  expect(requireAuth).not.toHaveBeenCalled();
  expect(apiGet).not.toHaveBeenCalled();
});

it('shows the fixed Birch release without authenticating', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await createProgram().parseAsync(['api-version'], { from: 'user' });
  expect(log).toHaveBeenCalledWith('2026-10-20.birch');
  expect(requireAuth).not.toHaveBeenCalled();
});

it.each([false, true])('preserves extraction JSON and optionally exposes its full envelope (%s)', async envelope => {
  const response = { data: { items: [{ id: 7 }], total_count: 2, page: 1, per_page: 1 },
    meta: { revision: 'r1_verified' }, links: { self: '/v1/contracts/42/extractions/recordings?page=1',
      next: '/v1/contracts/42/extractions/recordings?page=2' } };
  vi.mocked(apiGet).mockResolvedValue(response);
  await commands().parseAsync(['contracts', 'extractions', 'p', '42', 'recordings',
    envelope ? '--envelope' : '--json'], { from: 'user' });
  expect(printJson).toHaveBeenCalledWith(envelope ? response : response.data);
});

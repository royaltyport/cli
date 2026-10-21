import { describe, expect, it, vi, afterEach } from 'vitest';
import { Command } from 'commander';
import { buildResolution } from './document-resolution.js';
import { registerDocumentResolutionCommand } from '../commands/document-resolution.js';
import { apiPost } from './api.js';
vi.mock('./api.js', () => ({ apiPost: vi.fn().mockResolvedValue({ data: { status: 'queued' }, meta: { decision_id: 'd1' } }) }));
vi.mock('./output.js', () => ({ printJson: vi.fn(), printError: vi.fn() }));
const pauseId = 'b0bcb400-1dd5-4a92-8943-d4aacb6aca10';
const options = { pauseId, action: 'retry', idempotencyKey: 'stable-key' };
afterEach(() => { vi.clearAllMocks(); process.exitCode = 0; });
describe('document resolution', () => {
  it('builds an exact retry decision', async () => {
    expect(await buildResolution('statement', options)).toEqual({ pause_id: pauseId, action: 'retry', input: {} });
  });
  it('rejects statement split actions and invalid/extra payload fields', async () => {
    await expect(buildResolution('statement', { ...options, action: 'approve_split' })).rejects.toThrow('Statements');
    await expect(buildResolution('contract', { ...options, inputJson: '{"force":true}' })).rejects.toThrow('empty');
    await expect(buildResolution('contract', { ...options, idempotencyKey: '' })).rejects.toThrow('idempotency');
    await expect(buildResolution('contract', { ...options, pauseId: 'stale' })).rejects.toThrow('UUID');
  });
  it('validates structured split ranges', async () => {
    const agreement = { title: 'One', start_page: 1, end_page: 3, process: true };
    expect(await buildResolution('contract', { ...options, action: 'approve_split', inputJson: JSON.stringify({ agreements: [agreement] }) })).toEqual({ pause_id: pauseId, action: 'approve_split', input: { agreements: [agreement] } });
    for (const changed of [{ end_page: 0 }, { process: false }, { start_page: 1.5 }, { extra: true }]) {
      await expect(buildResolution('contract', { ...options, action: 'approve_split', inputJson: JSON.stringify({ agreements: [{ ...agreement, ...changed }] }) })).rejects.toThrow();
    }
  });
  it('accepts the API maximum of 128 agreements and rejects 129', async () => {
    const agreements = Array.from({ length: 128 }, (_, index) => ({ title: `Agreement ${index + 1}`, start_page: index + 1, end_page: index + 1, process: true }));
    await expect(buildResolution('contract', { ...options, action: 'approve_split', inputJson: JSON.stringify({ agreements }) })).resolves.toHaveProperty('action', 'approve_split');
    await expect(buildResolution('contract', { ...options, action: 'approve_split', inputJson: JSON.stringify({ agreements: [...agreements, agreements[0]] }) })).rejects.toThrow('1–128');
  });
  it.each(['contract', 'statement'] as const)('executes %s resolve with exact caller key and source pause', async kind => {
    const program = new Command(); registerDocumentResolutionCommand(program, kind);
    await program.parseAsync(['node', 'test', 'resolve', 'project-1', '42', '--pause-id', pauseId, '--action', 'retry', '--idempotency-key', 'stable-key', '--json']);
    expect(apiPost).toHaveBeenCalledWith(`/v1/${kind}s/staging/42/resolve?projectId=project-1`, { pause_id: pauseId, action: 'retry', input: {} }, undefined, { idempotencyKey: 'stable-key' });
  });
  it('rejects malformed input before making any request', async () => {
    const program = new Command(); registerDocumentResolutionCommand(program, 'contract');
    await program.parseAsync(['node', 'test', 'resolve', 'project-1', '42', '--pause-id', pauseId, '--action', 'retry', '--idempotency-key', 'stable-key', '--input-json', 'not-json']);
    expect(apiPost).not.toHaveBeenCalled(); expect(process.exitCode).toBe(1);
  });
});

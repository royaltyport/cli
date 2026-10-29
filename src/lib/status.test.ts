import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContractIngestion } from '../types/contracts.js';
import { getIngestionTerminalState, printIngestionStatus } from './status.js';

const data: ContractIngestion = {
  staging_id: 1, status: 'processing', phase: 'extraction', terminal: false,
  poll_after_seconds: 3, upload_status: 'uploaded', pause: null, error: null,
  resources: [], links: { self: '/v1/contracts/1/ingestion?projectId=p' },
  staging_processes: { stage: 'completed' }, staging_split_manifest: null,
  staging_split_processes: [], document_processes: [],
};
afterEach(() => vi.restoreAllMocks());

describe('Birch source-wide ingestion', () => {
  it('keeps watching while split siblings are processing', () => {
    expect(getIngestionTerminalState({ ...data, document_processes: [
      { id: 7, stage: 'completed', extractions: [] }, { id: 8, stage: 'processing', extractions: [] },
    ] })).toBeNull();
  });
  it.each(['failed', 'rejected', 'cancelled', 'timed_out'] as const)('reports terminal %s as failure', status => {
    expect(getIngestionTerminalState({ ...data, status, terminal: true })).toBe('failed');
  });
  it.each(['completed', 'skipped'] as const)('completes terminal %s', status => {
    expect(getIngestionTerminalState({ ...data, status, terminal: true })).toBe('completed');
  });
  it('stops watching a resumable pause', () => {
    expect(getIngestionTerminalState({ ...data, status: 'paused' })).toBe('action_required');
  });
  it('refuses unverifiable completion, including a contradictory terminal flag', () => {
    for (const terminal of [false, true]) {
      expect(() => getIngestionTerminalState({ ...data, status: 'unknown', terminal })).toThrow('cannot be verified');
    }
    expect(() => getIngestionTerminalState({ ...data, terminal: true })).toThrow('Invalid Birch terminal');
  });
  it('rejects incomplete responses instead of interpreting retired flags', () => {
    const incomplete = { ...data };
    Reflect.deleteProperty(incomplete, 'status');
    expect(() => getIngestionTerminalState(incomplete)).toThrow('status and terminal are required');
  });
  it('prints every document and only advertised resolution actions', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    printIngestionStatus({ ...data, status: 'paused', pause: {
      id: 'pause-1', type: 'split_required', code: 'split', message: 'Select agreements', details: {},
      actions: [{ type: 'approve_split', method: 'POST', href: '/resolve' }],
    }, document_processes: [
      { id: 7, stage: 'completed', extractions: [{ name: 'entities', status: 'completed', completed_at: null }] },
      { id: 8, stage: 'processing', extractions: [] },
    ] }, { resourceType: 'contract', projectId: 'project-1' });
    const output = log.mock.calls.flat().join(' ');
    expect(output).toContain('Contract 7');
    expect(output).toContain('Contract 8');
    expect(output).toContain('Available pause actions: approve_split');
    expect(output).toContain('contracts resolve --help');
    expect(output).not.toContain('Staging Done');
    expect(output).not.toContain('Extraction Done');
  });
  it('directs unsupported pauses to the Platform', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    printIngestionStatus({ ...data, status: 'paused', pause: {
      type: 'unknown', code: 'unsupported', message: 'Paused', details: {}, actions: [],
    } }, { resourceType: 'contract' });
    expect(log.mock.calls.flat().join(' ')).toContain('no API resolution is advertised');
  });
});

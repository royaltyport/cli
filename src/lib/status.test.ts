import { describe, expect, it, vi } from 'vitest';
import { getProcessTerminalState, printProcessStatus } from './status.js';
import type { ContractProcesses, StatementProcesses } from '../types/index.js';

const processInfo = (stage: string) => ({ stage, info: {} });

describe('getProcessTerminalState', () => {
  it('treats staging failure as terminal', () => {
    const data: StatementProcesses = {
      staging_id: 1,
      statement_id: null,
      staging_done: true,
      extraction_done: false,
      staging_processes: processInfo('failed'),
      extraction_processes: null,
    };
    expect(getProcessTerminalState(data, 'statement')).toBe('failed');
  });

  it('treats extraction failure as terminal', () => {
    const data: ContractProcesses = {
      staging_id: 1,
      contract_id: 2,
      staging_done: true,
      extraction_done: false,
      staging_processes: processInfo('completed'),
      extraction_processes: { stage: 'failed', extractions: [] },
    };
    expect(getProcessTerminalState(data, 'contract')).toBe('failed');
  });

  it('treats statement extraction failure as terminal', () => {
    const data: StatementProcesses = {
      staging_id: 1,
      statement_id: 2,
      staging_done: true,
      extraction_done: true,
      staging_processes: processInfo('completed'),
      extraction_processes: { stage: 'failed', step: 2, remarks: {} },
    };
    expect(getProcessTerminalState(data, 'statement')).toBe('failed');
  });

  it('returns completed only after both stages finish', () => {
    const data: ContractProcesses = {
      staging_id: 1,
      contract_id: 2,
      staging_done: true,
      extraction_done: true,
      staging_processes: processInfo('completed'),
      extraction_processes: { stage: 'completed', extractions: [] },
    };
    expect(getProcessTerminalState(data, 'contract')).toBe('completed');
  });

  it('stops watching when a paused upload requires action', () => {
    const data: ContractProcesses = {
      staging_id: 1,
      contract_id: null,
      staging_done: false,
      extraction_done: false,
      staging_processes: processInfo('paused'),
      extraction_processes: null,
    };
    expect(getProcessTerminalState(data, 'contract')).toBe('action_required');
  });
});


describe('source-wide status precedence', () => {
  const data: ContractProcesses = {
    staging_id: 1, contract_id: 2, staging_done: true, extraction_done: true,
    staging_processes: processInfo('completed'), extraction_processes: { stage: 'completed', extractions: [] },
  };
  it('keeps watching while another split sibling is processing', () => {
    expect(getProcessTerminalState({ ...data, status: 'processing', terminal: false }, 'contract')).toBeNull();
  });
  it('stops at an unsupported pause without relying on removed fields', () => {
    expect(getProcessTerminalState({ ...data, status: 'paused', terminal: false }, 'contract')).toBe('action_required');
  });
  it('reports failed source even if the legacy first child succeeded', () => {
    expect(getProcessTerminalState({ ...data, status: 'failed', terminal: true }, 'contract')).toBe('failed');
  });
  it('fails clearly instead of polling an unverified legacy split forever', () => {
    expect(() => getProcessTerminalState({ ...data, status: 'unknown', terminal: false }, 'contract')).toThrow('cannot be verified');
  });
});


describe('pause action display', () => {
  const data: ContractProcesses = {
    staging_id: 1, contract_id: null, staging_done: false, extraction_done: false, staging_processes: processInfo('paused'),
    extraction_processes: null, status: 'paused', terminal: false,
  };
  it('advertises split resolution from pause.actions without retired fields', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      printProcessStatus({ ...data, pause: { id: 'pause-1', type: 'split_required', code: 'contract-document-split', message: 'Split required', details: {}, actions: [{ type: 'approve_split', method: 'POST', href: '/resolve' }] } }, { resourceType: 'contract', projectId: 'project-1' });
      expect(log.mock.calls.flat().join(' ')).toContain('Available pause actions: approve_split');
      expect(log.mock.calls.flat().join(' ')).toContain('contracts resolve --help');
      expect(log.mock.calls.flat().join(' ')).not.toContain('contracts retry');
    } finally { log.mockRestore(); }
  });
  it('explains that an unsupported pause needs Platform attention', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      printProcessStatus({ ...data, pause: { code: 'unsupported', message: 'Paused', details: {}, actions: [] } }, { resourceType: 'contract', projectId: 'project-1' });
      expect(log.mock.calls.flat().join(' ')).toContain('no API resolution is advertised');
    } finally { log.mockRestore(); }
  });
});

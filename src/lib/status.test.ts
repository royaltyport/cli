import { describe, expect, it } from 'vitest';
import { getProcessTerminalState } from './status.js';
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

  it('treats a timed-out statement extraction as failed', () => {
    const data: StatementProcesses = {
      staging_id: 1,
      statement_id: 2,
      staging_done: true,
      extraction_done: true,
      staging_processes: processInfo('completed'),
      extraction_processes: { stage: 'timed_out', step: 2, remarks: {} },
    };
    expect(getProcessTerminalState(data, 'statement')).toBe('failed');
  });

  it('treats a skipped statement extraction as completed', () => {
    const data: StatementProcesses = {
      staging_id: 1,
      statement_id: 2,
      staging_done: true,
      extraction_done: true,
      staging_processes: processInfo('completed'),
      extraction_processes: { stage: 'skipped', step: 0, remarks: {} },
    };
    expect(getProcessTerminalState(data, 'statement')).toBe('completed');
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
});

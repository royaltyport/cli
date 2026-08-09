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
      processing_done: false,
      staging_processes: processInfo('failed'),
      processing_processes: null,
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

  it('treats statement processing failure as terminal', () => {
    const data: StatementProcesses = {
      staging_id: 1,
      statement_id: 2,
      staging_done: true,
      processing_done: true,
      staging_processes: processInfo('completed'),
      processing_processes: { status: 'failed', stage: 2, remarks: {} },
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
});

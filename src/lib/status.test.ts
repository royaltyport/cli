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
      staging_terminal: true,
      requires_action: false,
      available_actions: [],
      pause_reason: null,
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
      staging_terminal: true,
      requires_action: false,
      available_actions: [],
      pause_reason: null,
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
      staging_terminal: true,
      requires_action: false,
      available_actions: [],
      pause_reason: null,
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
      staging_terminal: true,
      requires_action: false,
      available_actions: [],
      pause_reason: null,
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
      staging_terminal: true,
      requires_action: true,
      available_actions: [],
      pause_reason: 'contract-document-split',
      staging_processes: processInfo('paused'),
      extraction_processes: null,
    };
    expect(getProcessTerminalState(data, 'contract')).toBe('action_required');
  });
});

import { describe, expect, it } from 'vitest';
import type { ContractCommitment } from '../types/contracts.js';
import {
  parseContractIncludes,
  summarizeCommitmentRecurring,
  summarizeLinkedDeliverables,
} from './contracts.js';

function commitment(overrides: Partial<ContractCommitment> = {}): ContractCommitment {
  return {
    id: 1,
    linked_deliverables: [],
    citations: [],
    linked_assets: [],
    ...overrides,
  };
}

describe('contract output helpers', () => {
  it('trims, removes empty values, and deduplicates includes', () => {
    expect(parseContractIncludes(' commitments, entities,commitments, ')).toEqual([
      'commitments',
      'entities',
    ]);
  });

  it('summarizes linked deliverables by fulfilled and required quantities', () => {
    expect(summarizeLinkedDeliverables(commitment({
      linked_deliverables: [
        { type: 'album', description: 'Studio albums', quantity: 2, fulfilled: 1 },
        { type: 'track', description: 'Album tracks', quantity: 10, fulfilled: 0 },
      ],
    }))).toBe('1/2 album, 0/10 track');
  });

  it('summarizes recurring commitments', () => {
    expect(summarizeCommitmentRecurring(commitment({
      recurring_quantity: '1',
      recurring_unit: 'year',
    }))).toBe('Every 1 year');
    expect(summarizeCommitmentRecurring(commitment())).toBe('-');
  });
});

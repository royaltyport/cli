import { describe, expect, it } from 'vitest';
import type { ContractCommitment } from '../types/contracts.js';
import {
  buildContractExtractionPath,
  CONTRACT_EXTRACTION_KEYS,
  parseContractExtractionKey,
  parseContractIncludes,
  summarizeCommitmentRecurring,
  summarizeContractExtractionItem,
  summarizeLinkedDeliverables,
} from './contracts.js';

function commitment(overrides: Partial<ContractCommitment> = {}): ContractCommitment {
  return {
    id: 1,
    internal_uuid: '11111111-1111-4111-8111-111111111111',
    created_at: '2026-08-21T10:00:00Z',
    updated_at: '2026-08-21T10:05:00Z',
    title: null,
    type: null,
    description: null,
    recurring_unit: null,
    recurring_quantity: null,
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

  it('validates dedicated extraction keys', () => {
    expect(CONTRACT_EXTRACTION_KEYS).toHaveLength(20);
    expect(parseContractExtractionKey('recordings')).toBe('recordings');
    expect(() => parseContractExtractionKey('unsupported')).toThrow('Invalid extraction');
  });

  it('builds the encoded dedicated extraction request', () => {
    expect(buildContractExtractionPath(
      'project/with query?',
      'contract/with query?',
      'recordings',
      { page: '2', perPage: '250', citations: true },
    )).toBe(
      '/v1/contracts/contract%2Fwith%20query%3F/extractions/recordings?projectId=project%2Fwith+query%3F&page=2&perPage=250&citations=true',
    );
  });

  it('summarizes generic extraction items', () => {
    expect(summarizeContractExtractionItem({ id: 1, name: 'Track' })).toBe('Track');
    expect(summarizeContractExtractionItem({ id: 2, title: 'Term' })).toBe('Term');
    expect(summarizeContractExtractionItem({ id: 3 })).toBe('-');
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

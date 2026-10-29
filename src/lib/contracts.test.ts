import { describe, expect, it } from 'vitest';
import {
  buildContractExtractionPath,
  CONTRACT_EXTRACTION_KEYS,
  parseContractExtractionKey,
  summarizeContractExtractionItem,
} from './contracts.js';

describe('contract output helpers', () => {
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

});

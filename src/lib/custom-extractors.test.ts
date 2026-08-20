import { describe, expect, it } from 'vitest';
import { parseExtractorIds } from './custom-extractors.js';

describe('parseExtractorIds', () => {
  it('parses and deduplicates IDs', () => {
    expect(parseExtractorIds('201, 202,201')).toEqual([201, 202]);
  });

  it.each(['', 'abc', '0', '-1', '2.5'])('rejects invalid input: %s', value => {
    expect(() => parseExtractorIds(value)).toThrow();
  });

  it('rejects more than 50 IDs', () => {
    expect(() => parseExtractorIds(Array.from({ length: 51 }, (_, index) => index + 1).join(','))).toThrow('at most 50');
  });
});

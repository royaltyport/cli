import { describe, expect, it } from 'vitest';
import { buildTagReplacement, parseTagNames, parseTagScope } from './tags.js';

describe('tag CLI input', () => {
  it('normalizes and de-duplicates comma-separated names', () => {
    expect(parseTagNames(' Priority,Quarterly, Priority ')).toEqual(['Priority', 'Quarterly']);
  });

  it('validates resource scopes', () => {
    expect(parseTagScope('contracts')).toBe('contracts');
    expect(parseTagScope('statements')).toBe('statements');
    expect(() => parseTagScope('artists')).toThrow('contracts, statements');
  });

  it('builds replacement and clear payloads', () => {
    expect(buildTagReplacement('Priority,Quarterly', undefined)).toEqual(['Priority', 'Quarterly']);
    expect(buildTagReplacement(undefined, true)).toEqual([]);
    expect(buildTagReplacement('', undefined)).toEqual([]);
  });

  it('rejects missing and conflicting replacement flags', () => {
    expect(() => buildTagReplacement(undefined, undefined)).toThrow('Provide --tags');
    expect(() => buildTagReplacement('Priority', true)).toThrow('not both');
  });
});

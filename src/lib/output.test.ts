import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printTable, printError, printSuccess, printInfo, printStatusLine } from './output.js';

describe('output', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('printTable', () => {
    it('prints header, separator, and rows', () => {
      printTable(['Name', 'Age'], [['Alice', 30], ['Bob', 25]]);

      expect(console.log).toHaveBeenCalledTimes(4); // header + separator + 2 rows
    });

    it('handles empty rows', () => {
      printTable(['Name'], []);

      expect(console.log).toHaveBeenCalledTimes(2); // header + separator only
    });
  });

  describe('printStatusLine', () => {
    it('filters out undefined values', () => {
      printStatusLine([['Name', 'test'], ['Age', undefined]]);

      const output = vi.mocked(console.log).mock.calls[0]![0] as string;
      expect(output).toContain('Name: test');
      expect(output).not.toContain('Age');
    });

    it('joins multiple entries with pipe', () => {
      printStatusLine([['A', 'one'], ['B', 'two']]);

      const output = vi.mocked(console.log).mock.calls[0]![0] as string;
      expect(output).toContain('|');
    });
  });

  describe('printError', () => {
    it('writes to stderr', () => {
      printError('something broke');

      expect(console.error).toHaveBeenCalledTimes(1);
      const output = vi.mocked(console.error).mock.calls[0]![0] as string;
      expect(output).toContain('something broke');
    });
  });

  describe('printSuccess', () => {
    it('writes to stdout', () => {
      printSuccess('it worked');

      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('printInfo', () => {
    it('writes to stdout', () => {
      printInfo('fyi');

      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });
});

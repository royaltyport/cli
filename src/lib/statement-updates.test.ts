import { describe, expect, it } from 'vitest';
import { buildStatementUpdatePatch } from './statement-updates.js';

describe('statement update CLI input', () => {
  it('maps command options to the API patch shape', () => {
    expect(buildStatementUpdatePatch({
      tags: 'Priority, Quarterly',
      payee: 'Ocean Wave Records Ltd',
      accountingPeriod: '2026Q1',
      transactionCurrency: 'USD',
      royaltyCurrency: 'GBP',
    })).toEqual({
      tags: ['Priority', 'Quarterly'],
      payee: 'Ocean Wave Records Ltd',
      accountingPeriod: '2026Q1',
      currencyTx: 'USD',
      currency: 'GBP',
    });
  });

  it('maps explicit clear flags to null or an empty tag list', () => {
    expect(buildStatementUpdatePatch({
      clearTags: true,
      clearPayee: true,
      clearTargetPeriod: true,
      clearRoyaltyCurrency: true,
    })).toEqual({
      tags: [],
      payee: null,
      targetPeriod: null,
      currency: null,
    });
  });

  it('requires at least one change', () => {
    expect(() => buildStatementUpdatePatch({})).toThrow('at least one');
  });

  it('rejects setting and clearing the same field', () => {
    expect(() => buildStatementUpdatePatch({ payor: 'Distributor', clearPayor: true }))
      .toThrow('not both');
    expect(() => buildStatementUpdatePatch({ tags: 'Priority', clearTags: true }))
      .toThrow('not both');
  });
});

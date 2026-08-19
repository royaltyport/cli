import { describe, expect, it } from 'vitest';
import { buildContractUploadContext, buildStatementUploadContext } from './upload-context.js';

describe('upload context options', () => {
  it('builds statement context and normalizes tag names', () => {
    expect(buildStatementUploadContext({
      accountingPeriod: '2026Q1',
      targetPeriod: '2026Q1',
      royaltyCurrency: 'GBP',
      transactionCurrency: 'USD',
      payee: 'Ocean Wave Records Ltd',
      payor: 'Absolute Marketing & Distribution Ltd',
      scenarioFamily: 'distribution.general',
      targetFamily: 'recording_distribution',
      tags: ' Priority,Quarterly,Priority ',
    })).toEqual({
      accountingPeriod: { value: '2026Q1' },
      targetPeriod: { value: '2026Q1' },
      currencyRoyalty: 'GBP',
      currencyTransaction: 'USD',
      payee: 'Ocean Wave Records Ltd',
      payor: 'Absolute Marketing & Distribution Ltd',
      classification: {
        scenarioFamily: 'distribution.general',
        targetFamily: 'recording_distribution',
      },
      tags: ['Priority', 'Quarterly'],
    });
  });

  it('builds contract tag context', () => {
    expect(buildContractUploadContext({ tags: 'Priority, Artist agreement' }))
      .toEqual({ tags: ['Priority', 'Artist agreement'] });
  });

  it('requires complete classification pairs', () => {
    expect(() => buildStatementUploadContext({ scenarioFamily: 'distribution.general' }))
      .toThrow('--target-family');
  });
});

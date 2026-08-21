import { parseTagNames } from './tags.js';
import type { StatementUpdatePatch, StatementsUpdateOptions } from '../types/statements.js';

type NullablePatchKey = Exclude<keyof StatementUpdatePatch, 'tags'>;

interface NullableField {
  option: keyof StatementsUpdateOptions;
  clearOption: keyof StatementsUpdateOptions;
  patch: NullablePatchKey;
  label: string;
}

const NULLABLE_FIELDS: readonly NullableField[] = [
  { option: 'payee', clearOption: 'clearPayee', patch: 'payee', label: 'payee' },
  { option: 'payor', clearOption: 'clearPayor', patch: 'payor', label: 'payor' },
  { option: 'accountingPeriod', clearOption: 'clearAccountingPeriod', patch: 'accountingPeriod', label: 'accounting period' },
  { option: 'targetPeriod', clearOption: 'clearTargetPeriod', patch: 'targetPeriod', label: 'target period' },
  { option: 'transactionCurrency', clearOption: 'clearTransactionCurrency', patch: 'currencyTx', label: 'transaction currency' },
  { option: 'royaltyCurrency', clearOption: 'clearRoyaltyCurrency', patch: 'currency', label: 'royalty currency' },
];

export function buildStatementUpdatePatch(options: StatementsUpdateOptions): StatementUpdatePatch {
  const patch: StatementUpdatePatch = {};
  const nullablePatch = patch as StatementUpdatePatch & Record<NullablePatchKey, string | null | undefined>;

  if (options.tags !== undefined && options.clearTags) {
    throw new Error('Use either --tags or --clear-tags, not both');
  }
  if (options.clearTags) patch.tags = [];
  else if (options.tags !== undefined) patch.tags = parseTagNames(options.tags);

  for (const field of NULLABLE_FIELDS) {
    const value = options[field.option];
    const clear = options[field.clearOption] === true;
    if (typeof value === 'string' && clear) {
      throw new Error(`Use either --${field.label.replaceAll(' ', '-')} or --clear-${field.label.replaceAll(' ', '-')}, not both`);
    }
    if (clear) nullablePatch[field.patch] = null;
    else if (typeof value === 'string') nullablePatch[field.patch] = value;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error('Provide at least one metadata value or --clear-* option');
  }

  return patch;
}

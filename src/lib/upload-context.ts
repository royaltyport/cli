import { parseTagNames } from './tags.js';
import type {
  ContractUploadContext,
  ContractsUploadOptions,
  StatementUploadContext,
  StatementsUploadOptions,
  UploadPeriod,
} from '../types/index.js';

function parseTags(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const tags = parseTagNames(value);
  return tags.length > 0 ? tags : undefined;
}

function buildPeriod(value: string | undefined): UploadPeriod | undefined {
  return value ? { value } : undefined;
}

export function buildContractUploadContext(options: ContractsUploadOptions): ContractUploadContext | undefined {
  const tags = parseTags(options.tags);
  return tags ? { tags } : undefined;
}

export function buildStatementUploadContext(options: StatementsUploadOptions): StatementUploadContext | undefined {
  const accountingPeriod = buildPeriod(options.accountingPeriod);
  const targetPeriod = buildPeriod(options.targetPeriod);
  const hasScenarioFamily = Boolean(options.scenarioFamily);
  const hasTargetFamily = Boolean(options.targetFamily);
  if (hasScenarioFamily !== hasTargetFamily) {
    throw new Error('--scenario-family and --target-family must be supplied together.');
  }
  const tags = parseTags(options.tags);

  const context: StatementUploadContext = {
    ...(accountingPeriod && { accountingPeriod }),
    ...(targetPeriod && { targetPeriod }),
    ...(options.royaltyCurrency && { currencyRoyalty: options.royaltyCurrency }),
    ...(options.transactionCurrency && { currencyTransaction: options.transactionCurrency }),
    ...(options.payee && { payee: options.payee }),
    ...(options.payor && { payor: options.payor }),
    ...(options.scenarioFamily && options.targetFamily && {
      classification: {
        scenarioFamily: options.scenarioFamily,
        targetFamily: options.targetFamily,
      },
    }),
    ...(tags && { tags }),
  };
  return Object.keys(context).length > 0 ? context : undefined;
}

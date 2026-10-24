import type { ContractCommitment, ContractExtractionKey } from '../types/contracts.js';

function defineCompleteExtractionKeys<const Keys extends readonly ContractExtractionKey[]>(
  keys: Keys & ([ContractExtractionKey] extends [Keys[number]]
    ? unknown
    : readonly ['Missing contract extraction keys', Exclude<ContractExtractionKey, Keys[number]>]),
): Keys {
  return keys;
}

export const CONTRACT_EXTRACTION_KEYS = defineCompleteExtractionKeys([
  'entities',
  'artists',
  'writers',
  'royalties',
  'splits',
  'costs',
  'compensations',
  'dates',
  'accounting-periods',
  'types',
  'languages',
  'signatures',
  'control-areas',
  'creative-approvals',
  'commitments',
  'balances',
  'recordings',
  'compositions',
  'relations',
  'targets',
] as const);

export interface ContractExtractionRequestOptions {
  expectedRevision?: string;
  page: string;
  perPage: string;
  citations?: boolean;
}

export function buildContractExtractionPath(
  projectId: string,
  contractId: string,
  extraction: ContractExtractionKey,
  options: ContractExtractionRequestOptions,
): string {
  const searchParams = new URLSearchParams({
    projectId,
    page: options.page,
    perPage: options.perPage,
  });
  if (options.citations) searchParams.set('citations', 'true');
  if (options.expectedRevision !== undefined) searchParams.set('expectedRevision', options.expectedRevision);

  return `/v1/contracts/${encodeURIComponent(contractId)}/extractions/${encodeURIComponent(extraction)}?${searchParams.toString()}`;
}

export function parseContractIncludes(value?: string): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
}

export function parseContractExtractionKey(value: string): ContractExtractionKey {
  if ((CONTRACT_EXTRACTION_KEYS as readonly string[]).includes(value)) {
    return value as ContractExtractionKey;
  }
  throw new Error(`Invalid extraction. Valid values: ${CONTRACT_EXTRACTION_KEYS.join(', ')}`);
}

export function summarizeContractExtractionItem(item: Record<string, unknown>): string {
  const summary = item.name
    ?? item.title
    ?? item.type
    ?? item.language
    ?? item.description
    ?? item.rule_id;
  return typeof summary === 'string' && summary.length > 0 ? summary : '-';
}

export function summarizeLinkedDeliverables(commitment: ContractCommitment): string {
  if (commitment.linked_deliverables.length === 0) return '-';
  return commitment.linked_deliverables
    .map(deliverable => `${deliverable.fulfilled}/${deliverable.quantity} ${deliverable.type}`)
    .join(', ');
}

export function summarizeCommitmentRecurring(commitment: ContractCommitment): string {
  if (!commitment.recurring_unit) return '-';
  if (!commitment.recurring_quantity) return commitment.recurring_unit;
  return `Every ${commitment.recurring_quantity} ${commitment.recurring_unit}`;
}

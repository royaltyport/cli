import type { ContractCommitment } from '../types/contracts.js';

export function parseContractIncludes(value?: string): string[] {
  if (!value) return [];
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
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

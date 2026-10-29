import { ApiError } from './api-error.js';
import { printError, printInfo } from './output.js';

export function printApiError(error: unknown): void {
  printError(error instanceof Error ? error.message : String(error));
  if (!(error instanceof ApiError)) return;
  const details = error.details;
  if (typeof details?.decision_id === 'string') printInfo(`Decision: ${JSON.stringify(details.decision_id)}`);
  const links = details?.links;
  if (typeof links?.self === 'string') printInfo(`Current processing: ${JSON.stringify(links.self)}`);
  if (typeof links?.agents === 'string') printInfo(`Check readiness: ${JSON.stringify(links.agents)}`);
  if (details?.code === 'resolution_response_contract_changed') {
    printInfo('Poll the existing processing URL. Keep the same decision and idempotency key.');
  }
}

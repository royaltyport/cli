import { afterEach, expect, it, vi } from 'vitest';
import { ApiError } from './api-error.js';
import { printApiError } from './api-error-output.js';

afterEach(() => vi.restoreAllMocks());
it('shows the existing decision and polling link without attempting recovery', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  printApiError(new ApiError('Poll existing decision', 409, { error: {
    code: 'resolution_response_contract_changed', decision_id: 'decision-1', links: { self: '/v1/contracts/42/ingestion?projectId=p' },
  } }));
  const text = log.mock.calls.flat().join(' ');
  expect(text).toContain('decision-1');
  expect(text).toContain('/v1/contracts/42/ingestion?projectId=p');
  expect(text).toContain('Keep the same decision and idempotency key');
});
it('shows the readiness link and escapes control characters in recovery values', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  printApiError(new ApiError('Check readiness', 409, { error: { code: 'readiness_changed',
    links: { agents: '/v1/contracts/42/agents?projectId=p\nnext' } } }));
  const text = log.mock.calls.flat().join(' ');
  expect(text).toContain('Check readiness:');
  expect(text).toContain('\\nnext');
  expect(text).not.toContain('\n');
});

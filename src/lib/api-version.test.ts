import { describe, expect, it } from 'vitest';
import { API_RELEASE, assertVersionedResponse, documentIngestionPath } from './api-version.js';

describe('fixed Birch contract', () => {
  it.each(['contract', 'statement'] as const)('uses the scoped %s ingestion endpoint', kind => {
    expect(documentIngestionPath(kind, '42/with space', 'project/1')).toBe(
      `/v1/${kind}s/42%2Fwith%20space/ingestion?projectId=project%2F1`,
    );
  });
  it.each([null, '2026-04-20.aster'])('rejects a successful incompatible response (%s)', version => {
    expect(() => assertVersionedResponse(new Response('{}', {
      headers: version ? { 'Royaltyport-Version': version } : {},
    }))).toThrow('Expected API release');
  });
  it('accepts Birch and pre-resolution authentication failures', () => {
    expect(() => assertVersionedResponse(new Response('{}', { headers: { 'Royaltyport-Version': API_RELEASE } }))).not.toThrow();
    expect(() => assertVersionedResponse(new Response('{}', { status: 401 }))).not.toThrow();
  });
});

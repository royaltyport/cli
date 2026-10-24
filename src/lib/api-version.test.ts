import { describe, it, expect } from 'vitest';
import { resolveApiVersion, assertVersionedOperation, assertVersionedResponse, DEFAULT_API_RELEASE, documentStatusPath } from './api-version.js';
const aster = '2026-04-20.aster';
const birch = '2026-10-20.birch';
describe('release selection', () => {
  it('uses flag > environment > profile > package pin', () => {
    expect(resolveApiVersion(aster, birch, birch)).toBe(aster);
    expect(resolveApiVersion(undefined, aster, birch)).toBe(aster);
    expect(resolveApiVersion(undefined, undefined, aster)).toBe(aster);
    expect(resolveApiVersion()).toBe(DEFAULT_API_RELEASE);
  });
  it.each(['latest', 'birch', '2026-10-20', '', '2026-10-20.birch,2026-04-20.aster'])('rejects %j', value => {
    expect(() => resolveApiVersion(value)).toThrow('Unsupported API version');
  });
  it('rejects resolution before network mutation under Aster', () => {
    expect(() => assertVersionedOperation('/v1/contracts/staging/42/resolve?projectId=p', aster)).toThrow('requires');
    expect(() => assertVersionedOperation('/v1/contracts/staging/42/resolve?projectId=p', birch)).not.toThrow();
  });
  it('verifies resolved contract and allows unresolved control-plane errors', () => {
    expect(() => assertVersionedResponse(new Response('{}'), birch)).toThrow('no release header');
    expect(() => assertVersionedResponse(new Response('{}', { headers: { 'Royaltyport-Version': aster } }), birch)).toThrow('Expected');
    expect(() => assertVersionedResponse(new Response('{}', { status: 401 }), birch)).not.toThrow();
  });
});


it('keeps the old retry operation Aster-only', () => {
  expect(() => assertVersionedOperation('/v1/contracts/staging/42/retry?projectId=p', '2026-10-20.birch')).toThrow('pause ID');
  expect(() => assertVersionedOperation('/v1/statements/staging/42/retry?projectId=p', '2026-04-20.aster')).not.toThrow();
});


describe.each(['contract', 'statement'] as const)('%s status route selection', kind => {
  it.each([aster, birch] as const)('uses the selected %s endpoint', version => {
    const endpoint = version === aster ? 'processes' : 'ingestion';
    const path = documentStatusPath(kind, '456', 'project-1', version);
    expect(path).toBe(`/v1/${kind}s/456/${endpoint}?projectId=project-1`);
    expect(() => assertVersionedOperation(path, version)).not.toThrow();
    const other = path.replace(`/${endpoint}?`, endpoint === 'ingestion' ? '/processes?' : '/ingestion?');
    expect(() => assertVersionedOperation(other, version)).toThrow('/ingestion');
  });
});


it.each([
  '/v1/agents/runs?projectId=p', '/v1/agents/runs/run-id?projectId=p',
  '/v1/contracts/42/agents?projectId=p', '/v1/statements/42/agents?projectId=p',
  '/v1/contracts/42/extractions/recordings?projectId=p&expectedRevision=r1_token',
])('gates Birch-only inspection before network: %s', path => {
  expect(() => assertVersionedOperation(path, aster)).toThrow('2026-10-20.birch');
  expect(() => assertVersionedOperation(path, birch)).not.toThrow();
});


it.each(['/v1/contracts?includes=types', '/v1/contracts/42?includes=', '/v1/contracts/42?includes=commitments'])('uses dedicated extraction reads in Birch: %s', path => {
  expect(() => assertVersionedOperation(path, birch)).toThrow('contracts extractions');
  expect(() => assertVersionedOperation(path, aster)).not.toThrow();
});

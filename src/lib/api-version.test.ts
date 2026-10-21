import { describe, it, expect } from 'vitest';
import { resolveApiVersion, assertVersionedOperation, assertVersionedResponse, DEFAULT_API_RELEASE } from './api-version.js';
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

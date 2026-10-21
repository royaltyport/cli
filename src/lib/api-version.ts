export const API_RELEASES = ['2026-04-20.aster', '2026-10-20.birch'] as const;
export type ApiVersion = typeof API_RELEASES[number];
export const DEFAULT_API_RELEASE: ApiVersion = '2026-10-20.birch';
export const API_VERSION_HEADER = 'Royaltyport-Version';

/** Keep package SemVer (--version) separate from wire-contract selection. */
export function resolveApiVersion(flag?: string, environment?: string, profile?: string): ApiVersion {
  const value = flag ?? environment ?? profile ?? DEFAULT_API_RELEASE;
  if (!API_RELEASES.some(release => release === value)) {
    throw new Error(`Unsupported API version ${JSON.stringify(value)}. Choose ${API_RELEASES.join(' or ')}.`);
  }
  return value as ApiVersion;
}

export function assertVersionedResponse(response: Response, expected: ApiVersion): void {
  const actual = response.headers.get(API_VERSION_HEADER);
  if ((response.ok || actual !== null) && actual !== expected) {
    throw new Error(`Expected API release ${expected}, received ${actual ?? 'no release header'}.`);
  }
}

export function assertVersionedOperation(path: string, version: ApiVersion): void {
  if (version === '2026-10-20.birch' && /\/staging\/[^/]+\/retry(?:[?]|$)/.test(path)) {
    throw new Error('Birch admission retry requires resolve with the current pause ID and an idempotency key. The retry command is Aster-only.');
  }
  if (version === '2026-04-20.aster' && /\/staging\/[^/]+\/resolve(?:[?]|$)/.test(path)) {
    throw new Error('Admission resolution requires --api-version 2026-10-20.birch.');
  }
}

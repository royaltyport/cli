export const API_RELEASE = '2026-10-20.birch' as const;
export const API_VERSION_HEADER = 'Royaltyport-Version';

export function assertVersionedResponse(response: Response): void {
  const actual = response.headers.get(API_VERSION_HEADER);
  if ((response.ok || actual !== null) && actual !== API_RELEASE) {
    throw new Error(`Expected API release ${API_RELEASE}, received ${actual ?? 'no release header'}.`);
  }
}

export function documentIngestionPath(kind: 'contract' | 'statement', stagingId: string, projectId: string): string {
  return `/v1/${kind}s/${encodeURIComponent(stagingId)}/ingestion?projectId=${encodeURIComponent(projectId)}`;
}

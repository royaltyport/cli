export function parseExtractorIds(value: string): number[] {
  const items = value.split(',').map(item => item.trim()).filter(Boolean);
  const ids = items.map(Number);
  if (ids.length === 0) throw new Error('--extractor-ids must contain at least one ID');
  if (ids.length > 50) throw new Error('--extractor-ids accepts at most 50 IDs');
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error('--extractor-ids must be a comma-separated list of positive integers');
  }
  return [...new Set(ids)];
}

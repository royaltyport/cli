import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';

describe('Artists (integration)', () => {
  it('lists artists with pagination shape', async () => {
    const response = await get(`/v1/artists?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('per_page');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('lists artists with includeMerged', async () => {
    const response = await get(`/v1/artists?projectId=${PROJECT_ID}&includeMerged=true`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
  });
});

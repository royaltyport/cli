import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';

describe('Compositions (integration)', () => {
  it('lists compositions with pagination shape', async () => {
    const response = await get(`/v1/compositions?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });
});

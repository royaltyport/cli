import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';

describe('Entities (integration)', () => {
  it('lists entities with pagination shape', async () => {
    const response = await get(`/v1/entities?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';

describe('Recordings (integration)', () => {
  it('lists recordings with pagination shape', async () => {
    const response = await get(`/v1/recordings?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('lists recordings with includeProducts', async () => {
    const response = await get(`/v1/recordings?projectId=${PROJECT_ID}&includeProducts=true`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
  });
});

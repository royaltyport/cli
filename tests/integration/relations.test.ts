import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';
import { ApiError } from '../../src/lib/api.js';

describe('Relations (integration)', () => {
  it('lists relations with pagination shape', async () => {
    const response = await get(`/v1/relations?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('gets a relation by ID', async () => {
    const listResponse = await get(`/v1/relations?projectId=${PROJECT_ID}&page=1&perPage=1`);
    const listData = listResponse.data as Record<string, unknown>;
    const items = listData.items as Array<Record<string, unknown>>;
    if (items.length === 0) return;

    const relationId = items[0].id;
    const response = await get(`/v1/relations/${relationId}?projectId=${PROJECT_ID}`);
    const data = response.data as Record<string, unknown>;

    expect(data.id).toBe(relationId);
    expect(typeof data.name).toBe('string');
    expect(typeof data.created_at).toBe('string');
  });

  it('returns 404 for non-existent relation ID', async () => {
    try {
      await get(`/v1/relations/999999999?projectId=${PROJECT_ID}`);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});

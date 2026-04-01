import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';
import { ApiError } from '../../src/lib/api.js';

describe('Compositions (integration)', () => {
  it('lists compositions with pagination shape', async () => {
    const response = await get(`/v1/compositions?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('gets a composition by ID', async () => {
    const listResponse = await get(`/v1/compositions?projectId=${PROJECT_ID}&page=1&perPage=1`);
    const listData = listResponse.data as Record<string, unknown>;
    const items = listData.items as Array<Record<string, unknown>>;
    if (items.length === 0) return;

    const compositionId = items[0].id;
    const response = await get(`/v1/compositions/${compositionId}?projectId=${PROJECT_ID}`);
    const data = response.data as Record<string, unknown>;

    expect(data.id).toBe(compositionId);
    expect(typeof data.name).toBe('string');
    expect(typeof data.created_at).toBe('string');
  });

  it('returns 404 for non-existent composition ID', async () => {
    try {
      await get(`/v1/compositions/999999999?projectId=${PROJECT_ID}`);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});

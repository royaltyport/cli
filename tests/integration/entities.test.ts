import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';
import { ApiError } from '../../src/lib/api.js';

describe('Entities (integration)', () => {
  it('lists entities with pagination shape', async () => {
    const response = await get(`/v1/entities?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('gets an entity by ID', async () => {
    const listResponse = await get(`/v1/entities?projectId=${PROJECT_ID}&page=1&perPage=1`);
    const listData = listResponse.data as Record<string, unknown>;
    const items = listData.items as Array<Record<string, unknown>>;
    if (items.length === 0) return;

    const entityId = items[0].id;
    const response = await get(`/v1/entities/${entityId}?projectId=${PROJECT_ID}`);
    const data = response.data as Record<string, unknown>;

    expect(data.id).toBe(entityId);
    expect(typeof data.name).toBe('string');
    expect(typeof data.created_at).toBe('string');
  });

  it('returns 404 for non-existent entity ID', async () => {
    try {
      await get(`/v1/entities/999999999?projectId=${PROJECT_ID}`);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});

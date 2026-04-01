import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';
import { ApiError } from '../../src/lib/api.js';

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

  it('gets a recording by ID', async () => {
    const listResponse = await get(`/v1/recordings?projectId=${PROJECT_ID}&page=1&perPage=1`);
    const listData = listResponse.data as Record<string, unknown>;
    const items = listData.items as Array<Record<string, unknown>>;
    if (items.length === 0) return;

    const recordingId = items[0].id;
    const response = await get(`/v1/recordings/${recordingId}?projectId=${PROJECT_ID}`);
    const data = response.data as Record<string, unknown>;

    expect(data.id).toBe(recordingId);
    expect(typeof data.name).toBe('string');
    expect(typeof data.created_at).toBe('string');
  });

  it('returns 404 for non-existent recording ID', async () => {
    try {
      await get(`/v1/recordings/999999999?projectId=${PROJECT_ID}`);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});

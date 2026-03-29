import { describe, it, expect } from 'vitest';
import { get, PROJECT_ID } from './setup.js';
import { ApiError } from '../../src/lib/api.js';

describe('Search (integration)', () => {
  it('searches across all resource types', async () => {
    const response = await get(`/v1/projects/${PROJECT_ID}/search?q=test`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('recordings');
    expect(data).toHaveProperty('compositions');
    expect(data).toHaveProperty('contracts');
    expect(data).toHaveProperty('entities');
    expect(data).toHaveProperty('artists');
    expect(data).toHaveProperty('writers');
  });

  it('rejects empty search query with ApiError', async () => {
    await expect(
      get(`/v1/projects/${PROJECT_ID}/search?q=`),
    ).rejects.toThrow(ApiError);
  });

  it('handles special characters in query', async () => {
    const response = await get(`/v1/projects/${PROJECT_ID}/search?q=${encodeURIComponent('test & "special"')}`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('recordings');
  });
});

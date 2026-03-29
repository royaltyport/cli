import { describe, it, expect } from 'vitest';
import { apiGet, ApiError } from '../../src/lib/api.js';

describe('Error handling (integration)', () => {
  it('throws ApiError with invalid token', async () => {
    await expect(
      apiGet('/v1/projects', 'rp_invalid_token_12345'),
    ).rejects.toThrow(ApiError);
  });

  it('error includes status and message', async () => {
    try {
      await apiGet('/v1/projects', 'rp_invalid_token_12345');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const error = err as ApiError;
      expect(error.status).toBe(401);
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
    }
  });
});

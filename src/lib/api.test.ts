import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost, requireAuth, apiUploadJson, ApiError } from './api.js';

vi.mock('./config.js', () => ({
  getToken: vi.fn(() => 'test-token'),
  getApiUrl: vi.fn(() => 'https://api.example.com'),
  getAuthMethod: vi.fn(() => 'token'),
  getAccessToken: vi.fn(() => ''),
  getRefreshToken: vi.fn(() => ''),
  isTokenExpired: vi.fn(() => false),
  setOAuthTokens: vi.fn(),
}));

vi.mock('./oauth.js', () => ({
  refreshAccessToken: vi.fn(),
}));

function mockResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: new Headers(),
  });
}

describe('api', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiGet', () => {
    it('sends GET request with correct URL and auth header', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ data: { id: 1 } }));

      const result = await apiGet('/v1/projects', 'my-token');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/v1/projects',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
        }),
      );
      expect(result.data).toEqual({ id: 1 });
    });

    it('throws ApiError on non-ok response', async () => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve(mockResponse({ error: { message: 'Not found' } }, { status: 404 })),
      );

      await expect(apiGet('/v1/projects/bad', 'token')).rejects.toThrow(ApiError);
      await expect(apiGet('/v1/projects/bad', 'token')).rejects.toThrow('Not found');
    });

    it('extracts error message from different response shapes', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ message: 'fallback message' }, { status: 500 }));

      await expect(apiGet('/v1/test', 'token')).rejects.toThrow('fallback message');
    });
  });

  describe('apiPost', () => {
    it('sends POST request with JSON body', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ data: { created: true } }));

      const result = await apiPost('/v1/sandbox/connect', { foo: 'bar' }, 'my-token');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/v1/sandbox/connect',
        expect.objectContaining({
          method: 'POST',
          body: '{"foo":"bar"}',
        }),
      );
      expect(result.data).toEqual({ created: true });
    });
  });

  describe('requireAuth', () => {
    it('returns token when auth method is token', async () => {
      const token = await requireAuth();
      expect(token).toBe('test-token');
    });

    it('throws when no token is set', async () => {
      const config = await import('./config.js');
      vi.mocked(config.getToken).mockReturnValue('');

      await expect(requireAuth()).rejects.toThrow(ApiError);
      await expect(requireAuth()).rejects.toThrow('Not authenticated');

      // Restore for other tests
      vi.mocked(config.getToken).mockReturnValue('test-token');
    });
  });

  describe('SSE parsing', () => {
    it('parses progress and complete events from upload', async () => {
      const sseBody = [
        'event: progress\ndata: {"bytesUploaded":500,"bytesTotal":1000,"percent":50}\n\n',
        'event: complete\ndata: {"data":{"staging_id":42}}\n\n',
      ].join('');

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseBody));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValue(
        new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
      );

      const events: unknown[] = [];
      const result = await apiUploadJson('/v1/contracts', {}, (e) => events.push(e), 'token');

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ event: 'progress', data: { bytesUploaded: 500, bytesTotal: 1000, percent: 50 } });
      expect(result.data).toEqual({ staging_id: 42 });
    });

    it('throws on SSE error event', async () => {
      const sseBody = 'event: error\ndata: {"message":"Upload failed"}\n\n';
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseBody));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValue(
        new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
      );

      await expect(apiUploadJson('/v1/test', {}, undefined, 'token')).rejects.toThrow('Upload failed');
    });
  });
});

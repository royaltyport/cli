import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost, apiPostRetry, apiPutExternal, apiUploadFlow, requireAuth, ApiError, MAX_FILE_SIZE } from './api.js';

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

  describe('error envelope parsing', () => {
    it('flattens Zod fieldErrors into a readable message', async () => {
      fetchSpy.mockResolvedValue(mockResponse(
        { error: { fileSize: ['fileSize exceeds maximum of 52428800 bytes'], fileName: ['Required'] } },
        { status: 400 },
      ));

      await expect(apiGet('/v1/statements/uploads', 'token')).rejects.toThrow(
        'fileSize: fileSize exceeds maximum of 52428800 bytes; fileName: Required',
      );
    });
  });

  describe('apiPostRetry', () => {
    it('retries on 429 honoring Retry-After, then succeeds', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
          status: 429,
          headers: { 'Retry-After': '0' },
        }))
        .mockResolvedValueOnce(mockResponse({ data: { ok: true } }));

      const result = await apiPostRetry('/v1/statements/uploads', {}, {}, 'token');

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ ok: true });
    });

    it('does not retry non-retryable statuses', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ error: { message: 'bad request' } }, { status: 400 }));

      await expect(apiPostRetry('/v1/test', {}, {}, 'token')).rejects.toThrow('bad request');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not retry network errors when retry is false', async () => {
      fetchSpy.mockRejectedValue(new TypeError('fetch failed'));

      await expect(
        apiPostRetry('/v1/statements/uploads/complete', { stagingId: 1 }, { retry: false }, 'token'),
      ).rejects.toThrow('fetch failed');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('does not retry retryable responses when retry is false', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ error: { message: 'server failed' } }, { status: 500 }));

      await expect(
        apiPostRetry('/v1/statements/uploads', {}, { retry: false }, 'token'),
      ).rejects.toThrow('server failed');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('apiPutExternal', () => {
    it('PUTs to the exact signed URL without an Authorization header', async () => {
      fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }));
      const signedUrl = 'https://storage.example.com/object/upload/sign/abc?token=xyz';
      const bytes = new TextEncoder().encode('%PDF-1.4 test');

      await apiPutExternal(signedUrl, {
        headers: { 'content-type': 'application/pdf', 'x-upsert': 'true' },
        body: bytes,
      });

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(signedUrl);
      expect(init.method).toBe('PUT');
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['x-upsert']).toBe('true');
      expect(init.body).toBe(bytes);
    });

    it('retries a 500 response and re-sends the body', async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response('storage error', { status: 500 }))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }));
      const bytes = new TextEncoder().encode('%PDF-1.4 retry');

      await apiPutExternal('https://storage.example.com/sign/abc', {
        headers: { 'content-type': 'application/pdf', 'x-upsert': 'true' },
        body: bytes,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect((fetchSpy.mock.calls[1] as [string, RequestInit])[1].body).toBe(bytes);
    });
  });

  describe('apiUploadFlow', () => {
    const SIGNED_URL = 'https://storage.example.com/object/upload/sign/proj/statements_staging/9?token=xyz';

    function mockFlowResponses() {
      fetchSpy
        .mockResolvedValueOnce(mockResponse(
          { data: { staging_id: 123, upload_url: SIGNED_URL, file_path: 'proj/statements_staging/9' } },
          { status: 201 },
        ))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }))
        .mockResolvedValueOnce(mockResponse({ data: { staging_id: 123, status: 'uploaded' } }));
    }

    it('runs mint -> PUT -> complete in order with correct requests', async () => {
      mockFlowResponses();
      const bytes = new TextEncoder().encode('%PDF-1.4 unit test');

      const result = await apiUploadFlow(
        'statements',
        'proj-1',
        { bytes, fileName: 'statement.pdf' },
        { token: 'token' },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(3);

      const [mintUrl, mintInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(mintUrl).toBe('https://api.example.com/v1/statements/uploads?projectId=proj-1');
      expect(JSON.parse(mintInit.body as string)).toEqual({
        fileName: 'statement.pdf',
        fileType: 'application/pdf',
        fileSize: bytes.byteLength,
        fileExtension: 'pdf',
      });

      const [putUrl, putInit] = fetchSpy.mock.calls[1] as [string, RequestInit];
      expect(putUrl).toBe(SIGNED_URL);
      expect((putInit.headers as Record<string, string>)['Authorization']).toBeUndefined();

      const [completeUrl, completeInit] = fetchSpy.mock.calls[2] as [string, RequestInit];
      expect(completeUrl).toBe('https://api.example.com/v1/statements/uploads/complete?projectId=proj-1');
      expect(JSON.parse(completeInit.body as string)).toEqual({ stagingId: 123 });

      expect(result).toEqual({ staging_id: 123, status: 'uploaded', file_path: 'proj/statements_staging/9' });
    });

    it('sends extractions as a real JSON array and reports steps', async () => {
      mockFlowResponses();
      const steps: string[] = [];

      await apiUploadFlow(
        'contracts',
        'proj-1',
        { bytes: new TextEncoder().encode('%PDF-1.4'), fileName: 'contract.pdf' },
        { extractions: ['extract-dates', 'extract-signatures'], token: 'token', onStep: (s) => steps.push(s) },
      );

      const mintBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(mintBody.extractions).toEqual(['extract-dates', 'extract-signatures']);
      expect(steps).toEqual(['Requesting upload URL', 'Uploading file', 'Finalizing upload']);
    });

    it('omits fileExtension for dot-less file names', async () => {
      mockFlowResponses();

      await apiUploadFlow(
        'statements',
        'proj-1',
        { bytes: new TextEncoder().encode('%PDF-1.4'), fileName: 'statement' },
        { token: 'token' },
      );

      const mintBody = JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string);
      expect(mintBody).not.toHaveProperty('fileExtension');
    });

    it('rejects oversized files locally with zero network calls', async () => {
      await expect(
        apiUploadFlow(
          'statements',
          'proj-1',
          { bytes: new Uint8Array(MAX_FILE_SIZE + 1), fileName: 'big.pdf' },
          { token: 'token' },
        ),
      ).rejects.toThrow('fileSize exceeds maximum');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects non-PDF extensions locally with zero network calls', async () => {
      await expect(
        apiUploadFlow(
          'statements',
          'proj-1',
          { bytes: new TextEncoder().encode('a,b,c'), fileName: 'data.csv' },
          { token: 'token' },
        ),
      ).rejects.toThrow('Only PDF files');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('does not retry an ambiguous network failure at complete and surfaces the staging ID', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse(
          { data: { staging_id: 123, upload_url: SIGNED_URL, file_path: 'p' } },
          { status: 201 },
        ))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }))
        .mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect(
        apiUploadFlow(
          'statements',
          'proj-1',
          { bytes: new TextEncoder().encode('%PDF-1.4'), fileName: 's.pdf' },
          { token: 'token' },
        ),
      ).rejects.toThrow(/staging ID 123.*royaltyport statements complete proj-1 123/s);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });
});

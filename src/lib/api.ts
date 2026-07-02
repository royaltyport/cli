import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { UploadFlowInput, UploadFlowOptions, UploadFlowResult, UploadUrlResult } from '../types/index.js';
import {
  getToken,
  getApiUrl,
  getAuthMethod,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  setOAuthTokens,
} from './config.js';
import { refreshAccessToken } from './oauth.js';

export const MAX_FILE_SIZE = 52_428_800; // 50 MB, enforced server-side at complete
export const ALLOWED_FILE_TYPE = 'application/pdf';

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 60_000;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

function throwApiError(res: Response, body: Record<string, unknown>): never {
  const error = body?.error as Record<string, unknown> | string | undefined;

  // Zod validation failures arrive as fieldErrors with no .message:
  // { "error": { "fileSize": ["fileSize exceeds maximum..."] } }
  let fields: Record<string, string[]> | undefined;
  if (typeof error === 'object' && error !== null && error.message === undefined) {
    fields = error as Record<string, string[]>;
  }

  const msg = (typeof error === 'object' ? error?.message as string : undefined)
    || (fields && Object.entries(fields)
      .map(([field, msgs]) => `${field}: ${(Array.isArray(msgs) ? msgs : [msgs]).join(', ')}`)
      .join('; '))
    || (typeof error === 'string' ? error : undefined)
    || (body?.message as string)
    || `Request failed with status ${res.status}`;
  throw new ApiError(msg, res.status, body);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function retryDelay(attempt: number, headers?: Headers): number {
  const retryAfterHeader = headers?.get('retry-after');
  if (retryAfterHeader != null && retryAfterHeader !== '') {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
  return Math.min(delay + delay * 0.1 * Math.random(), RETRY_MAX_DELAY_MS);
}

export async function requireAuth(): Promise<string> {
  const method = getAuthMethod();

  if (method === 'oauth') {
    let accessToken = getAccessToken();
    if (!accessToken) {
      throw new ApiError('Not authenticated. Run `royaltyport login` first.', 401);
    }

    if (isTokenExpired()) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new ApiError('Session expired. Run `royaltyport login` to re-authenticate.', 401);
      }
      const tokens = await refreshAccessToken(refreshToken);
      setOAuthTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
      accessToken = tokens.access_token;
    }

    return accessToken;
  }

  const token = getToken();
  if (!token) {
    throw new ApiError('Not authenticated. Run `royaltyport login` first.', 401);
  }
  return token;
}

export async function apiGet(path: string, token?: string): Promise<Record<string, unknown>> {
  const baseUrl = getApiUrl();
  const resolvedToken = token || await requireAuth();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildHeaders(resolvedToken),
  });
  const body = await parseResponse(res);
  if (!res.ok) {
    throwApiError(res, body);
  }
  return body;
}

export async function apiPost(path: string, data: unknown, token?: string): Promise<Record<string, unknown>> {
  const baseUrl = getApiUrl();
  const resolvedToken = token || await requireAuth();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: buildHeaders(resolvedToken),
    body: JSON.stringify(data),
  });
  const body = await parseResponse(res);
  if (!res.ok) {
    throwApiError(res, body);
  }
  return body;
}

export async function apiDelete(path: string, token?: string): Promise<Record<string, unknown>> {
  const baseUrl = getApiUrl();
  const resolvedToken = token || await requireAuth();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(resolvedToken),
  });
  const body = await parseResponse(res);
  if (!res.ok) {
    throwApiError(res, body);
  }
  return body;
}

export interface PostRetryOptions {
  // When false, a network failure after the request is sent is NOT retried:
  // the server may have already received and acted on it (used for uploads/complete).
  retryNetworkErrors?: boolean;
}

export async function apiPostRetry(
  path: string,
  data: unknown,
  options: PostRetryOptions = {},
  token?: string,
): Promise<Record<string, unknown>> {
  const { retryNetworkErrors = true } = options;
  const baseUrl = getApiUrl();
  const resolvedToken = token || await requireAuth();

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: buildHeaders(resolvedToken),
        body: JSON.stringify(data),
      });
    } catch (err) {
      lastError = err;
      if (retryNetworkErrors && attempt < MAX_RETRIES) {
        await sleep(retryDelay(attempt));
        continue;
      }
      throw err;
    }

    if (res.ok) {
      return parseResponse(res);
    }
    if (attempt < MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
      await sleep(retryDelay(attempt, res.headers));
      continue;
    }
    throwApiError(res, await parseResponse(res));
  }

  throw lastError;
}

// PUT raw bytes to an absolute signed storage URL. The URL authorizes itself via
// its query string — no Authorization header, no base-URL prefixing.
export async function apiPutExternal(
  url: string,
  opts: { headers: Record<string, string>; body: Uint8Array },
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'PUT',
        headers: opts.headers,
        body: opts.body as BodyInit,
      });
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(retryDelay(attempt));
        continue;
      }
      throw err;
    }

    if (res.ok) return;
    if (attempt < MAX_RETRIES && (res.status === 429 || res.status >= 500)) {
      await sleep(retryDelay(attempt, res.headers));
      continue;
    }
    const text = await res.text();
    throw new ApiError(text || `Upload failed with status ${res.status}`, res.status);
  }

  throw lastError;
}

// 3-step signed-URL upload: mint an upload URL, PUT the bytes to storage, complete.
export async function apiUploadFlow(
  resource: 'statements' | 'contracts',
  projectId: string,
  input: UploadFlowInput,
  options: UploadFlowOptions = {},
): Promise<UploadFlowResult> {
  let bytes: Uint8Array;
  let fileName: string;
  if (input.bytes) {
    bytes = input.bytes;
    fileName = input.fileName ?? 'upload.pdf';
  } else if (input.filePath) {
    bytes = new Uint8Array(await readFile(input.filePath));
    fileName = input.fileName ?? basename(input.filePath);
  } else if (input.base64) {
    bytes = new Uint8Array(Buffer.from(input.base64, 'base64'));
    fileName = input.fileName ?? 'upload.pdf';
  } else {
    throw new ApiError('No file provided.', 400);
  }

  const fileType = ALLOWED_FILE_TYPE;
  const fileSize = bytes.byteLength;
  const dot = fileName.lastIndexOf('.');
  const fileExtension = dot > 0 ? fileName.slice(dot + 1) : undefined;

  // Preflight: reject locally before any network call
  if (fileExtension && fileExtension.toLowerCase() !== 'pdf') {
    throw new ApiError(`Only PDF files can be uploaded (got .${fileExtension}).`, 400);
  }
  if (fileSize > MAX_FILE_SIZE) {
    throw new ApiError(`fileSize exceeds maximum of ${MAX_FILE_SIZE} bytes (50 MB).`, 400);
  }

  options.onStep?.('Requesting upload URL');
  const mint = await apiPostRetry(
    `/v1/${resource}/uploads?projectId=${projectId}`,
    {
      fileName,
      fileType,
      fileSize,
      ...(fileExtension && { fileExtension }),
      ...(options.extractions && { extractions: options.extractions }),
    },
    {},
    options.token,
  );
  const { staging_id, upload_url, file_path } = mint.data as unknown as UploadUrlResult;

  options.onStep?.('Uploading file');
  try {
    await apiPutExternal(upload_url, {
      headers: { 'content-type': fileType, 'x-upsert': 'true' },
      body: bytes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      `Failed to upload file bytes (staging ID ${staging_id}): ${msg}`,
      err instanceof ApiError ? err.status : 0,
    );
  }

  options.onStep?.('Finalizing upload');
  try {
    await apiPostRetry(
      `/v1/${resource}/uploads/complete?projectId=${projectId}`,
      { stagingId: staging_id },
      { retryNetworkErrors: false },
      options.token,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ApiError(
      `The file was uploaded (staging ID ${staging_id}) but finalizing failed: ${msg} `
      + `Re-run finalization without re-uploading: royaltyport ${resource} complete ${projectId} ${staging_id}`,
      err instanceof ApiError ? err.status : 0,
    );
  }

  return { staging_id, status: 'uploaded', file_path };
}

export async function apiUploadComplete(
  resource: 'statements' | 'contracts',
  projectId: string,
  stagingId: number,
  token?: string,
): Promise<Record<string, unknown>> {
  return apiPostRetry(
    `/v1/${resource}/uploads/complete?projectId=${projectId}`,
    { stagingId },
    { retryNetworkErrors: false },
    token,
  );
}

export async function apiDownloadFile(signedUrl: string, destPath: string): Promise<string> {
  const res = await fetch(signedUrl);
  if (!res.ok) {
    throw new ApiError(`Download failed with status ${res.status}`, res.status);
  }
  writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
  return destPath;
}

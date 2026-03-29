import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { SseEvent, SseEventCallback } from '../types/index.js';
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

async function parseSseResponse(res: Response, onEvent?: SseEventCallback): Promise<Record<string, unknown>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop()!;

    for (const part of parts) {
      let event = 'message';
      let data = '';

      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7);
        else if (line.startsWith('data: ')) data = line.slice(6);
      }

      if (!data) continue;

      const parsed = JSON.parse(data) as Record<string, unknown>;
      onEvent?.({ event, data: parsed });

      if (event === 'error') {
        throw new ApiError((parsed.message as string) || 'Request failed', 500);
      }
      if (event === 'complete') {
        result = parsed;
      }
    }
  }

  if (!result) {
    throw new ApiError('Stream ended without a complete event', 500);
  }

  return result;
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
    const msg = (body?.error as Record<string, unknown>)?.message as string
      || (body?.message as string)
      || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
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
    const msg = (body?.error as Record<string, unknown>)?.message as string
      || (body?.message as string)
      || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
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
    const msg = (body?.error as Record<string, unknown>)?.message as string
      || (body?.message as string)
      || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
  return body;
}

export async function apiUploadMultipart(
  path: string,
  filePath: string,
  fields: Record<string, string> = {},
  onEvent?: SseEventCallback,
  token?: string,
): Promise<Record<string, unknown>> {
  const baseUrl = getApiUrl();
  const resolvedToken = token || await requireAuth();

  const fileBuffer = readFileSync(filePath);
  const fileName = basename(filePath);

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  form.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), fileName);

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resolvedToken}`,
      'Accept': 'text/event-stream',
    },
    body: form,
  });

  if (!res.ok) {
    const body = await parseResponse(res);
    const msg = (body?.error as Record<string, unknown>)?.message as string
      || (body?.message as string)
      || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }

  return parseSseResponse(res, onEvent);
}

export async function apiUploadJson(
  path: string,
  data: unknown,
  onEvent?: SseEventCallback,
  token?: string,
): Promise<Record<string, unknown>> {
  const baseUrl = getApiUrl();
  const resolvedToken = token || await requireAuth();

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...buildHeaders(resolvedToken),
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await parseResponse(res);
    const msg = (body?.error as Record<string, unknown>)?.message as string
      || (body?.message as string)
      || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }

  return parseSseResponse(res, onEvent);
}

export async function apiDownloadFile(signedUrl: string, destPath: string): Promise<string> {
  const res = await fetch(signedUrl);
  if (!res.ok) {
    throw new ApiError(`Download failed with status ${res.status}`, res.status);
  }
  writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
  return destPath;
}

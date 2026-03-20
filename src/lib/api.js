import { getToken, getApiUrl } from './config.js';

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export function requireAuth() {
  const token = getToken();
  if (!token) {
    throw new ApiError('Not authenticated. Run `royaltyport login` first.', 401);
  }
  return token;
}

export async function apiGet(path, token) {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildHeaders(token || requireAuth()),
  });
  const body = await parseResponse(res);
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
  return body;
}

export async function apiPost(path, data, token) {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: buildHeaders(token || requireAuth()),
    body: JSON.stringify(data),
  });
  const body = await parseResponse(res);
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
  return body;
}

export async function apiDelete(path, token) {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(token || requireAuth()),
  });
  const body = await parseResponse(res);
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
  return body;
}

export { ApiError };

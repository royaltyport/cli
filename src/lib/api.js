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

export async function requireAuth() {
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

export async function apiGet(path, token) {
  const baseUrl = getApiUrl();
  const resolvedToken = token || await requireAuth();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildHeaders(resolvedToken),
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
  const resolvedToken = token || await requireAuth();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: buildHeaders(resolvedToken),
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
  const resolvedToken = token || await requireAuth();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(resolvedToken),
  });
  const body = await parseResponse(res);
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, body);
  }
  return body;
}

export { ApiError };

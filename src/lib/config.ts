import Conf from 'conf';
import type { ConfigSchema } from '../types/index.js';

const config = new Conf<ConfigSchema>({
  projectName: 'royaltyport',
  schema: {
    token: { type: 'string', default: '' },
    apiUrl: { type: 'string', default: 'https://api.royaltyport.com' },
    authMethod: { type: 'string', default: '' },
    accessToken: { type: 'string', default: '' },
    refreshToken: { type: 'string', default: '' },
    tokenExpiresAt: { type: 'number', default: 0 },
  },
});

export function getToken(): string {
  return process.env.ROYALTYPORT_TOKEN || config.get('token');
}

export function setToken(token: string): void {
  config.set('authMethod', 'token');
  config.set('token', token);
  config.set('accessToken', '');
  config.set('refreshToken', '');
  config.set('tokenExpiresAt', 0);
}

export function getApiUrl(): string {
  return process.env.ROYALTYPORT_API_URL || config.get('apiUrl');
}

export function setApiUrl(url: string): void {
  config.set('apiUrl', url);
}

export function getAuthMethod(): string {
  return config.get('authMethod') || (config.get('token') ? 'token' : '');
}

export function getAccessToken(): string {
  return config.get('accessToken');
}

export function getRefreshToken(): string {
  return config.get('refreshToken');
}

export function isTokenExpired(): boolean {
  const expiresAt = config.get('tokenExpiresAt');
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - 30_000; // 30s buffer
}

export function setOAuthTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  config.set('authMethod', 'oauth');
  config.set('accessToken', accessToken);
  config.set('refreshToken', refreshToken);
  config.set('tokenExpiresAt', Date.now() + expiresIn * 1000);
  config.set('token', ''); // clear API token to avoid auth conflict
}

export function clearConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}

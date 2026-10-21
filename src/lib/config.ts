import { resolveApiVersion, type ApiVersion } from './api-version.js';
import Conf from 'conf';
import type { ConfigSchema } from '../types/index.js';

const config = new Conf<ConfigSchema>({
  projectName: 'royaltyport',
  schema: {
    token: { type: 'string', default: '' },
    apiUrl: { type: 'string', default: 'https://api.royaltyport.com' },
    apiVersion: { type: 'string', default: '' },
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

let commandApiVersion: ApiVersion | undefined;

/** Called once by the CLI before any command action; retries/polls reuse this pin. */
export function pinCommandApiVersion(flag?: string): ApiVersion {
  commandApiVersion = resolveApiVersion(flag, process.env.ROYALTYPORT_API_VERSION, config.get('apiVersion') || undefined);
  return commandApiVersion;
}

export function getApiVersion(): ApiVersion {
  return commandApiVersion ?? resolveApiVersion(undefined, process.env.ROYALTYPORT_API_VERSION, config.get('apiVersion') || undefined);
}

export function setApiVersion(version: string): void {
  config.set('apiVersion', resolveApiVersion(version));
}

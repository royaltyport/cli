import Conf from 'conf';

const config = new Conf({
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

export function getToken() {
  return process.env.ROYALTYPORT_TOKEN || config.get('token');
}

export function setToken(token) {
  config.set('authMethod', 'token');
  config.set('token', token);
  config.set('accessToken', '');
  config.set('refreshToken', '');
  config.set('tokenExpiresAt', 0);
}

export function getApiUrl() {
  return process.env.ROYALTYPORT_API_URL || config.get('apiUrl');
}

export function setApiUrl(url) {
  config.set('apiUrl', url);
}

export function getAuthMethod() {
  return config.get('authMethod') || (config.get('token') ? 'token' : '');
}

export function getAccessToken() {
  return config.get('accessToken');
}

export function getRefreshToken() {
  return config.get('refreshToken');
}

export function isTokenExpired() {
  const expiresAt = config.get('tokenExpiresAt');
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - 30_000; // 30s buffer
}

export function setOAuthTokens(accessToken, refreshToken, expiresIn) {
  config.set('authMethod', 'oauth');
  config.set('accessToken', accessToken);
  config.set('refreshToken', refreshToken);
  config.set('tokenExpiresAt', Date.now() + expiresIn * 1000);
  config.set('token', ''); // clear API token to avoid auth conflict
}

export function clearConfig() {
  config.clear();
}

export function getConfigPath() {
  return config.path;
}

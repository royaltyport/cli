import Conf from 'conf';

const config = new Conf({
  projectName: 'royaltyport',
  schema: {
    token: { type: 'string', default: '' },
    apiUrl: { type: 'string', default: 'https://api.royaltyport.com' },
  },
});

export function getToken() {
  return process.env.ROYALTYPORT_TOKEN || config.get('token');
}

export function setToken(token) {
  config.set('token', token);
}

export function getApiUrl() {
  return process.env.ROYALTYPORT_API_URL || config.get('apiUrl');
}

export function setApiUrl(url) {
  config.set('apiUrl', url);
}

export function clearConfig() {
  config.clear();
}

export function getConfigPath() {
  return config.path;
}

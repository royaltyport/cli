import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ directory: '' }));

vi.mock('conf', async importOriginal => {
  const { default: Conf } = await importOriginal<typeof import('conf')>();
  return {
    default: vi.fn(function (options: ConstructorParameters<typeof Conf>[0]) {
      return new Conf({ ...options, cwd: fixture.directory });
    }),
  };
});

beforeEach(() => {
  fixture.directory = mkdtempSync(join(tmpdir(), 'royaltyport-config-test-'));
  vi.stubEnv('ROYALTYPORT_TOKEN', '');
  vi.stubEnv('ROYALTYPORT_API_URL', '');
  vi.stubEnv('ROYALTYPORT_API_VERSION', undefined);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(fixture.directory, { recursive: true, force: true });
});

it('persists and reloads token, OAuth and API settings through the real Conf schema', async () => {
  let config = await import('./config.js');
  expect(config.getConfigPath()).toBe(join(fixture.directory, 'config.json'));
  expect(config.getToken()).toBe('');
  expect(config.getApiUrl()).toBe('https://api.royaltyport.com');

  config.setToken('dummy-api-token');
  config.setApiUrl('https://api.example.test');
  vi.resetModules();
  config = await import('./config.js');
  expect(config.getToken()).toBe('dummy-api-token');
  expect(config.getAuthMethod()).toBe('token');
  expect(config.getApiUrl()).toBe('https://api.example.test');

  config.setOAuthTokens('dummy-access', 'dummy-refresh', 3600);
  vi.resetModules();
  config = await import('./config.js');
  expect(config.getToken()).toBe('');
  expect(config.getAuthMethod()).toBe('oauth');
  expect(config.getAccessToken()).toBe('dummy-access');
  expect(config.getRefreshToken()).toBe('dummy-refresh');
  expect(config.isTokenExpired()).toBe(false);
  expect(JSON.parse(readFileSync(config.getConfigPath(), 'utf8')).tokenExpiresAt).toBeTypeOf('number');

  config.clearConfig();
  vi.resetModules();
  config = await import('./config.js');
  expect(config.getToken()).toBe('');
  expect(config.getAccessToken()).toBe('');
  expect(config.getRefreshToken()).toBe('');
  expect(config.isTokenExpired()).toBe(true);
  expect(config.getApiUrl()).toBe('https://api.royaltyport.com');
});

import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import type { OAuthTokens } from '../types/index.js';
import {
  OAUTH_CLIENT_ID,
  OAUTH_AUTH_URL,
  OAUTH_REDIRECT_URI,
  OAUTH_CALLBACK_PORT,
  OAUTH_AUTH_SCREEN,
} from './constants.js';

function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function openBrowser(url: string): void {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      execSync(`open "${url}"`);
    } else if (platform === 'win32') {
      execSync(`start "" "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch {
    // Silently fail — user will be shown the URL to open manually
  }
}

export async function startOAuthFlow(): Promise<OAuthTokens> {
  const { verifier, challenge } = generatePKCE();
  const state = base64url(randomBytes(16));

  const authorizationUrl = new URL(`${OAUTH_AUTH_URL}/oauth/authorize`);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
  authorizationUrl.searchParams.set('code_challenge', challenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('state', state);

  return new Promise<OAuthTokens>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('OAuth flow timed out after 120 seconds.'));
    }, 120_000);

    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${OAUTH_CALLBACK_PORT}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const callbackError = url.searchParams.get('error');

      clearTimeout(timeout);

      const resultUrl = (status: string) => `${OAUTH_AUTH_SCREEN}/oauth/result?status=${status}`;

      if (callbackError) {
        res.writeHead(302, { Location: resultUrl('denied') });
        res.end();
        server.close();
        reject(new Error(`Authorization denied: ${callbackError}`));
        return;
      }

      if (!code || returnedState !== state) {
        res.writeHead(302, { Location: resultUrl('error') });
        res.end();
        server.close();
        reject(new Error('Invalid OAuth callback: missing code or state mismatch.'));
        return;
      }

      try {
        const tokens = await exchangeCodeForTokens(code, verifier);

        res.writeHead(302, { Location: resultUrl('authorized') });
        res.end();
        server.close();
        resolve(tokens);
      } catch (err) {
        res.writeHead(302, { Location: resultUrl('error') });
        res.end();
        server.close();
        reject(err);
      }
    });

    server.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
      openBrowser(authorizationUrl.toString());
    });
  });
}

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<OAuthTokens> {
  const tokenUrl = `${OAUTH_AUTH_URL}/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: OAUTH_REDIRECT_URI,
    client_id: OAUTH_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      (data.error_description as string) || (data.error as string) || 'Token exchange failed',
    );
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_in: data.expires_in as number,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const tokenUrl = `${OAUTH_AUTH_URL}/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: OAUTH_CLIENT_ID,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json() as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      (data.error_description as string) || (data.error as string) || 'Token refresh failed',
    );
  }

  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_in: data.expires_in as number,
  };
}

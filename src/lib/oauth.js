import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import {
  OAUTH_CLIENT_ID,
  OAUTH_AUTH_URL,
  OAUTH_REDIRECT_URI,
  OAUTH_CALLBACK_PORT,
} from './constants.js';

function base64url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generatePKCE() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function openBrowser(url) {
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

export async function startOAuthFlow() {
  const { verifier, challenge } = generatePKCE();
  const state = base64url(randomBytes(16));

  const authorizationUrl = new URL(`${OAUTH_AUTH_URL}/oauth/authorize`);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
  authorizationUrl.searchParams.set('code_challenge', challenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  authorizationUrl.searchParams.set('state', state);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('OAuth flow timed out after 120 seconds.'));
    }, 120_000);

    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${OAUTH_CALLBACK_PORT}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      clearTimeout(timeout);

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Authorization denied</h1><p>You can close this window.</p></body></html>');
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (!code || returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Invalid callback</h1><p>Missing code or state mismatch.</p></body></html>');
        server.close();
        reject(new Error('Invalid OAuth callback: missing code or state mismatch.'));
        return;
      }

      try {
        const tokens = await exchangeCodeForTokens(code, verifier);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Authenticated!</h1><p>You can close this window and return to the CLI.</p></body></html>');
        server.close();
        resolve(tokens);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<html><body><h1>Error</h1><p>${err.message}</p></body></html>`);
        server.close();
        reject(err);
      }
    });

    server.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
      openBrowser(authorizationUrl.toString());
    });
  });
}

async function exchangeCodeForTokens(code, codeVerifier) {
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

export async function refreshAccessToken(refreshToken) {
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

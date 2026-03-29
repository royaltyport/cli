// Used by CLI and other first-party Royaltyport apps. Third-party MCP clients self-register via /oauth/register.
export const OAUTH_CLIENT_ID = '4ba3d3c0-0b0c-4a95-90f1-e3d579ed9e24';
export const OAUTH_AUTH_URL = 'https://router.royaltyport.com/auth/v1';
export const OAUTH_AUTH_SCREEN = 'https://app.royaltyport.com';

// Local callback server for OAuth flow
export const OAUTH_REDIRECT_URI = 'http://127.0.0.1:9876/callback';
export const OAUTH_CALLBACK_PORT = 9876;

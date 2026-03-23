// Used by CLI and other first-party Royaltyport apps. Third-party MCP clients self-register via /oauth/register.
export const OAUTH_CLIENT_ID = 'b7af0ba3-3fc2-4157-91cf-09c24425f091';
export const OAUTH_AUTH_URL = 'https://router.royaltyport.com/auth/v1';

// Local callback server for OAuth flow
export const OAUTH_REDIRECT_URI = 'http://127.0.0.1:9876/callback';
export const OAUTH_CALLBACK_PORT = 9876;

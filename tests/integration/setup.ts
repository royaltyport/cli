import { apiGet, apiPost, apiUploadFlow, apiDownloadFile } from '../../src/lib/api.js';
import type { UploadFlowInput, UploadFlowOptions } from '../../src/types/index.js';

const TOKEN = process.env.ROYALTYPORT_TEST_API_KEY;
const BASE_URL = process.env.ROYALTYPORT_TEST_BASE_URL ?? 'https://api.royaltyport.com';

if (!TOKEN) {
  throw new Error(
    'ROYALTYPORT_TEST_API_KEY is required for integration tests. ' +
    'Run with: ROYALTYPORT_TEST_API_KEY=rp_... npx vitest run --project integration',
  );
}

// Override the API URL for tests
process.env.ROYALTYPORT_API_URL = BASE_URL;

export const PROJECT_ID = process.env.ROYALTYPORT_TEST_PROJECT_ID ?? 'acd058d0-3058-488d-bafd-88c1a03aebc6';

// Pre-bound helpers that pass the test token
export async function get(path: string) {
  return apiGet(path, TOKEN);
}

export async function post(path: string, data: unknown) {
  return apiPost(path, data, TOKEN);
}

export async function upload(
  resource: 'statements' | 'contracts',
  input: UploadFlowInput,
  options: Omit<UploadFlowOptions, 'token'> = {},
) {
  return apiUploadFlow(resource, PROJECT_ID, input, { ...options, token: TOKEN });
}

export { apiDownloadFile };

import { apiGet, apiPost, apiUploadFlow, apiDownloadFile } from '../../src/lib/api.js';
import type { UploadFlowInput, UploadFlowOptions } from '../../src/types/index.js';

import {readIntegrationTarget} from '../helpers/integration-target.js';
const target = readIntegrationTarget(process.env);
export const BASE_URL = target.baseUrl;
export const PROJECT_ID = target.projectId;
const TOKEN = target.apiKey;

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

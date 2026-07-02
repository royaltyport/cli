import { describe, it, expect } from 'vitest';
import { get, upload, PROJECT_ID } from './setup.js';
import type { StatementProcesses } from '../../src/types/index.js';

describe('Statements (integration)', () => {
  it('lists statements', async () => {
    const response = await get(`/v1/statements?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });

  describe('upload -> processes', () => {
    let uploadedStagingId: number;

    it('uploads a statement via the signed-URL flow', async () => {
      // The server validates real bytes at complete — content must start with %PDF-
      const testContent = Buffer.from('%PDF-1.4 CLI integration test statement').toString('base64');

      const result = await upload('statements', {
        base64: testContent,
        fileName: 'cli-test-statement.pdf',
      });

      expect(typeof result.staging_id).toBe('number');
      expect(result.status).toBe('uploaded');
      expect(typeof result.file_path).toBe('string');

      uploadedStagingId = result.staging_id;
    });

    it('gets statement processes', async () => {
      if (!uploadedStagingId) return;

      const response = await get(`/v1/statements/${uploadedStagingId}/processes?projectId=${PROJECT_ID}`);
      const data = response.data as StatementProcesses;

      expect(data).toHaveProperty('staging_id');
      expect(data.staging_id).toBe(uploadedStagingId);
      expect(data).toHaveProperty('staging_done');
      expect(data).toHaveProperty('staging_processes');
      expect(typeof data.staging_processes.stage).toBe('string');
    });
  });
});

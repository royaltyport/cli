import { describe, it, expect } from 'vitest';
import { get, uploadJson, PROJECT_ID } from './setup.js';
import type { ContractUploadResult, ContractProcesses } from '../../src/types/index.js';
import type { SseEvent } from '../../src/types/index.js';

describe('Contracts (integration)', () => {
  it('lists contracts', async () => {
    const response = await get(`/v1/contracts?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('lists contracts with includes', async () => {
    const response = await get(`/v1/contracts?projectId=${PROJECT_ID}&includes=entities,royalties`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
  });

  describe('upload -> processes', () => {
    let uploadedStagingId: number;

    it('uploads a contract via JSON with SSE progress', async () => {
      const testContent = Buffer.from('%PDF-1.4 CLI integration test contract').toString('base64');

      const events: SseEvent[] = [];
      const result = await uploadJson(
        `/v1/contracts?projectId=${PROJECT_ID}`,
        {
          file: testContent,
          fileName: 'cli-test-contract.pdf',
          fileType: 'application/pdf',
          extractions: ['extract-dates', 'extract-signatures'],
        },
        (e) => events.push(e),
      );

      const contract = result.data as ContractUploadResult;
      expect(contract).toHaveProperty('staging_id');
      expect(typeof contract.staging_id).toBe('number');
      expect(contract).toHaveProperty('created_at');

      uploadedStagingId = contract.staging_id;
    });

    it('gets contract processes', async () => {
      if (!uploadedStagingId) return;

      const response = await get(`/v1/contracts/${uploadedStagingId}/processes?projectId=${PROJECT_ID}`);
      const data = response.data as ContractProcesses;

      expect(data).toHaveProperty('staging_id');
      expect(data.staging_id).toBe(uploadedStagingId);
      expect(data).toHaveProperty('staging_done');
      expect(data).toHaveProperty('staging_processes');
      expect(typeof data.staging_processes.stage).toBe('string');
    });
  });
});

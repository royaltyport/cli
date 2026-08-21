import { describe, it, expect } from 'vitest';
import { get, upload, PROJECT_ID } from './setup.js';
import type { Contract, ContractProcesses, PaginatedResult } from '../../src/types/index.js';

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

  it('lists and gets commitments with automatic asset links', async () => {
    const listResponse = await get(`/v1/contracts?projectId=${PROJECT_ID}&perPage=1&includes=commitments&includeCitations=true`);
    const listed = listResponse.data as PaginatedResult<Contract>;
    expect(Array.isArray(listed.items[0]?.extractions?.commitments)).toBe(true);

    const contractId = listed.items[0]?.id;
    if (!contractId) return;
    const getResponse = await get(`/v1/contracts/${contractId}?projectId=${PROJECT_ID}&includes=commitments&includeCitations=true`);
    const contract = getResponse.data as Contract;

    for (const commitment of contract.extractions?.commitments ?? []) {
      expect(Array.isArray(commitment.linked_deliverables)).toBe(true);
      expect(Array.isArray(commitment.citations)).toBe(true);
      for (const citation of commitment.citations ?? []) {
        expect(Object.keys(citation).sort()).toEqual([
          'citation',
          'field',
          'page',
          'section_number',
          'section_structure',
          'section_title',
        ]);
      }
      expect(Array.isArray(commitment.linked_assets)).toBe(true);
      expect(commitment).not.toHaveProperty('commitment_items');
      expect(commitment).not.toHaveProperty('reconciliation_state');
    }
  });

  describe('upload -> processes', () => {
    let uploadedStagingId: number;

    it('uploads a contract via the signed-URL flow with extractions', async () => {
      // The server validates real bytes at complete — content must start with %PDF-
      const testContent = Buffer.from('%PDF-1.4 CLI integration test contract').toString('base64');

      const result = await upload(
        'contracts',
        { base64: testContent, fileName: 'cli-test-contract.pdf' },
        { extractions: ['extract-dates', 'extract-signatures'] },
      );

      expect(typeof result.staging_id).toBe('number');
      expect(result.status).toBe('uploaded');
      expect(typeof result.file_path).toBe('string');

      uploadedStagingId = result.staging_id;
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

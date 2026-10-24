import { describe, it, expect } from 'vitest';
import { get, upload, PROJECT_ID } from './setup.js';
import type { Contract, ContractCommitment, ContractProcesses, PaginatedResult } from '../../src/types/index.js';

describe('Contracts (integration)', () => {
  it('lists contracts', async () => {
    const response = await get(`/v1/contracts?projectId=${PROJECT_ID}&page=1&perPage=10`);

    const data = response.data as Record<string, unknown>;
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total_count');
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('returns contract metadata without embedded extractions', async () => {
    const response = await get(`/v1/contracts?projectId=${PROJECT_ID}`);
    const data = response.data as PaginatedResult<Contract>;
    for (const contract of data.items) expect(contract).not.toHaveProperty('extractions');
  });

  it('pages commitments with automatic asset links', async (context) => {
    const listResponse = await get(`/v1/contracts?projectId=${PROJECT_ID}&perPage=1`);
    const listed = listResponse.data as PaginatedResult<Contract>;
    const contractId = listed.items[0]?.id;
    if (!contractId) {
      context.skip(); // This owned Staging project may contain uploads without promoted contracts.
      return;
    }
    const response = await get(`/v1/contracts/${contractId}/extractions/commitments?projectId=${PROJECT_ID}&citations=true`);
    const data = response.data as PaginatedResult<ContractCommitment>;
    expect(Array.isArray(data.items)).toBe(true);
    for (const commitment of data.items) {
      expect(commitment).not.toHaveProperty('internal_id');
      expect(typeof commitment.internal_uuid).toBe('string');
      expect(typeof commitment.created_at).toBe('string');
      expect(typeof commitment.updated_at).toBe('string');
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
        { extractions: ['extract-dates', 'extract-signatures', 'extract-language'] },
      );

      expect(typeof result.staging_id).toBe('number');
      expect(result.status).toBe('uploaded');
      expect(typeof result.file_path).toBe('string');

      uploadedStagingId = result.staging_id;
    });

    it('gets contract processes', async () => {
      if (!uploadedStagingId) return;

      const response = await get(`/v1/contracts/${uploadedStagingId}/ingestion?projectId=${PROJECT_ID}`);
      const data = response.data as ContractProcesses;

      expect(data).toHaveProperty('staging_id');
      expect(data.staging_id).toBe(uploadedStagingId);
      expect(typeof data.status).toBe('string');
      expect(typeof data.terminal).toBe('boolean');
      expect(Array.isArray(data.resources)).toBe(true);
      expect(Array.isArray(data.document_processes)).toBe(true);
      for (const field of ['contract_id','statement_id','staging_done','extraction_done','extraction_processes']) expect(data).not.toHaveProperty(field);
      expect(data).toHaveProperty('staging_processes');
      expect(typeof data.staging_processes.stage).toBe('string');
    });
  });
});

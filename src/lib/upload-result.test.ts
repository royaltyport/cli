import { expect, it } from 'vitest';
import { uploadResultRows } from './upload-result.js';

it('keeps confirmation, admission and nullable capacity distinct', () => {
  const rows = uploadResultRows({ staging_id: 1, status: 'uploaded', context_applied: true,
    processing_status: null, usage_meter: 0, usage_limit: null,
    links: { self: '/v1/contracts/1/ingestion?projectId=p' } });
  expect(rows).toContainEqual(['Status', 'uploaded']);
  expect(rows).toContainEqual(['Processing Status', 'no new admission']);
  expect(rows).toContainEqual(['Document Usage', 0]);
  expect(rows).toContainEqual(['Document Limit', 'unavailable']);
  expect(rows).toContainEqual(['Processing URL', '/v1/contracts/1/ingestion?projectId=p']);
});
it.each(['queued', 'paused'] as const)('shows %s admission without relabeling confirmation', processing_status => {
  expect(uploadResultRows({ staging_id: 1, status: 'uploaded', context_applied: false, processing_status }))
    .toContainEqual(['Processing Status', processing_status]);
});

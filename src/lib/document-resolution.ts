import { readFile } from 'node:fs/promises';
import type { ContractStagingResolution } from '../types/resolutions.js';

export interface ResolveOptions {
  pauseId: string;
  action: string;
  idempotencyKey: string;
  inputJson?: string;
  inputFile?: string;
  json?: boolean;
}

export async function buildResolution(kind: 'contract' | 'statement', options: ResolveOptions): Promise<ContractStagingResolution> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.pauseId)) throw new Error('--pause-id must be the UUID returned by processing status');
  if (!/^[\x21-\x7e]{1,200}$/.test(options.idempotencyKey)) throw new Error('--idempotency-key must contain 1–200 printable non-whitespace ASCII characters');
  if (options.inputJson !== undefined && options.inputFile !== undefined) throw new Error('Use either --input-json or --input-file');
  const raw = options.inputFile !== undefined ? await readFile(options.inputFile, 'utf8') : options.inputJson ?? '{}';
  const input: unknown = JSON.parse(raw);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Resolution input must be a JSON object');
  if (options.action === 'retry') {
    if (Object.keys(input).length) throw new Error('retry input must be an empty object');
    return { pause_id: options.pauseId, action: 'retry', input: {} };
  }
  if (options.action !== 'approve_split' || kind !== 'contract') throw new Error(kind === 'statement' ? 'Statements support only --action retry' : '--action must be retry or approve_split');
  if (Object.keys(input).some(key => key !== 'agreements') || !('agreements' in input) || !Array.isArray(input.agreements) || input.agreements.length < 1 || input.agreements.length > 1000) throw new Error('approve_split requires input.agreements with 1–1000 items');
  const agreements = input.agreements.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Each agreement must be an object');
    const item = value as Record<string, unknown>;
    if (Object.keys(item).some(key => !['title', 'start_page', 'end_page', 'process'].includes(key)) || typeof item.title !== 'string' || !item.title.trim() || item.title.trim().length > 500 || !Number.isSafeInteger(item.start_page) || !Number.isSafeInteger(item.end_page) || Number(item.start_page) < 1 || Number(item.end_page) < Number(item.start_page) || typeof item.process !== 'boolean') throw new Error('Each agreement requires title, positive start_page/end_page, and boolean process');
    return { title: item.title.trim(), start_page: Number(item.start_page), end_page: Number(item.end_page), process: item.process };
  });
  if (!agreements.some(item => item.process)) throw new Error('Select at least one agreement to process');
  return { pause_id: options.pauseId, action: 'approve_split', input: { agreements } };
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly details: { code?: string; decision_id?: string; links?: Record<string, string | null> } | undefined;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    const candidate = body && typeof body === 'object' && 'error' in body ? body.error : undefined;
    this.details = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? candidate : undefined;
  }
}

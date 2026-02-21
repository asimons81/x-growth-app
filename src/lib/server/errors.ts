import crypto from 'crypto';

export interface ApiErrorResponse {
  error: string;
  code: string;
  requestId: string;
}

interface NormalizedServerError {
  status: number;
  code: string;
  message: string;
}

function hasStringField(value: unknown, field: string): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    field in value &&
    typeof (value as Record<string, unknown>)[field] === 'string'
  );
}

function toErrorText(err: unknown): string {
  if (err instanceof Error) return err.message;

  const parts: string[] = [];
  if (hasStringField(err, 'message')) parts.push(err.message);
  if (hasStringField(err, 'details')) parts.push(err.details);
  if (hasStringField(err, 'hint')) parts.push(err.hint);
  return parts.join(' ').trim();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isNetworkError(text: string): boolean {
  return (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('eai_again') ||
    text.includes('enotfound') ||
    text.includes('etimedout') ||
    text.includes('timeout')
  );
}

function isAuthError(text: string): boolean {
  return (
    text.includes('row-level security') ||
    text.includes('rls') ||
    text.includes('permission denied') ||
    text.includes('not authenticated') ||
    text.includes('jwt')
  );
}

function isConfigError(text: string): boolean {
  return text.includes('key_encryption_secret');
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function normalizeKeySaveError(err: unknown): NormalizedServerError {
  const text = normalizeWhitespace(toErrorText(err));

  if (isConfigError(text)) {
    return {
      status: 500,
      code: 'KEY_SAVE_CONFIG',
      message: 'Server configuration is incomplete for encrypted key storage.',
    };
  }

  if (isNetworkError(text)) {
    return {
      status: 502,
      code: 'KEY_SAVE_NETWORK',
      message: 'Cannot reach the database service right now. Try again shortly.',
    };
  }

  if (isAuthError(text)) {
    return {
      status: 403,
      code: 'KEY_SAVE_AUTH',
      message: 'You are not allowed to save keys with the current session.',
    };
  }

  return {
    status: 500,
    code: 'KEY_SAVE_DB',
    message: 'Unable to save the API key due to a database error.',
  };
}

export function normalizeKeyLoadError(err: unknown): NormalizedServerError {
  const text = normalizeWhitespace(toErrorText(err));
  if (isNetworkError(text)) {
    return {
      status: 502,
      code: 'KEY_LOAD_NETWORK',
      message: 'Cannot reach the database service right now.',
    };
  }

  return {
    status: 500,
    code: 'KEY_LOAD_DB',
    message: 'Unable to load API keys.',
  };
}

export function normalizeKeyDeleteError(err: unknown): NormalizedServerError {
  const text = normalizeWhitespace(toErrorText(err));
  if (isNetworkError(text)) {
    return {
      status: 502,
      code: 'KEY_DELETE_NETWORK',
      message: 'Cannot reach the database service right now.',
    };
  }

  if (isAuthError(text)) {
    return {
      status: 403,
      code: 'KEY_DELETE_AUTH',
      message: 'You are not allowed to delete keys with the current session.',
    };
  }

  return {
    status: 500,
    code: 'KEY_DELETE_DB',
    message: 'Unable to delete API key.',
  };
}

export function buildApiError(
  requestId: string,
  normalized: NormalizedServerError
): { body: ApiErrorResponse; status: number } {
  return {
    body: {
      error: normalized.message,
      code: normalized.code,
      requestId,
    },
    status: normalized.status,
  };
}

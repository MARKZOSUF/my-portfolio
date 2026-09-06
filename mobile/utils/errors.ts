import { ApiError } from '@/services/api/client';
import type { ApiErrorShape } from '@/types';

/** Maps backend error codes / HTTP statuses to copy a student can act on. */
const MESSAGES: Record<string, string> = {
  HTTP_400: 'That request was not valid. Please check your input.',
  HTTP_401: 'Your session expired. Please sign in again.',
  HTTP_403: 'You do not have access to that item.',
  HTTP_404: 'We could not find that item.',
  HTTP_409: 'This changed on another device. Reload and try again.',
  HTTP_413: 'That file is too large. Try one under 25 MB.',
  HTTP_422: 'Some fields need fixing before we can continue.',
  HTTP_429: 'You are going a bit fast. Wait a moment and retry.',
  HTTP_500: 'Something broke on our side. Please try again.',
  HTTP_503: 'The service is busy. Please try again shortly.',
  VERSION_CONFLICT: 'This task changed on another device. Reload to get the latest version.',
  WORKLOAD_CONFLICT: 'That day is already full. Pick another day or force the change.',
  RATE_LIMITED: 'Daily generation limit reached. Try again tomorrow.',
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Always returns something safe to render. */
export function toMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isApiError(error)) {
    const mapped = MESSAGES[error.payload.code] ?? MESSAGES[`HTTP_${error.status}`];
    if (mapped) return mapped;
    return error.payload.message || fallback;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'That took too long and was cancelled.';
    return error.message || fallback;
  }
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

/** True when retrying the same request could plausibly succeed. */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return true;
  if (error.status === 429) return true;
  return error.status >= 500;
}

export function errorShape(error: unknown): ApiErrorShape {
  if (isApiError(error)) return error.payload;
  return { code: 'UNKNOWN', message: toMessage(error) };
}

const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ERR_BAD_RESPONSE',
  'EAI_AGAIN',
]);

type AxiosLikeError = {
  code?: unknown;
  response?: {
    status?: unknown;
  };
};

/**
 * Returns true for transient Podcast Index failures that are safe to retry.
 */
export function isRetryablePodcastIndexError(error: unknown): boolean {
  const err = error as AxiosLikeError;

  const status = err.response?.status;
  if (typeof status === 'number') {
    if (status === 429) {
      return true;
    }
    if (status >= 500 && status <= 599) {
      return true;
    }
    return false;
  }

  if (typeof err.code === 'string') {
    return RETRYABLE_NETWORK_ERROR_CODES.has(err.code);
  }

  return false;
}

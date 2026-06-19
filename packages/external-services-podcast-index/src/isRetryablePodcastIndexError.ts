const RETRYABLE_NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ERR_BAD_RESPONSE',
  'EAI_AGAIN',
]);

type AxiosLikeError = {
  code?: unknown;
  name?: unknown;
  response?: {
    status?: unknown;
  };
};

function isAxiosLikeError(error: unknown): error is AxiosLikeError {
  return typeof error === 'object' && error !== null;
}

/**
 * True when the HTTP client aborted the request (explicit timeout or AbortController).
 */
export function isPodcastIndexClientAbortError(error: unknown): boolean {
  if (!isAxiosLikeError(error)) {
    return false;
  }

  if (error.name === 'AbortError' || error.name === 'CanceledError') {
    return true;
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
    return true;
  }

  return false;
}

/**
 * Returns true for transient Podcast Index failures that are safe to retry.
 */
export function isRetryablePodcastIndexError(error: unknown): boolean {
  if (!isAxiosLikeError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (typeof status === 'number') {
    if (status === 429) {
      return true;
    }
    if (status >= 500 && status <= 599) {
      return true;
    }
    return false;
  }

  if (typeof error.code === 'string') {
    return RETRYABLE_NETWORK_ERROR_CODES.has(error.code);
  }

  return false;
}

export type ShouldRetryPodcastIndexRequestOptions = {
  clientAbortRequested: boolean;
};

/**
 * Combines retry policy with optional fail-fast when the caller passed client abort options.
 */
export function shouldRetryPodcastIndexRequest(
  error: unknown,
  options: ShouldRetryPodcastIndexRequestOptions
): boolean {
  if (options.clientAbortRequested && isPodcastIndexClientAbortError(error)) {
    return false;
  }

  return isRetryablePodcastIndexError(error);
}

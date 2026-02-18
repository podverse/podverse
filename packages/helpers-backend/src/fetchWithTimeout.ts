export type FetchWithTimeoutOptions = {
  method?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

/**
 * Fetches a URL with an optional timeout. Uses native fetch (Node 18+).
 * If timeoutMs is set, the request is aborted after that many milliseconds.
 */
export async function fetchWithTimeout(
  url: string,
  options?: FetchWithTimeoutOptions
): Promise<Response> {
  const { method = 'GET', headers, timeoutMs } = options ?? {};
  const controller = new AbortController();
  const timeoutId =
    timeoutMs !== undefined && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
    });
    return response;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

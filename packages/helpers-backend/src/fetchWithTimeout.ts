/**
 * Fetch request cache mode (standard Fetch API).
 * Defined here so it is available without DOM lib.
 */
export type RequestCache =
  | 'default'
  | 'force-cache'
  | 'no-cache'
  | 'no-store'
  | 'reload'
  | 'only-if-cached';

export type FetchWithTimeoutOptions = {
  body?: string;
  cache?: RequestCache;
  headers?: Record<string, string>;
  method?: string;
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
  const { body, cache, headers, method = 'GET', timeoutMs } = options ?? {};
  const controller = new AbortController();
  const timeoutId =
    timeoutMs !== undefined && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    const response = await fetch(url, {
      body,
      cache,
      headers,
      method,
      signal: controller.signal,
    });
    return response;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

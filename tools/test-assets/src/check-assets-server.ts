import { DEFAULT_HTTP_TIMEOUT_MS } from '@podverse/helpers';
import { fetchWithTimeout } from '@podverse/helpers-backend';

import { DEFAULT_ASSETS_BASE_URL } from './constants.js';

export type CheckAssetsServerReachableOptions = {
  /** Base URL of the assets server. Default http://localhost:2111 */
  baseUrl?: string;
  /** Timeout in ms. Default 5000. */
  timeoutMs?: number;
};

/**
 * Verifies the test-assets HTTP server is reachable.
 * @throws Error if unreachable or non-2xx (except 404 is treated as reachable).
 */
export async function checkAssetsServerReachable(
  options: CheckAssetsServerReachableOptions = {}
): Promise<void> {
  const { baseUrl = DEFAULT_ASSETS_BASE_URL, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS } = options;
  const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  try {
    const res = await fetchWithTimeout(url, { timeoutMs });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Assets server returned ${res.status}`);
    }
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Assets server not reachable at ${url}: ${err.message}`);
    }
    throw err;
  }
}

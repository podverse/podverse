import { getErrorResponseStatus } from '@podverse/helpers/error';

import { getRateLimitRetryAfterMs } from '../../lib/rateLimit/handleRateLimitMessage';

export type LegacyLookupResult<T> = { kind: 'ok'; value: T } | { kind: 'http'; status: number };

const waitFor = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * One public request from the v4 carryover. A rate-limit answer is waited out once when the wait
 * fits `remainingMs()`. Any other HTTP answer, or a rate limit it cannot wait for, returns `http`.
 * A network or Offline Mode error is thrown, so the caller leaves its rows for a later pass.
 */
export const requestLegacyLookup = async <T>(
  send: () => Promise<T>,
  remainingMs: () => number,
  wait: (ms: number) => Promise<void> = waitFor
): Promise<LegacyLookupResult<T>> => {
  let waited = false;
  while (true) {
    try {
      const value = await send();
      return { kind: 'ok', value };
    } catch (error) {
      const waitMs = getRateLimitRetryAfterMs(error);
      if (waitMs !== null && waitMs >= 0 && !waited && waitMs <= remainingMs()) {
        waited = true;
        await wait(waitMs);
        continue;
      }
      const status = getErrorResponseStatus(error);
      if (status !== undefined) {
        return { kind: 'http', status };
      }
      throw error;
    }
  }
};

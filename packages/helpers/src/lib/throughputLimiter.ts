import { sleep } from './sleep.js';

/**
 * Creates a throughput limiter that caps at most `rps` operations per second.
 * Returns a function that callers await before performing one operation; it delays
 * as needed to respect the rate. Not per-client rate limiting (e.g. for APIs).
 */
export function createThroughputLimiter(rps: number): () => Promise<void> {
  const minIntervalMs = Math.ceil(1000 / Math.max(1, rps));
  let lastRun = 0;
  let chain = Promise.resolve();
  return async () => {
    chain = chain.then(async () => {
      const now = Date.now();
      const waitMs = Math.max(0, minIntervalMs - (now - lastRun));
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      lastRun = Date.now();
    });
    await chain;
  };
}

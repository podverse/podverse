/**
 * Exponential backoff with jitter for retry loops.
 *
 * @param retryAttemptIndex - Zero-based retry index (first retry is 0 → base delay).
 * @param baseDelayMs - Base delay in milliseconds before exponential scaling.
 * @param maxJitterMs - Upper bound (exclusive) for uniform random jitter added to the delay.
 */
export function computeExponentialBackoffDelayMs(
  retryAttemptIndex: number,
  baseDelayMs: number,
  maxJitterMs = 250
): number {
  const exponentialDelay = baseDelayMs * 2 ** retryAttemptIndex;
  const jitterMs = Math.floor(Math.random() * maxJitterMs);
  return exponentialDelay + jitterMs;
}

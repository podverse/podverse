import { describe, expect, it } from 'vitest';

import { computeExponentialBackoffDelayMs } from './computeExponentialBackoffDelayMs.js';

describe('computeExponentialBackoffDelayMs', () => {
  it('applies exponential backoff with jitter bounded below base * 2^n + maxJitterMs', () => {
    const baseDelayMs = 1000;
    const maxJitterMs = 250;
    const delay0 = computeExponentialBackoffDelayMs(0, baseDelayMs, maxJitterMs);
    const delay1 = computeExponentialBackoffDelayMs(1, baseDelayMs, maxJitterMs);
    const delay2 = computeExponentialBackoffDelayMs(2, baseDelayMs, maxJitterMs);

    expect(delay0).toBeGreaterThanOrEqual(1000);
    expect(delay0).toBeLessThanOrEqual(1250);
    expect(delay1).toBeGreaterThanOrEqual(2000);
    expect(delay1).toBeLessThanOrEqual(2250);
    expect(delay2).toBeGreaterThanOrEqual(4000);
    expect(delay2).toBeLessThanOrEqual(4250);
  });
});

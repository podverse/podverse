import { describe, expect, it, vi } from 'vitest';

import { requestLegacyLookup } from './legacyLookupRequest';

const httpError = (status: number, data: Record<string, unknown> = {}): unknown => ({
  response: { data, status },
});

describe('requestLegacyLookup', () => {
  it('returns the value', async () => {
    const result = await requestLegacyLookup(
      async () => 'ready',
      () => 10000
    );
    expect(result).toEqual({ kind: 'ok', value: 'ready' });
  });

  it('waits once for a rate limit inside the budget and returns the next result', async () => {
    const wait = vi.fn(() => Promise.resolve());
    let calls = 0;
    const result = await requestLegacyLookup(
      async () => {
        calls += 1;
        if (calls === 1) {
          throw httpError(429, { timeUntilResetMs: 2500 });
        }
        return 'second';
      },
      () => 10000,
      wait
    );

    expect(wait).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledWith(2500);
    expect(result).toEqual({ kind: 'ok', value: 'second' });
  });

  it('returns the rate-limit status when the next attempt is limited again', async () => {
    const wait = vi.fn(() => Promise.resolve());
    const result = await requestLegacyLookup(
      async () => {
        throw httpError(429, { timeUntilResetMs: 2500 });
      },
      () => 10000,
      wait
    );

    expect(wait).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ kind: 'http', status: 429 });
  });

  it('returns http 429 at once when the wait exceeds the budget', async () => {
    const wait = vi.fn(() => Promise.resolve());
    const result = await requestLegacyLookup(
      async () => {
        throw httpError(429, { timeUntilResetMs: 2500 });
      },
      () => 1000,
      wait
    );

    expect(wait).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'http', status: 429 });
  });

  it('returns an HTTP status', async () => {
    const result = await requestLegacyLookup(
      async () => {
        throw httpError(404);
      },
      () => 10000
    );
    expect(result).toEqual({ kind: 'http', status: 404 });
  });

  it('throws when the error has no HTTP status', async () => {
    await expect(
      requestLegacyLookup(
        async () => {
          throw new Error('offline');
        },
        () => 10000
      )
    ).rejects.toThrow('offline');
  });
});

import { describe, expect, it } from 'vitest';

import { shouldPostSeekEventNow } from './seekEventCoalescing';

describe('shouldPostSeekEventNow', () => {
  const windowMs = 1000;

  it('posts the first seek of a burst', () => {
    expect(
      shouldPostSeekEventNow({
        lastSeekPostAtMs: null,
        occurredAt: 5_000,
        windowMs,
      })
    ).toBe(true);
  });

  it('suppresses a seek inside the coalescing window', () => {
    expect(
      shouldPostSeekEventNow({
        lastSeekPostAtMs: 5_000,
        occurredAt: 5_400,
        windowMs,
      })
    ).toBe(false);
  });

  it('posts again once the window has elapsed', () => {
    expect(
      shouldPostSeekEventNow({
        lastSeekPostAtMs: 5_000,
        occurredAt: 6_000,
        windowMs,
      })
    ).toBe(true);
  });
});

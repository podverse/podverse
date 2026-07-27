import { describe, expect, it, vi } from 'vitest';

import { homeFeedRefresh } from './homeFeedRefresh';

describe('homeFeedRefresh', () => {
  it('notifies subscribers and bumps generation', () => {
    const listener = vi.fn();
    const unsubscribe = homeFeedRefresh.subscribe(listener);
    const before = homeFeedRefresh.getGeneration();

    homeFeedRefresh.notify();

    expect(homeFeedRefresh.getGeneration()).toBe(before + 1);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    homeFeedRefresh.notify();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

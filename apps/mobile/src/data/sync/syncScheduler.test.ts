import { beforeEach, describe, expect, it, vi } from 'vitest';

const isEffectivelyOffline = vi.fn(() => false);

vi.mock('../../net/connectivity', () => ({
  isEffectivelyOffline: () => isEffectivelyOffline(),
}));

import { readThrough, readThroughOrFetch } from './syncScheduler';

describe('opportunistic remote fetch', () => {
  beforeEach(() => {
    isEffectivelyOffline.mockReturnValue(false);
    vi.stubGlobal('__DEV__', false);
  });

  it('skips a stale background fetch while effectively offline', async () => {
    const fetchRemote = vi.fn(async () => {
      throw new Error('network down');
    });

    const value = await readThrough({
      fetchRemote,
      isStale: async () => true,
      readLocal: async () => 'cached',
    });

    isEffectivelyOffline.mockReturnValue(true);
    const offlineValue = await readThrough({
      fetchRemote,
      isStale: async () => true,
      readLocal: async () => 'cached',
    });

    expect(value).toBe('cached');
    expect(offlineValue).toBe('cached');
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });

  it('skips an empty-cache fetch while effectively offline', async () => {
    const fetchRemote = vi.fn(async () => 'remote');
    isEffectivelyOffline.mockReturnValue(true);

    const value = await readThroughOrFetch({
      fetchRemote,
      isStale: async () => true,
      readLocal: async () => null,
    });

    expect(value).toBeNull();
    expect(fetchRemote).not.toHaveBeenCalled();
  });

  it('fetches on a cache miss while online', async () => {
    const fetchRemote = vi.fn(async () => 'remote');

    const value = await readThroughOrFetch({
      fetchRemote,
      isStale: async () => true,
      readLocal: async () => null,
    });

    expect(value).toBe('remote');
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });
});

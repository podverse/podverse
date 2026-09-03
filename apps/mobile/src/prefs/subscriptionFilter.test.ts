import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SUBSCRIPTION_FILTER,
  readLibrarySubscriptionFilter,
  writeLibrarySubscriptionFilter,
} from './subscriptionFilter';

const inMemoryStore = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      getItem: vi.fn(async (key: string) => {
        return inMemoryStore.has(key) ? (inMemoryStore.get(key) ?? null) : null;
      }),
      removeItem: vi.fn(async (key: string) => {
        inMemoryStore.delete(key);
      }),
      setItem: vi.fn(async (key: string, value: string) => {
        inMemoryStore.set(key, value);
      }),
    },
  };
});

describe('library subscription filter', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('opens on the documented default when nothing has been chosen', async () => {
    await expect(readLibrarySubscriptionFilter()).resolves.toBe(DEFAULT_SUBSCRIPTION_FILTER);
  });

  it('remembers a chip across a relaunch', async () => {
    await writeLibrarySubscriptionFilter('addByRss');

    await expect(readLibrarySubscriptionFilter()).resolves.toBe('addByRss');
  });

  it('carries over a chip set before Library used the scope-keyed store', async () => {
    inMemoryStore.set('library.subscriptionFilter', 'addByRss');

    await expect(readLibrarySubscriptionFilter()).resolves.toBe('addByRss');
    // Written into the scoped entry on that first read, so the carry-over happens once rather than
    // on every launch for the life of the install.
    expect(inMemoryStore.get('sort.library.subscriptions')).toContain('addByRss');
  });

  it('keeps Library and Home chips apart, since they scope different lists', async () => {
    inMemoryStore.set('sort.podcasts', JSON.stringify({ filter: 'addByRss' }));

    await expect(readLibrarySubscriptionFilter()).resolves.toBe(DEFAULT_SUBSCRIPTION_FILTER);
  });
});

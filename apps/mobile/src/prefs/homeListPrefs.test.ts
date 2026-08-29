import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_HOME_SORT,
  DEFAULT_HOME_VIEW_MODE,
  isHomeSortableMediaType,
  isHomeSubscriptionFilterMediaType,
  isHomeViewModeMediaType,
  readHomeListPrefs,
  subscribeHomeListPrefs,
  writeHomeSort,
  writeHomeSubscriptionFilter,
  writeHomeViewMode,
} from './homeListPrefs';
import { DEFAULT_SUBSCRIPTION_FILTER } from './subscriptionFilter';

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

describe('homeListPrefs', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('opens with the documented defaults when nothing has been chosen', async () => {
    await expect(readHomeListPrefs('podcasts')).resolves.toEqual({
      filter: DEFAULT_SUBSCRIPTION_FILTER,
      sort: DEFAULT_HOME_SORT,
      viewMode: DEFAULT_HOME_VIEW_MODE,
    });
  });

  it('opens on the list, not the grid the previous generation defaulted to', () => {
    expect(DEFAULT_HOME_VIEW_MODE).toBe('list');
  });

  it('remembers the grid across a relaunch, and keeps it per media type', async () => {
    await writeHomeViewMode('podcasts', 'grid');

    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({ viewMode: 'grid' });
    await expect(readHomeListPrefs('episodes')).resolves.toMatchObject({
      viewMode: DEFAULT_HOME_VIEW_MODE,
    });
  });

  it('leaves the sort alone when the view changes, and the view alone when the sort does', async () => {
    await writeHomeSort('podcasts', 'recent');
    await writeHomeViewMode('podcasts', 'grid');

    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({
      sort: 'recent',
      viewMode: 'grid',
    });
  });

  it('ignores a stored view mode it does not recognise', async () => {
    inMemoryStore.set('sort.podcasts', JSON.stringify({ viewMode: 'carousel' }));

    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({
      viewMode: DEFAULT_HOME_VIEW_MODE,
    });
  });

  it('keeps a sort per media type, so one list says nothing about another', async () => {
    await writeHomeSort('podcasts', 'recent');

    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({ sort: 'recent' });
    await expect(readHomeListPrefs('episodes')).resolves.toMatchObject({
      sort: DEFAULT_HOME_SORT,
    });
  });

  it('reports the same scope chip whichever media type asks, because it scopes one list', async () => {
    await writeHomeSubscriptionFilter('addByRss');

    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({ filter: 'addByRss' });
    await expect(readHomeListPrefs('episodes')).resolves.toMatchObject({ filter: 'addByRss' });
  });

  it('carries over a chip choice made before Home had a sort', async () => {
    inMemoryStore.set('home.subscriptionFilter', 'addByRss');

    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({ filter: 'addByRss' });
    // Written into the scoped entry on that first read, so the carry-over happens once rather than
    // on every launch for the life of the install.
    expect(inMemoryStore.get('sort.podcasts')).toContain('addByRss');
  });

  it('ignores a stored sort it does not recognise', async () => {
    inMemoryStore.set('sort.podcasts', JSON.stringify({ sort: 'top' }));

    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({
      sort: DEFAULT_HOME_SORT,
    });
  });

  it('notifies a watcher when the list it is watching changes', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHomeListPrefs('podcasts', listener);

    await writeHomeSort('podcasts', 'recent');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await writeHomeSort('podcasts', 'alphabetical');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies an episodes watcher about the shared chip, which reorders its list too', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHomeListPrefs('episodes', listener);

    await writeHomeSubscriptionFilter('addByRss');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('offers sorting only where a list is read from the device', () => {
    expect(isHomeSortableMediaType('podcasts')).toBe(true);
    expect(isHomeSortableMediaType('episodes')).toBe(true);
    expect(isHomeSortableMediaType('clips')).toBe(false);
    expect(isHomeSortableMediaType('artists')).toBe(false);
    expect(isHomeSortableMediaType('albums')).toBe(false);
    expect(isHomeSortableMediaType('tracks')).toBe(false);
  });

  it('offers the subscription scope chip on the channel list only', () => {
    expect(isHomeSubscriptionFilterMediaType('podcasts')).toBe(true);
    expect(isHomeSubscriptionFilterMediaType('episodes')).toBe(false);
  });

  it('offers the grid on the channel list only, where artwork identifies the row', () => {
    expect(isHomeViewModeMediaType('podcasts')).toBe(true);
    expect(isHomeViewModeMediaType('episodes')).toBe(false);
    expect(isHomeViewModeMediaType('tracks')).toBe(false);
  });
});

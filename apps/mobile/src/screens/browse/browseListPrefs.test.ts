import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_HOME_VIEW_MODE } from '../../prefs/homeListPrefs';
import {
  readBrowseListPrefs,
  subscribeBrowseListPrefs,
  writeBrowseMediaType,
  writeBrowseViewMode,
} from './browseListPrefs';

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

describe('browseListPrefs', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('opens on the list when nothing has been chosen', async () => {
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      viewMode: DEFAULT_HOME_VIEW_MODE,
    });
  });

  it('remembers grid on artists without changing podcasts', async () => {
    await writeBrowseViewMode('artists', 'grid');

    await writeBrowseMediaType('artists');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'artists',
      viewMode: 'grid',
    });

    await writeBrowseMediaType('podcasts');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'podcasts',
      viewMode: DEFAULT_HOME_VIEW_MODE,
    });
  });

  it('uses a stored browse-root grid when the media type has no viewMode of its own', async () => {
    inMemoryStore.set('sort.browse', JSON.stringify({ viewMode: 'grid' }));

    await expect(readBrowseListPrefs()).resolves.toMatchObject({ viewMode: 'grid' });

    await writeBrowseMediaType('artists');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'artists',
      viewMode: 'grid',
    });
  });

  it('lets a per-type viewMode override the browse-root value', async () => {
    inMemoryStore.set('sort.browse', JSON.stringify({ viewMode: 'grid' }));
    await writeBrowseViewMode('artists', 'list');
    await writeBrowseMediaType('artists');

    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'artists',
      viewMode: 'list',
    });

    await writeBrowseMediaType('podcasts');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'podcasts',
      viewMode: 'grid',
    });
  });

  it('does not persist view mode for list-only chips', async () => {
    await writeBrowseViewMode('episodes', 'grid');
    await writeBrowseMediaType('episodes');

    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'episodes',
      viewMode: DEFAULT_HOME_VIEW_MODE,
    });
  });

  it('notifies a watcher when the root or a view-mode scope changes', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBrowseListPrefs(listener);

    await writeBrowseMediaType('artists');
    expect(listener).toHaveBeenCalledTimes(1);

    await writeBrowseViewMode('artists', 'grid');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    await writeBrowseViewMode('podcasts', 'grid');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

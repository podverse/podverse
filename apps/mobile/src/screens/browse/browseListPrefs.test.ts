import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_HOME_VIEW_MODE, readHomeListPrefs } from '../../prefs/homeListPrefs';
import {
  readBrowseListPrefs,
  subscribeBrowseListPrefs,
  writeBrowseMediaType,
  writeBrowseRange,
  writeBrowseSort,
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

  it('leaves Home podcasts on list when Browse podcasts is grid', async () => {
    await writeBrowseViewMode('podcasts', 'grid');

    await expect(readBrowseListPrefs()).resolves.toMatchObject({ viewMode: 'grid' });
    await expect(readHomeListPrefs('podcasts')).resolves.toMatchObject({
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

  it('opens every media type on Top for the week when nothing has been chosen', async () => {
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'podcasts',
      range: 'week',
      sort: 'top',
    });

    await writeBrowseMediaType('playlists');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      mediaType: 'playlists',
      range: 'week',
      sort: 'top',
    });
  });

  it('keeps a sort per media type', async () => {
    await writeBrowseSort('episodes', 'recent');
    await writeBrowseMediaType('episodes');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({ sort: 'recent' });

    await writeBrowseMediaType('clips');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      range: 'week',
      sort: 'top',
    });
  });

  it('choosing a window selects Top for that media type only', async () => {
    await writeBrowseSort('podcasts', 'recent');
    await writeBrowseRange('podcasts', 'day');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      range: 'day',
      sort: 'top',
    });

    await writeBrowseMediaType('artists');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      range: 'week',
      sort: 'top',
    });
  });

  it('keeps the window while Recent is selected', async () => {
    await writeBrowseRange('tracks', 'month');
    await writeBrowseSort('tracks', 'recent');
    await writeBrowseMediaType('tracks');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      range: 'month',
      sort: 'recent',
    });

    await writeBrowseSort('tracks', 'top');
    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      range: 'month',
      sort: 'top',
    });
  });

  it('opens on the week even when the Browse root entry holds a window', async () => {
    inMemoryStore.set('sort.browse', JSON.stringify({ range: 'month' }));

    await expect(readBrowseListPrefs()).resolves.toMatchObject({
      range: 'week',
      sort: 'top',
    });
  });

  it('ignores a stored sort Browse does not offer', async () => {
    inMemoryStore.set('sort.browse-podcasts', JSON.stringify({ sort: 'a_z' }));

    await expect(readBrowseListPrefs()).resolves.toMatchObject({ sort: 'top' });
  });

  it('keeps sort and view mode in one entry per channel type', async () => {
    await writeBrowseViewMode('artists', 'grid');
    await writeBrowseSort('artists', 'recent');

    expect(JSON.parse(inMemoryStore.get('sort.browse-artists') ?? '{}')).toEqual({
      sort: 'recent',
      viewMode: 'grid',
    });
  });

  it('stores no sort for Livestreams', async () => {
    await writeBrowseSort('livestreams', 'recent');
    await writeBrowseRange('livestreams', 'day');

    expect(inMemoryStore.has('sort.browse-livestreams')).toBe(false);
  });

  it("notifies a watcher when the root or a media type's entry changes", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBrowseListPrefs(listener);

    await writeBrowseMediaType('artists');
    expect(listener).toHaveBeenCalledTimes(1);

    await writeBrowseViewMode('artists', 'grid');
    expect(listener).toHaveBeenCalledTimes(2);

    await writeBrowseSort('episodes', 'recent');
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    await writeBrowseViewMode('podcasts', 'grid');
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

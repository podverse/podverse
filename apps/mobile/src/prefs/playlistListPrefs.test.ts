import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PLAYLIST_LIST_RANGE,
  DEFAULT_PLAYLIST_LIST_SORT,
  DEFAULT_PLAYLIST_LIST_TYPE,
  readPlaylistListPrefs,
  writePlaylistListRange,
  writePlaylistListSort,
  writePlaylistListType,
} from './playlistListPrefs';

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

describe('playlistListPrefs', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('opens on the documented defaults when nothing has been stored', async () => {
    await expect(readPlaylistListPrefs()).resolves.toEqual({
      range: DEFAULT_PLAYLIST_LIST_RANGE,
      sort: DEFAULT_PLAYLIST_LIST_SORT,
      type: DEFAULT_PLAYLIST_LIST_TYPE,
    });
  });

  it('remembers list type, sort, and range together', async () => {
    await writePlaylistListType('private_followed');
    await writePlaylistListSort('a_z');
    await writePlaylistListRange('month');

    await expect(readPlaylistListPrefs()).resolves.toEqual({
      range: 'month',
      sort: 'top',
      type: 'private_followed',
    });
  });

  it('keeps range while sort moves off top', async () => {
    await writePlaylistListSort('top');
    await writePlaylistListRange('all-time');
    await writePlaylistListSort('recent');

    await expect(readPlaylistListPrefs()).resolves.toEqual({
      range: 'all-time',
      sort: 'recent',
      type: DEFAULT_PLAYLIST_LIST_TYPE,
    });
  });

  it('falls back to defaults for unrecognized stored values', async () => {
    inMemoryStore.set(
      'sort.library-playlists',
      JSON.stringify({ range: 'fortnight', sort: 'shuffle', type: 'all' })
    );

    await expect(readPlaylistListPrefs()).resolves.toEqual({
      range: DEFAULT_PLAYLIST_LIST_RANGE,
      sort: DEFAULT_PLAYLIST_LIST_SORT,
      type: DEFAULT_PLAYLIST_LIST_TYPE,
    });
  });
});

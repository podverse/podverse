import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_ALBUM_TRACK_SORT,
  DEFAULT_EPISODE_CLIP_SORT,
  DEFAULT_EPISODE_TAB,
  DEFAULT_PODCAST_EPISODE_SORT,
  readAlbumDetailPrefs,
  readEpisodeDetailPrefs,
  readPodcastDetailPrefs,
  writeAlbumDetailSort,
  writeEpisodeDetailClipSort,
  writeEpisodeDetailTab,
  writePodcastDetailSort,
} from './detailListPrefs';

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

describe('detailListPrefs', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('opens on the documented defaults when nothing has been chosen', async () => {
    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual({
      sort: DEFAULT_PODCAST_EPISODE_SORT,
    });
    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({
      sort: DEFAULT_ALBUM_TRACK_SORT,
    });
    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: DEFAULT_EPISODE_CLIP_SORT,
      tab: DEFAULT_EPISODE_TAB,
    });
  });

  it('keeps one podcast sort from speaking for another', async () => {
    await writePodcastDetailSort('podcast-a', 'alphabetical');

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual({ sort: 'alphabetical' });
    await expect(readPodcastDetailPrefs('podcast-b')).resolves.toEqual({
      sort: DEFAULT_PODCAST_EPISODE_SORT,
    });
  });

  it('keeps one episode tab from speaking for another', async () => {
    await writeEpisodeDetailTab('episode-a', 'clips');

    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toMatchObject({ tab: 'clips' });
    await expect(readEpisodeDetailPrefs('episode-b')).resolves.toMatchObject({
      tab: DEFAULT_EPISODE_TAB,
    });
  });

  it('holds a tab and a clip sort against the same episode without either clearing the other', async () => {
    await writeEpisodeDetailTab('episode-a', 'clips');
    await writeEpisodeDetailClipSort('episode-a', 'oldest');

    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: 'oldest',
      tab: 'clips',
    });
  });

  it('files a channel and an item separately even when they share an id_text', async () => {
    await writePodcastDetailSort('shared-id', 'alphabetical');
    await writeEpisodeDetailClipSort('shared-id', 'oldest');

    await expect(readPodcastDetailPrefs('shared-id')).resolves.toEqual({ sort: 'alphabetical' });
    await expect(readEpisodeDetailPrefs('shared-id')).resolves.toMatchObject({
      clipSort: 'oldest',
    });
  });

  it('falls back to the default rather than passing an unrecognised token to a query', async () => {
    inMemoryStore.set('sort.channel:podcast-a', JSON.stringify({ sort: 'shuffle' }));
    inMemoryStore.set('sort.item:episode-a', JSON.stringify({ tab: 'lyrics' }));

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual({
      sort: DEFAULT_PODCAST_EPISODE_SORT,
    });
    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toMatchObject({
      tab: DEFAULT_EPISODE_TAB,
    });
  });

  it('reads an album sort written for the same channel, since an album is a channel', async () => {
    await writeAlbumDetailSort('album-a', 'backward');

    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({ sort: 'backward' });
  });

  it('remembers nothing for a channel with no id_text rather than pooling them together', async () => {
    await writePodcastDetailSort('', 'alphabetical');

    expect(inMemoryStore.size).toBe(0);
    await expect(readPodcastDetailPrefs('')).resolves.toEqual({
      sort: DEFAULT_PODCAST_EPISODE_SORT,
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_ADD_BY_RSS_EPISODE_SORT,
  DEFAULT_ALBUM_DETAIL_RANGE,
  DEFAULT_ALBUM_TRACK_SORT,
  DEFAULT_EPISODE_CLIP_SORT,
  DEFAULT_PODCAST_DETAIL_RANGE,
  DEFAULT_PODCAST_DETAIL_SORT,
  readAddByRssDetailPrefs,
  readAlbumDetailPrefs,
  readEpisodeDetailPrefs,
  readPodcastDetailPrefs,
  writeAddByRssDetailSort,
  writeAlbumDetailRange,
  writeAlbumDetailSort,
  writeEpisodeDetailClipSort,
  writePodcastDetailRange,
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

const defaultPodcastPrefs = {
  range: DEFAULT_PODCAST_DETAIL_RANGE,
  sort: DEFAULT_PODCAST_DETAIL_SORT,
};

describe('detailListPrefs', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('opens on the documented defaults when nothing has been chosen', async () => {
    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual(defaultPodcastPrefs);
    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({
      range: DEFAULT_ALBUM_DETAIL_RANGE,
      sort: DEFAULT_ALBUM_TRACK_SORT,
    });
    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: DEFAULT_EPISODE_CLIP_SORT,
    });
    await expect(readAddByRssDetailPrefs('feed-a')).resolves.toEqual({
      sort: DEFAULT_ADD_BY_RSS_EPISODE_SORT,
    });
  });

  it('keeps one podcast sort from speaking for another', async () => {
    await writePodcastDetailSort('podcast-a', 'oldest');

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual({
      ...defaultPodcastPrefs,
      sort: 'oldest',
    });
    await expect(readPodcastDetailPrefs('podcast-b')).resolves.toEqual(defaultPodcastPrefs);
  });

  it('holds a podcast order and window together without one clearing the rest', async () => {
    await writePodcastDetailSort('podcast-a', 'top');
    await writePodcastDetailRange('podcast-a', 'all-time');

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual({
      range: 'all-time',
      sort: 'top',
    });
  });

  it('ignores a stored section chip and keeps sort and range', async () => {
    inMemoryStore.set(
      'sort.channel:podcast-a',
      JSON.stringify({ range: 'month', sort: 'top', tab: 'clips' })
    );

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual({
      range: 'month',
      sort: 'top',
    });
  });

  it('keeps the window while the order moves off top, so returning reopens it', async () => {
    await writePodcastDetailSort('podcast-a', 'top');
    await writePodcastDetailRange('podcast-a', 'month');
    await writePodcastDetailSort('podcast-a', 'recent');

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toMatchObject({
      range: 'month',
      sort: 'recent',
    });
  });

  it('keeps one episode clip sort from speaking for another', async () => {
    await writeEpisodeDetailClipSort('episode-a', 'oldest');

    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: 'oldest',
    });
    await expect(readEpisodeDetailPrefs('episode-b')).resolves.toEqual({
      clipSort: DEFAULT_EPISODE_CLIP_SORT,
    });
  });

  it('ignores a stored episode section chip and keeps clip sort', async () => {
    inMemoryStore.set('sort.item:episode-a', JSON.stringify({ sort: 'oldest', tab: 'clips' }));

    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: 'oldest',
    });
  });

  it('files a channel and an item separately even when they share an id_text', async () => {
    await writePodcastDetailSort('shared-id', 'oldest');
    await writeEpisodeDetailClipSort('shared-id', 'oldest');

    await expect(readPodcastDetailPrefs('shared-id')).resolves.toMatchObject({ sort: 'oldest' });
    await expect(readEpisodeDetailPrefs('shared-id')).resolves.toMatchObject({
      clipSort: 'oldest',
    });
  });

  it('falls back to the default rather than passing an unrecognised token to a query', async () => {
    inMemoryStore.set(
      'sort.channel:podcast-a',
      JSON.stringify({ range: 'fortnight', sort: 'shuffle', tab: 'boosts' })
    );
    inMemoryStore.set(
      'sort.channel:album-a',
      JSON.stringify({ range: 'fortnight', sort: 'oldest', tab: 'boosts' })
    );
    inMemoryStore.set('sort.item:episode-a', JSON.stringify({ sort: 'shuffle', tab: 'lyrics' }));

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual(defaultPodcastPrefs);
    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({
      range: DEFAULT_ALBUM_DETAIL_RANGE,
      sort: DEFAULT_ALBUM_TRACK_SORT,
    });
    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: DEFAULT_EPISODE_CLIP_SORT,
    });
  });

  it('reads a title order for an add-by-RSS feed, which the podcast union omits', async () => {
    await writeAddByRssDetailSort('feed-a', 'alphabetical');

    await expect(readAddByRssDetailPrefs('feed-a')).resolves.toEqual({ sort: 'alphabetical' });
    await expect(readPodcastDetailPrefs('feed-a')).resolves.toMatchObject({
      sort: DEFAULT_PODCAST_DETAIL_SORT,
    });
  });

  it('reads an album sort written for the same channel, since an album is a channel', async () => {
    await writeAlbumDetailSort('album-a', 'backward');

    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({
      range: DEFAULT_ALBUM_DETAIL_RANGE,
      sort: 'backward',
    });
  });

  it('holds an album sort and range together without one clearing the rest', async () => {
    await writeAlbumDetailSort('album-a', 'top');
    await writeAlbumDetailRange('album-a', 'month');

    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({
      range: 'month',
      sort: 'top',
    });
  });

  it('remembers nothing for a channel with no id_text rather than pooling them', async () => {
    await writePodcastDetailSort('', 'oldest');

    expect(inMemoryStore.size).toBe(0);
    await expect(readPodcastDetailPrefs('')).resolves.toEqual(defaultPodcastPrefs);
    await expect(readAlbumDetailPrefs('')).resolves.toEqual({
      range: DEFAULT_ALBUM_DETAIL_RANGE,
      sort: DEFAULT_ALBUM_TRACK_SORT,
    });
  });
});

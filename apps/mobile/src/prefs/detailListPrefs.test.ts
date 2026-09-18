import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_ADD_BY_RSS_EPISODE_SORT,
  DEFAULT_ALBUM_DETAIL_RANGE,
  DEFAULT_ALBUM_TAB,
  DEFAULT_ALBUM_TRACK_SORT,
  DEFAULT_ARTIST_TAB,
  DEFAULT_EPISODE_CLIP_SORT,
  DEFAULT_EPISODE_TAB,
  DEFAULT_PODCAST_DETAIL_RANGE,
  DEFAULT_PODCAST_DETAIL_SORT,
  DEFAULT_PODCAST_TAB,
  DEFAULT_TRACK_TAB,
  readAddByRssDetailPrefs,
  readAlbumDetailPrefs,
  readArtistDetailPrefs,
  readEpisodeDetailPrefs,
  readPodcastDetailPrefs,
  readTrackDetailPrefs,
  writeAddByRssDetailSort,
  writeAlbumDetailRange,
  writeAlbumDetailSort,
  writeAlbumDetailTab,
  writeArtistDetailTab,
  writeEpisodeDetailClipSort,
  writeEpisodeDetailTab,
  writePodcastDetailRange,
  writePodcastDetailSort,
  writePodcastDetailTab,
  writeTrackDetailTab,
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
  tab: DEFAULT_PODCAST_TAB,
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
      tab: DEFAULT_ALBUM_TAB,
    });
    await expect(readArtistDetailPrefs('artist-a')).resolves.toEqual({
      tab: DEFAULT_ARTIST_TAB,
    });
    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: DEFAULT_EPISODE_CLIP_SORT,
      tab: DEFAULT_EPISODE_TAB,
    });
    await expect(readTrackDetailPrefs('track-a')).resolves.toEqual({
      tab: DEFAULT_TRACK_TAB,
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

  it('holds a podcast pane, order, and window together without one clearing the rest', async () => {
    await writePodcastDetailTab('podcast-a', 'clips');
    await writePodcastDetailSort('podcast-a', 'top');
    await writePodcastDetailRange('podcast-a', 'all-time');

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual({
      range: 'all-time',
      sort: 'top',
      tab: 'clips',
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

  it('keeps one episode tab from speaking for another', async () => {
    await writeEpisodeDetailTab('episode-a', 'clips');

    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toMatchObject({ tab: 'clips' });
    await expect(readEpisodeDetailPrefs('episode-b')).resolves.toMatchObject({
      tab: DEFAULT_EPISODE_TAB,
    });
  });

  it('holds a tab and a clip sort on one episode without either clearing the other', async () => {
    await writeEpisodeDetailTab('episode-a', 'clips');
    await writeEpisodeDetailClipSort('episode-a', 'oldest');

    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toEqual({
      clipSort: 'oldest',
      tab: 'clips',
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
    inMemoryStore.set('sort.channel:artist-a', JSON.stringify({ tab: 'boosts' }));
    inMemoryStore.set('sort.item:episode-a', JSON.stringify({ tab: 'lyrics' }));
    inMemoryStore.set('sort.item:track-a', JSON.stringify({ tab: 'lyrics' }));

    await expect(readPodcastDetailPrefs('podcast-a')).resolves.toEqual(defaultPodcastPrefs);
    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({
      range: DEFAULT_ALBUM_DETAIL_RANGE,
      sort: DEFAULT_ALBUM_TRACK_SORT,
      tab: DEFAULT_ALBUM_TAB,
    });
    await expect(readArtistDetailPrefs('artist-a')).resolves.toEqual({
      tab: DEFAULT_ARTIST_TAB,
    });
    await expect(readEpisodeDetailPrefs('episode-a')).resolves.toMatchObject({
      tab: DEFAULT_EPISODE_TAB,
    });
    await expect(readTrackDetailPrefs('track-a')).resolves.toEqual({
      tab: DEFAULT_TRACK_TAB,
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
      tab: DEFAULT_ALBUM_TAB,
    });
  });

  it('holds an album tab, sort, and range together without one clearing the rest', async () => {
    await writeAlbumDetailTab('album-a', 'about');
    await writeAlbumDetailSort('album-a', 'top');
    await writeAlbumDetailRange('album-a', 'month');

    await expect(readAlbumDetailPrefs('album-a')).resolves.toEqual({
      range: 'month',
      sort: 'top',
      tab: 'about',
    });
  });

  it('remembers one artist tab per artist channel', async () => {
    await writeArtistDetailTab('artist-a', 'tracks');

    await expect(readArtistDetailPrefs('artist-a')).resolves.toEqual({ tab: 'tracks' });
    await expect(readArtistDetailPrefs('artist-b')).resolves.toEqual({
      tab: DEFAULT_ARTIST_TAB,
    });
  });

  it('remembers one track tab per track item', async () => {
    await writeTrackDetailTab('track-a', 'transcript');

    await expect(readTrackDetailPrefs('track-a')).resolves.toEqual({ tab: 'transcript' });
    await expect(readTrackDetailPrefs('track-b')).resolves.toEqual({
      tab: DEFAULT_TRACK_TAB,
    });
  });

  it('remembers nothing for a channel with no id_text rather than pooling them', async () => {
    await writePodcastDetailSort('', 'oldest');

    expect(inMemoryStore.size).toBe(0);
    await expect(readPodcastDetailPrefs('')).resolves.toEqual(defaultPodcastPrefs);
    await expect(readAlbumDetailPrefs('')).resolves.toEqual({
      range: DEFAULT_ALBUM_DETAIL_RANGE,
      sort: DEFAULT_ALBUM_TRACK_SORT,
      tab: DEFAULT_ALBUM_TAB,
    });
    await expect(readArtistDetailPrefs('')).resolves.toEqual({ tab: DEFAULT_ARTIST_TAB });
    await expect(readTrackDetailPrefs('')).resolves.toEqual({ tab: DEFAULT_TRACK_TAB });
  });
});

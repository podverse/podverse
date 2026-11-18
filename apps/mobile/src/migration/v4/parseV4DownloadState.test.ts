import { describe, expect, it, vi } from 'vitest';

vi.mock('./v4DownloadNames', async () => {
  const actual = await vi.importActual<typeof import('./v4DownloadNames')>('./v4DownloadNames');
  return {
    ...actual,
    isSafeV4FileKey: (fileKey: string): boolean => {
      if (fileKey === 'throw.mp3') {
        throw new Error('boom');
      }
      return actual.isSafeV4FileKey(fileKey);
    },
  };
});

import type { V4DownloadStagedEntry, V4DownloadStateRaw } from './parseV4DownloadState';
import { orphanStagedEntry, parseV4DownloadState } from './parseV4DownloadState';

const emptyRaw = (): V4DownloadStateRaw => ({
  downloadedPodcasts: null,
  downloadingEpisodes: null,
  sharedFolder: null,
});

const entry = (overrides: Partial<V4DownloadStagedEntry>): V4DownloadStagedEntry => ({
  addByRssFeedUrl: null,
  episodeDurationSeconds: null,
  episodeGuid: null,
  episodeImageUrl: null,
  episodeMediaType: null,
  episodePubDateMs: null,
  episodeTitle: null,
  fileKey: '',
  isAddByRss: false,
  legacyEpisodeId: null,
  legacyExtension: '',
  legacyPodcastId: null,
  mediaUrl: null,
  orphanRoot: null,
  podcastFeedUrl: null,
  podcastGuid: null,
  podcastImageUrl: null,
  podcastIndexId: null,
  podcastTitle: null,
  source: 'downloaded',
  ...overrides,
});

describe('parseV4DownloadState', () => {
  it('reads malformed JSON, the wrong shape, and empty input as no entries', () => {
    const malformed = ['{', '{"id":"pod"}', '"pod"', '123', 'null'];
    for (const value of malformed) {
      expect(parseV4DownloadState({ ...emptyRaw(), downloadedPodcasts: value }).entries).toEqual(
        []
      );
      expect(parseV4DownloadState({ ...emptyRaw(), downloadingEpisodes: value }).entries).toEqual(
        []
      );
    }

    expect(parseV4DownloadState(emptyRaw())).toEqual({ entries: [], sharedFolder: null });
    expect(
      parseV4DownloadState({
        downloadedPodcasts: '[]',
        downloadingEpisodes: '[]',
        sharedFolder: '   ',
      })
    ).toEqual({ entries: [], sharedFolder: null });
    expect(
      parseV4DownloadState({
        ...emptyRaw(),
        downloadedPodcasts: JSON.stringify([{ id: 'pod' }, null, 'x', { episodes: {} }]),
        downloadingEpisodes: JSON.stringify([null, 'x', 4]),
        sharedFolder:
          '  content://com.android.externalstorage.documents/tree/primary%3ADownload/  ',
      })
    ).toEqual({
      entries: [],
      sharedFolder: 'content://com.android.externalstorage.documents/tree/primary%3ADownload/',
    });
  });

  it('keeps the shared folder text when parsing throws', () => {
    const parsed = parseV4DownloadState({
      ...emptyRaw(),
      downloadedPodcasts: JSON.stringify([
        {
          episodes: [{ id: 'throw', mediaUrl: 'https://cdn.example/a.mp3' }],
          id: 'pod',
        },
      ]),
      sharedFolder: '  /sdcard/Podcasts/  ',
    });

    expect(parsed).toEqual({ entries: [], sharedFolder: '/sdcard/Podcasts/' });
  });

  it('stages a directory episode from its id, extension, and cached podcast fields', () => {
    const parsed = parseV4DownloadState({
      ...emptyRaw(),
      downloadedPodcasts: JSON.stringify([
        {
          episodes: [
            {
              duration: '90.9',
              guid: ' item-guid ',
              id: 'episode-1',
              imageUrl: ' https://cdn.example/ep.jpg ',
              mediaType: ' audio/mpeg ',
              mediaUrl: 'https://cdn.example/episode-1.mp3',
              pubDate: '2020-01-02T03:04:05.000Z',
              title: ' Episode One ',
            },
          ],
          feedUrls: [{ url: 'https://example.com/show.xml' }],
          id: 'pod-1',
          imageUrl: 'https://cdn.example/cover.jpg',
          podcastGuid: ' pod-guid ',
          podcastIndexId: 42,
          shrunkImageUrl: 'ftp://cdn.example/small.jpg',
          title: '  Directory Show  ',
        },
      ]),
    });

    expect(parsed.sharedFolder).toBeNull();
    expect(parsed.entries).toEqual([
      entry({
        episodeDurationSeconds: 90,
        episodeGuid: 'item-guid',
        episodeImageUrl: 'https://cdn.example/ep.jpg',
        episodeMediaType: 'audio/mpeg',
        episodePubDateMs: Date.parse('2020-01-02T03:04:05.000Z'),
        episodeTitle: 'Episode One',
        fileKey: 'episode-1.mp3',
        legacyEpisodeId: 'episode-1',
        legacyExtension: '.mp3',
        legacyPodcastId: 'pod-1',
        mediaUrl: 'https://cdn.example/episode-1.mp3',
        podcastFeedUrl: 'https://example.com/show.xml',
        podcastGuid: 'pod-guid',
        podcastImageUrl: 'https://cdn.example/cover.jpg',
        podcastIndexId: '42',
        podcastTitle: 'Directory Show',
        source: 'downloaded',
      }),
    ]);
  });

  it('stages an Add by RSS episode under the canonical feed URL', () => {
    const parsed = parseV4DownloadState({
      ...emptyRaw(),
      downloadedPodcasts: JSON.stringify([
        {
          episodes: [
            {
              addedByRSS: true,
              id: 'ab/cd',
              mediaUrl: 'https://cdn.example/voice.mp3',
              title: 'Voice',
            },
          ],
          feedUrls: [{ url: 'https://example.com/not-used.xml' }],
          id: 'https://example.com/feed/',
          title: 'Private',
        },
      ]),
    });

    expect(parsed.entries).toEqual([
      entry({
        addByRssFeedUrl: 'https://example.com/feed',
        episodeTitle: 'Voice',
        fileKey: 'ab/cd.mp3',
        isAddByRss: true,
        legacyEpisodeId: 'ab/cd',
        legacyExtension: '.mp3',
        mediaUrl: 'https://cdn.example/voice.mp3',
        podcastTitle: 'Private',
        source: 'downloaded',
      }),
    ]);
  });

  it('strips userinfo and still stages a file whose media URL is not http', () => {
    const secret = 's3cret';
    const parsed = parseV4DownloadState({
      ...emptyRaw(),
      downloadedPodcasts: JSON.stringify([
        {
          episodes: [
            {
              id: 'ep',
              imageUrl: `https://epuser:${secret}@cdn.example/ep.jpg`,
              mediaUrl: `https://bob:${secret}@cdn.example/ep.mp3?token=1`,
            },
            {
              id: 'clip',
              mediaUrl: 'ftp://cdn.example/clip.ogg',
            },
          ],
          feedUrls: [{ url: `https://alice:${secret}@example.com/show.xml` }],
          id: 'pod-1',
          shrunkImageUrl: `https://imguser:${secret}@cdn.example/art.jpg`,
        },
      ]),
    });

    expect(parsed.entries).toEqual([
      entry({
        episodeImageUrl: 'https://cdn.example/ep.jpg',
        fileKey: 'ep.mp3',
        legacyEpisodeId: 'ep',
        legacyExtension: '.mp3',
        legacyPodcastId: 'pod-1',
        mediaUrl: 'https://cdn.example/ep.mp3?token=1',
        podcastFeedUrl: 'https://example.com/show.xml',
        podcastImageUrl: 'https://cdn.example/art.jpg',
        source: 'downloaded',
      }),
      entry({
        fileKey: 'clip.ogg',
        legacyEpisodeId: 'clip',
        legacyExtension: '.ogg',
        legacyPodcastId: 'pod-1',
        podcastFeedUrl: 'https://example.com/show.xml',
        podcastImageUrl: 'https://cdn.example/art.jpg',
        source: 'downloaded',
      }),
    ]);
    const serialized = JSON.stringify(parsed.entries);
    expect(serialized.includes(secret)).toBe(false);
    expect(serialized.includes('alice')).toBe(false);
    expect(serialized.includes('bob')).toBe(false);
    expect(serialized.includes('imguser')).toBe(false);
    expect(serialized.includes('epuser')).toBe(false);
  });

  it('skips an episode with no id, no media URL, or an unsafe file key', () => {
    const parsed = parseV4DownloadState({
      ...emptyRaw(),
      downloadedPodcasts: JSON.stringify([
        {
          episodes: [
            { mediaUrl: 'https://cdn.example/a.mp3' },
            { id: '   ', mediaUrl: 'https://cdn.example/a.mp3' },
            { id: 'blank', mediaUrl: '   ' },
            { id: 'missing' },
            { id: 'num', mediaUrl: 12 },
            { id: '../x', mediaUrl: 'https://cdn.example/a.mp3' },
            { id: 'kept', mediaUrl: 'https://cdn.example/kept.mp3', title: 'Kept' },
          ],
          id: 'pod-1',
        },
      ]),
    });

    expect(parsed.entries).toEqual([
      entry({
        episodeTitle: 'Kept',
        fileKey: 'kept.mp3',
        legacyEpisodeId: 'kept',
        legacyExtension: '.mp3',
        legacyPodcastId: 'pod-1',
        mediaUrl: 'https://cdn.example/kept.mp3',
        source: 'downloaded',
      }),
    ]);
  });

  it('keeps the downloaded row when both lists name the same file', () => {
    const parsed = parseV4DownloadState({
      ...emptyRaw(),
      downloadedPodcasts: JSON.stringify([
        {
          episodes: [
            { id: 'same', mediaUrl: 'https://cdn.example/same.mp3', title: 'First' },
            { id: 'same', mediaUrl: 'https://cdn.example/same.mp3', title: 'Second' },
          ],
          id: 'pod-down',
          title: 'Downloaded Show',
        },
      ]),
      downloadingEpisodes: JSON.stringify([
        {
          id: 'same',
          mediaUrl: 'https://cdn.example/same.mp3',
          podcast: { id: 'pod-other', title: 'Should Not Win' },
          title: 'Downloading Same',
        },
        {
          id: 'only',
          mediaUrl: 'https://cdn.example/only.m4a',
          podcast: { id: 'pod-2', title: 'Embedded Show' },
          title: 'Only',
        },
        {
          id: 'bare',
          mediaUrl: 'https://cdn.example/bare.mp3',
          title: 'Bare',
        },
      ]),
    });

    expect(parsed.entries).toEqual([
      entry({
        episodeTitle: 'First',
        fileKey: 'same.mp3',
        legacyEpisodeId: 'same',
        legacyExtension: '.mp3',
        legacyPodcastId: 'pod-down',
        mediaUrl: 'https://cdn.example/same.mp3',
        podcastTitle: 'Downloaded Show',
        source: 'downloaded',
      }),
      entry({
        episodeTitle: 'Only',
        fileKey: 'only.m4a',
        legacyEpisodeId: 'only',
        legacyExtension: '.m4a',
        legacyPodcastId: 'pod-2',
        mediaUrl: 'https://cdn.example/only.m4a',
        podcastTitle: 'Embedded Show',
        source: 'downloading',
      }),
      entry({
        episodeTitle: 'Bare',
        fileKey: 'bare.mp3',
        legacyEpisodeId: 'bare',
        legacyExtension: '.mp3',
        mediaUrl: 'https://cdn.example/bare.mp3',
        source: 'downloading',
      }),
    ]);
  });
});

describe('orphanStagedEntry', () => {
  it('sets the source, root, and extension, and leaves the other fields empty', () => {
    expect(orphanStagedEntry({ fileKey: 'loose.mp3', root: 'app_external_files' })).toEqual(
      entry({
        fileKey: 'loose.mp3',
        legacyExtension: '.mp3',
        orphanRoot: 'app_external_files',
        source: 'orphan',
      })
    );
  });
});

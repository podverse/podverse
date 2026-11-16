import { describe, expect, it } from 'vitest';

import type { DTOAddByRSSMatchFeed, DTOLegacyPodcastLookupChannel } from '@podverse/helpers/dto';

import type { V4DownloadCarryoverRow } from '../../data/repositories/v4DownloadCarryoverRepository';
import { hashEnclosureUri } from '../../downloads/downloadStorage';
import type { V4DownloadDirectoryTarget } from './planV4DownloadCarryover';
import {
  decideV4DownloadAfterItemFetch,
  decideV4DownloadAfterLookup,
  decideV4DownloadAfterMatch,
  decideV4DownloadBeforeNetwork,
  planV4AddByRssMatch,
  settleV4DownloadFailure,
  v4AdoptedFileName,
  v4DownloadCarryoverLogDetails,
  v4DownloadFallbackSource,
  v4EpisodeLookupRef,
  v4KeptItemIdText,
} from './planV4DownloadCarryover';

const row = (overrides: Partial<V4DownloadCarryoverRow> = {}): V4DownloadCarryoverRow => ({
  addByRssFeedUrl: null,
  adoptedFileName: null,
  attempts: 0,
  episodeDurationSeconds: null,
  episodeGuid: null,
  episodeImageUrl: null,
  episodeMediaType: null,
  episodePubDateMs: null,
  episodeTitle: null,
  fileKey: 'episode.mp3',
  isAddByRss: false,
  legacyEpisodeId: null,
  legacyExtension: '.mp3',
  legacyPodcastId: null,
  mediaUrl: null,
  orphanRoot: null,
  podcastFeedUrl: null,
  podcastGuid: null,
  podcastImageUrl: null,
  podcastIndexId: null,
  podcastTitle: null,
  source: 'downloaded',
  status: 'pending',
  updatedAt: 0,
  ...overrides,
});

const channel = (
  idText: string,
  title: string | null = 'Directory Show',
  imageUrl: string | null = 'https://img.example/channel.jpg'
): DTOLegacyPodcastLookupChannel => ({
  id_text: idText,
  image_url: imageUrl,
  medium_id: 2,
  title,
});

const mediaRow = (overrides: Partial<V4DownloadCarryoverRow> = {}): V4DownloadCarryoverRow =>
  row({
    mediaUrl: 'https://cdn.example/episode.mp3',
    ...overrides,
  });

describe('decideV4DownloadBeforeNetwork', () => {
  it('deletes an orphan row', () => {
    expect(
      decideV4DownloadBeforeNetwork(
        row({
          legacyEpisodeId: 'ep1',
          legacyPodcastId: 'pod1',
          mediaUrl: 'https://cdn.example/episode.mp3',
          source: 'orphan',
        })
      )
    ).toEqual({ kind: 'delete', reason: 'orphan' });
  });

  it('deletes an unfinished download', () => {
    expect(
      decideV4DownloadBeforeNetwork(
        row({
          legacyEpisodeId: 'ep1',
          legacyPodcastId: 'pod1',
          mediaUrl: 'https://cdn.example/episode.mp3',
          source: 'downloading',
        })
      )
    ).toEqual({ kind: 'delete', reason: 'partial' });
  });

  it('asks the directory match for an Add by RSS row using the canonical feed URL', () => {
    expect(
      decideV4DownloadBeforeNetwork(
        row({
          addByRssFeedUrl: 'https://Feed.example/show/',
          isAddByRss: true,
          legacyEpisodeId: 'ep1',
          legacyPodcastId: 'pod1',
        })
      )
    ).toEqual({ feedUrl: 'https://feed.example/show', kind: 'match' });
  });

  it('deletes an Add by RSS row whose feed URL cannot be used', () => {
    expect(
      decideV4DownloadBeforeNetwork(row({ addByRssFeedUrl: 'not-a-url', isAddByRss: true }))
    ).toEqual({ kind: 'delete', reason: 'no_identity' });
  });

  it('asks the episode lookup for a directory row with usable ids', () => {
    expect(
      decideV4DownloadBeforeNetwork(
        mediaRow({
          episodeGuid: 'guid-1',
          legacyEpisodeId: '12345678901234',
          legacyPodcastId: 'pod1',
        })
      )
    ).toEqual({
      kind: 'lookup',
      ref: {
        episode_id: '12345678901234',
        guid: 'guid-1',
        media_url: 'https://cdn.example/episode.mp3',
        podcast_id: 'pod1',
      },
    });
  });

  it('saves a directory row whose episode id is too long when a feed URL is cached', () => {
    const decision = decideV4DownloadBeforeNetwork(
      mediaRow({
        episodeTitle: 'Too Long',
        legacyEpisodeId: '123456789012345',
        legacyPodcastId: 'pod1',
        podcastFeedUrl: 'https://Cached.example/feed.xml/',
        podcastTitle: '  Cached Show  ',
      })
    );

    expect(decision.kind).toBe('add_by_rss');
    if (decision.kind !== 'add_by_rss') {
      return;
    }
    expect(decision.feedUrl).toBe('https://cached.example/feed.xml');
    expect(decision.feedTitle).toBe('Cached Show');
    expect(decision.episode.title).toBe('Too Long');
  });

  it('deletes a directory row whose episode id is too long and that has no feed URL', () => {
    expect(
      decideV4DownloadBeforeNetwork(
        mediaRow({
          legacyEpisodeId: '123456789012345',
          legacyPodcastId: 'pod1',
        })
      )
    ).toEqual({ kind: 'delete', reason: 'no_identity' });
  });

  it('deletes an Add by RSS decision that has no media URL', () => {
    expect(
      decideV4DownloadBeforeNetwork(
        row({ podcastFeedUrl: 'https://cached.example/feed.xml', podcastTitle: 'Cached' })
      )
    ).toEqual({ kind: 'delete', reason: 'no_media_url' });
  });
});

describe('v4EpisodeLookupRef', () => {
  it('trims episode and podcast ids', () => {
    expect(
      v4EpisodeLookupRef(
        mediaRow({
          episodeGuid: 'guid-1',
          legacyEpisodeId: '  ep1  ',
          legacyPodcastId: ' pod1 ',
        })
      )
    ).toEqual({
      episode_id: 'ep1',
      guid: 'guid-1',
      media_url: 'https://cdn.example/episode.mp3',
      podcast_id: 'pod1',
    });
  });

  it('sends a guid longer than 2048 characters as null', () => {
    const ref = v4EpisodeLookupRef(
      mediaRow({
        episodeGuid: 'g'.repeat(2049),
        legacyEpisodeId: 'ep1',
        legacyPodcastId: 'pod1',
      })
    );

    expect(ref?.guid).toBeNull();
    expect(ref?.episode_id).toBe('ep1');
    expect(ref?.media_url).toBe('https://cdn.example/episode.mp3');
    expect(
      v4EpisodeLookupRef(
        row({
          episodeGuid: 'guid-1',
          legacyEpisodeId: 'ep1',
          legacyPodcastId: 'pod1',
          mediaUrl: 'm'.repeat(2049),
        })
      )?.media_url
    ).toBeNull();
  });

  it('returns null for an Add by RSS row', () => {
    expect(
      v4EpisodeLookupRef(row({ isAddByRss: true, legacyEpisodeId: 'ep1', legacyPodcastId: 'pod1' }))
    ).toBeNull();
  });
});

describe('v4KeptItemIdText', () => {
  it('builds a stable id longer than a server id, including for a punctuation-only key', () => {
    const key = 'ep/isode-1.mp3';
    const punctuation = '///';

    expect(v4KeptItemIdText(key)).toBe(v4KeptItemIdText(key));
    expect(v4KeptItemIdText(key)).not.toBe(v4KeptItemIdText('other-episode.mp3'));
    for (const id of [v4KeptItemIdText(key), v4KeptItemIdText(punctuation)]) {
      expect(id.startsWith('v4-download-')).toBe(true);
      expect(id.length).toBeGreaterThan(15);
    }
    expect(v4KeptItemIdText(punctuation)).toBe(`v4-download-${hashEnclosureUri(punctuation)}`);
  });
});

describe('decideV4DownloadAfterLookup', () => {
  it('adopts a lookup item as a directory episode and uses the channel image', () => {
    expect(
      decideV4DownloadAfterLookup(
        mediaRow({
          episodeImageUrl: 'https://img.example/episode.jpg',
          podcastImageUrl: 'https://img.example/podcast.jpg',
        }),
        {
          channel: channel(' chan0001 ', '  Directory Show  ', 'https://img.example/channel.jpg'),
          episode_id: 'ep1',
          item_id_text: ' item0001 ',
          kind: 'item',
        }
      )
    ).toEqual({
      kind: 'directory',
      target: {
        channelIdText: 'chan0001',
        channelTitle: 'Directory Show',
        fallbackArtworkUrl: 'https://img.example/channel.jpg',
        itemIdText: 'item0001',
      },
    });
  });

  it('keeps an episode on the directory show when the lookup found the channel only', () => {
    const fileKey = 'episode-one.mp3';
    const decision = decideV4DownloadAfterLookup(
      mediaRow({
        episodeGuid: 'guid-1',
        episodeTitle: 'Old Episode',
        fileKey,
        podcastFeedUrl: 'https://cached.example/feed.xml',
      }),
      {
        channel: channel('chan0001'),
        episode_id: 'ep1',
        kind: 'channel',
      }
    );

    expect(decision.kind).toBe('directory_kept');
    if (decision.kind !== 'directory_kept') {
      return;
    }
    expect(decision.kept.channelIdText).toBe('chan0001');
    expect(decision.kept.item.id_text).toBe(v4KeptItemIdText(fileKey));
    expect(decision.kept.item.item_values).toEqual([]);
    expect(decision.kept.item.guid).toBe('guid-1');
    expect(decision.kept.item.title).toBe('Old Episode');
    expect(decision.kept.item.item_enclosures[0]?.item_enclosure_sources[0]?.uri).toBe(
      'https://cdn.example/episode.mp3'
    );
  });

  it('deletes a channel answer whose channel id is empty', () => {
    expect(
      decideV4DownloadAfterLookup(mediaRow(), {
        channel: channel('   '),
        episode_id: 'ep1',
        kind: 'channel',
      })
    ).toEqual({ kind: 'delete', reason: 'no_identity' });
  });

  it('keeps a channel answer that has no cached feed URL', () => {
    expect(
      decideV4DownloadAfterLookup(mediaRow({ podcastFeedUrl: null }), {
        channel: channel('chan0001'),
        episode_id: 'ep1',
        kind: 'channel',
      }).kind
    ).toBe('directory_kept');
  });

  it('saves a feed-url answer as Add by RSS with the answer address', () => {
    const decision = decideV4DownloadAfterLookup(
      mediaRow({ podcastFeedUrl: 'https://cached.example/feed.xml' }),
      {
        episode_id: 'ep1',
        feed_url: 'https://Answer.example/feed.xml/',
        kind: 'feed_url',
      }
    );

    expect(decision.kind).toBe('add_by_rss');
    if (decision.kind !== 'add_by_rss') {
      return;
    }
    expect(decision.feedUrl).toBe('https://answer.example/feed.xml');
  });

  it('deletes a blocked show and does not save its cached feed', () => {
    expect(
      decideV4DownloadAfterLookup(mediaRow({ podcastFeedUrl: 'https://cached.example/feed.xml' }), {
        episode_id: 'ep1',
        kind: 'blocked',
      })
    ).toEqual({ kind: 'delete', reason: 'blocked' });
  });

  it('saves a not-here show from its cached feed URL', () => {
    const decision = decideV4DownloadAfterLookup(
      mediaRow({
        podcastFeedUrl: 'https://Cached.example/feed.xml/',
        podcastTitle: 'Cached Show',
      }),
      { episode_id: 'ep1', kind: 'not_here' }
    );

    expect(decision.kind).toBe('add_by_rss');
    if (decision.kind !== 'add_by_rss') {
      return;
    }
    expect(decision.feedUrl).toBe('https://cached.example/feed.xml');
  });

  it('retries a not-here show that has no feed URL', () => {
    expect(
      decideV4DownloadAfterLookup(mediaRow({ attempts: 0, podcastFeedUrl: null }), {
        episode_id: 'ep1',
        kind: 'not_here',
      })
    ).toEqual({ kind: 'retry' });
  });

  it('deletes a not-here show with no feed URL on the last attempt', () => {
    expect(
      decideV4DownloadAfterLookup(mediaRow({ attempts: 4, podcastFeedUrl: null }), {
        episode_id: 'ep1',
        kind: 'not_here',
      })
    ).toEqual({ kind: 'delete', reason: 'not_in_directory' });
  });

  it('retries a missing lookup answer on the last attempt when no feed URL is cached', () => {
    expect(decideV4DownloadAfterLookup(mediaRow({ attempts: 4 }), undefined)).toEqual({
      kind: 'retry',
    });
  });

  it('saves a missing lookup answer from the cached feed URL on the last attempt', () => {
    const decision = decideV4DownloadAfterLookup(
      mediaRow({
        attempts: 4,
        podcastFeedUrl: 'https://Cached.example/feed.xml/',
      }),
      undefined
    );

    expect(decision.kind).toBe('add_by_rss');
    if (decision.kind !== 'add_by_rss') {
      return;
    }
    expect(decision.feedUrl).toBe('https://cached.example/feed.xml');
  });
});

describe('carried Add by RSS episode', () => {
  it('uses an ISO publish date and falls back to the podcast image', () => {
    const publishedAt = 1_700_000_000_000;
    const decision = decideV4DownloadBeforeNetwork(
      mediaRow({
        episodeImageUrl: null,
        episodePubDateMs: publishedAt,
        episodeTitle: 'Carried',
        podcastFeedUrl: 'https://cached.example/feed.xml',
        podcastImageUrl: 'https://img.example/podcast.jpg',
      })
    );

    expect(decision.kind).toBe('add_by_rss');
    if (decision.kind !== 'add_by_rss') {
      return;
    }
    expect(decision.episode.pubDate).toBe(new Date(publishedAt).toISOString());
    expect(decision.episode.imageUrl).toBe('https://img.example/podcast.jpg');
  });
});

describe('directory_kept without a media URL', () => {
  it('keeps the show and points the fallback source at the local item id', () => {
    const fileKey = 'no-media.mp3';
    const decision = decideV4DownloadAfterLookup(
      row({
        fileKey,
        mediaUrl: null,
        podcastFeedUrl: 'https://cached.example/feed.xml',
      }),
      {
        channel: channel('chan0001'),
        episode_id: 'ep1',
        kind: 'channel',
      }
    );

    expect(decision.kind).toBe('directory_kept');
    if (decision.kind !== 'directory_kept') {
      return;
    }
    const itemIdText = v4KeptItemIdText(fileKey);
    expect(decision.kept.item.item_enclosures).toEqual([]);
    expect(decision.kept.item.id_text).toBe(itemIdText);
    expect(decision.kept.fallbackSource.uri).toBe(`file://${itemIdText}`);
  });
});

describe('planV4AddByRssMatch', () => {
  it('groups two rows of one feed and keeps a second feed separate', () => {
    const planned = planV4AddByRssMatch([
      row({
        addByRssFeedUrl: 'https://Feed.example/show/',
        episodeGuid: 'guid-a',
        fileKey: 'a.mp3',
        mediaUrl: 'https://cdn.example/a.mp3',
        podcastGuid: null,
      }),
      row({
        addByRssFeedUrl: 'https://feed.example/show',
        episodeGuid: 'guid-b',
        fileKey: 'b.mp3',
        mediaUrl: 'https://cdn.example/b.mp3',
        podcastGuid: 'pod-guid',
      }),
      row({
        addByRssFeedUrl: 'https://other.example/feed',
        episodeGuid: 'guid-c',
        fileKey: 'c.mp3',
        mediaUrl: 'https://cdn.example/c.mp3',
        podcastGuid: 'other-guid',
      }),
    ]);

    expect(planned.feeds).toEqual([
      {
        feedUrl: 'https://feed.example/show',
        items: [
          { enclosureUrl: 'https://cdn.example/a.mp3', guid: 'guid-a' },
          { enclosureUrl: 'https://cdn.example/b.mp3', guid: 'guid-b' },
        ],
        podcastGuid: 'pod-guid',
      },
      {
        feedUrl: 'https://other.example/feed',
        items: [{ enclosureUrl: 'https://cdn.example/c.mp3', guid: 'guid-c' }],
        podcastGuid: 'other-guid',
      },
    ]);
    expect(planned.positions.get('a.mp3')).toEqual({
      feedUrl: 'https://feed.example/show',
      itemIndex: 0,
    });
    expect(planned.positions.get('b.mp3')).toEqual({
      feedUrl: 'https://feed.example/show',
      itemIndex: 1,
    });
    expect(planned.positions.get('c.mp3')).toEqual({
      feedUrl: 'https://other.example/feed',
      itemIndex: 0,
    });
  });
});

describe('decideV4DownloadAfterMatch', () => {
  const matchedRow = mediaRow({
    addByRssFeedUrl: 'https://Feed.example/show/',
    episodeImageUrl: 'https://img.example/episode.jpg',
    podcastImageUrl: 'https://img.example/podcast.jpg',
    podcastTitle: 'Cached Show',
  });

  const answered = (
    channelId: string | null,
    itemIdText: string | null
  ): { itemIndex: number; kind: 'answered'; match: DTOAddByRSSMatchFeed } => ({
    itemIndex: 0,
    kind: 'answered',
    match: {
      channel:
        channelId === null ? null : { id_text: channelId, medium_id: 2, title: 'Directory Show' },
      feed_url: 'https://feed.example/show',
      items: [
        {
          enclosure_url: 'https://cdn.example/episode.mp3',
          guid: 'guid-1',
          item_id_text: itemIdText,
        },
      ],
    },
  });

  it('adopts an answered match that names an item', () => {
    expect(decideV4DownloadAfterMatch(matchedRow, answered('chan0001', 'item0001'))).toEqual({
      kind: 'directory',
      target: {
        channelIdText: 'chan0001',
        channelTitle: 'Directory Show',
        fallbackArtworkUrl: 'https://img.example/episode.jpg',
        itemIdText: 'item0001',
      },
    });
  });

  it('keeps the show when an answered match has a channel and no item id', () => {
    const decision = decideV4DownloadAfterMatch(matchedRow, answered('chan0001', null));

    expect(decision.kind).toBe('directory_kept');
    if (decision.kind !== 'directory_kept') {
      return;
    }
    expect(decision.kept.channelIdText).toBe('chan0001');
    expect(decision.kept.item.id_text).toBe(v4KeptItemIdText(matchedRow.fileKey));
  });

  it('saves an answered match whose channel is null as Add by RSS', () => {
    const decision = decideV4DownloadAfterMatch(matchedRow, answered(null, null));

    expect(decision.kind).toBe('add_by_rss');
    if (decision.kind !== 'add_by_rss') {
      return;
    }
    expect(decision.feedUrl).toBe('https://feed.example/show');
  });

  it('retries a failed match before the last attempt', () => {
    expect(decideV4DownloadAfterMatch(matchedRow, { kind: 'failed' })).toEqual({ kind: 'retry' });
  });

  it('saves a failed match as Add by RSS on the last attempt', () => {
    const decision = decideV4DownloadAfterMatch(
      mediaRow({
        addByRssFeedUrl: 'https://Feed.example/show/',
        attempts: 4,
      }),
      { kind: 'failed' }
    );

    expect(decision.kind).toBe('add_by_rss');
    if (decision.kind !== 'add_by_rss') {
      return;
    }
    expect(decision.feedUrl).toBe('https://feed.example/show');
  });
});

describe('decideV4DownloadAfterItemFetch', () => {
  const target: V4DownloadDirectoryTarget = {
    channelIdText: 'chan0001',
    channelTitle: 'Directory Show',
    fallbackArtworkUrl: 'https://img.example/channel.jpg',
    itemIdText: 'serverItem01',
  };

  it('keeps the show when the item fetch is gone and does not reuse the missing item id', () => {
    const fileKey = 'kept-file.mp3';
    const decision = decideV4DownloadAfterItemFetch(
      mediaRow({
        fileKey,
        podcastFeedUrl: 'https://cached.example/feed.xml',
      }),
      target,
      'gone'
    );

    expect(decision.kind).toBe('directory_kept');
    if (decision.kind !== 'directory_kept') {
      return;
    }
    expect(decision.kept.channelIdText).toBe('chan0001');
    expect(decision.kept.item.id_text).toBe(v4KeptItemIdText(fileKey));
    expect(decision.kept.item.id_text).not.toBe(target.itemIdText);
  });

  it('retries a failed item fetch at the first attempt and past the last', () => {
    expect(decideV4DownloadAfterItemFetch(mediaRow({ attempts: 0 }), target, 'failed')).toEqual({
      kind: 'retry',
    });
    expect(decideV4DownloadAfterItemFetch(mediaRow({ attempts: 9 }), target, 'failed')).toEqual({
      kind: 'retry',
    });
  });
});

describe('settleV4DownloadFailure', () => {
  it('retries an adopt failure and deletes it on the last attempt', () => {
    expect(settleV4DownloadFailure(row({ attempts: 0 }), 'adopt_failed')).toEqual({
      kind: 'retry',
    });
    expect(settleV4DownloadFailure(row({ attempts: 4 }), 'adopt_failed')).toEqual({
      kind: 'delete',
      reason: 'gave_up',
    });
  });

  it('retries a vanished feed and deletes it on the last attempt', () => {
    expect(settleV4DownloadFailure(row({ attempts: 0 }), 'no_feed')).toEqual({ kind: 'retry' });
    expect(settleV4DownloadFailure(row({ attempts: 4 }), 'no_feed')).toEqual({
      kind: 'delete',
      reason: 'gave_up',
    });
  });

  it('retries an unreadable folder and counts it on the last attempt', () => {
    expect(settleV4DownloadFailure(row({ attempts: 0 }), 'unreachable')).toEqual({
      kind: 'retry',
    });
    expect(settleV4DownloadFailure(row({ attempts: 4 }), 'unreachable')).toEqual({
      kind: 'final',
      status: 'unreachable',
    });
  });

  it('retries a failed delete and counts it on the last attempt', () => {
    expect(settleV4DownloadFailure(row({ attempts: 0 }), 'delete_failed')).toEqual({
      kind: 'retry',
    });
    expect(settleV4DownloadFailure(row({ attempts: 4 }), 'delete_failed')).toEqual({
      kind: 'final',
      status: 'delete_failed',
    });
  });
});

describe('v4AdoptedFileName', () => {
  it('starts with v4-, drops the legacy extension, and uses the given extension', () => {
    const name = v4AdoptedFileName(
      { fileKey: 'ab/episodeOne.mp3', legacyExtension: '.mp3' },
      'm4a'
    );

    expect(name.startsWith('v4-')).toBe(true);
    expect(name.endsWith('.m4a')).toBe(true);
    expect(name.includes('/')).toBe(false);
    expect(name.includes('episodeOne.mp3')).toBe(false);
    expect(name.includes('v4-ab_episodeOne-')).toBe(true);
  });

  it('differs for two keys that share their first 100 characters', () => {
    const shared = 'a'.repeat(100);
    const first = v4AdoptedFileName(
      { fileKey: `${shared}XXXX.mp3`, legacyExtension: '.mp3' },
      'mp3'
    );
    const second = v4AdoptedFileName(
      { fileKey: `${shared}YYYY.mp3`, legacyExtension: '.mp3' },
      'mp3'
    );

    expect(first).not.toBe(second);
  });

  it('stays under 120 characters for a 250-character key', () => {
    const fileKey = `${'b'.repeat(246)}.mp3`;
    expect(fileKey).toHaveLength(250);
    expect(v4AdoptedFileName({ fileKey, legacyExtension: '.mp3' }, 'mp3').length).toBeLessThan(120);
  });
});

describe('v4DownloadFallbackSource', () => {
  it('treats a video MIME as video', () => {
    expect(
      v4DownloadFallbackSource(
        mediaRow({ episodeMediaType: 'video/mp4', mediaUrl: 'https://cdn.example/episode.mp4' }),
        'mp4'
      )
    ).toEqual({
      fileExtension: 'mp4',
      mediaType: 'video',
      mime: 'video/mp4',
      uri: 'https://cdn.example/episode.mp4',
    });
  });

  it('treats a missing MIME as audio', () => {
    expect(
      v4DownloadFallbackSource(
        mediaRow({ episodeMediaType: null, mediaUrl: 'https://cdn.example/episode.mp3' }),
        'mp3'
      )?.mediaType
    ).toBe('audio');
  });

  it('returns null when the row has no media URL', () => {
    expect(v4DownloadFallbackSource(row({ mediaUrl: null }), 'mp3')).toBeNull();
  });
});

describe('v4DownloadCarryoverLogDetails', () => {
  it('adds pending and waiting and records every count as a string', () => {
    const details = v4DownloadCarryoverLogDetails({
      add_by_rss: 5,
      delete_failed: 10,
      deleted: 7,
      directory: 4,
      duplicate: 6,
      missing: 8,
      pending: 2,
      unreachable: 9,
      waiting: 3,
    });

    expect(details).toEqual({
      add_by_rss_episodes: '5',
      already_downloaded: '6',
      deleted_files: '7',
      directory_episodes: '4',
      missing_files: '8',
      undeletable_files: '10',
      unreadable_files: '9',
      waiting_files: '5',
    });
    for (const value of Object.values(details)) {
      expect(typeof value).toBe('string');
    }
  });
});

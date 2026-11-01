import { describe, expect, it } from 'vitest';

import type { DTOItem } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';

import { downloadRowIdentity } from './downloadRowIdentity';
import type { DownloadRecord } from './downloadTypes';

const baseRecord = (overrides: Partial<DownloadRecord> = {}): DownloadRecord => ({
  artworkUrl: null,
  byteSize: null,
  bytesDownloaded: 0,
  channelIdText: 'ch-1',
  channelTitle: 'Show Title',
  createdAt: 1,
  dismissedFromList: false,
  enclosureMime: 'audio/mpeg',
  enclosureUri: 'https://example.com/a.mp3',
  enclosureUrlHash: 'hash',
  errorReason: null,
  fileExtension: 'mp3',
  filePath: null,
  itemIdText: 'item-1',
  mediaType: 'audio',
  status: 'complete',
  title: 'Item Title',
  updatedAt: 1,
  ...overrides,
});

const itemFixture = (overrides: {
  author?: string | null;
  medium_id?: MediumEnum;
  pub_date?: string | null;
  title?: string;
  channelTitle?: string;
}): DTOItem => ({
  channel: {
    channel_about: {
      author: overrides.author ?? null,
      channel_id: 1,
      episode_count: null,
      explicit: null,
      id: 1,
      itunes_type: null,
      language: null,
      last_pub_date: null,
      website_link_url: null,
    },
    feed_id: 1,
    has_podcast_index_value: false,
    has_value_time_splits: false,
    id: 1,
    id_text: 'ch-1',
    medium_id: overrides.medium_id ?? MediumEnum.Podcast,
    podcast_guid: null,
    slug: null,
    sortable_title: null,
    title: overrides.channelTitle ?? 'Show Title',
  },
  channel_id: 1,
  id: 1,
  id_text: 'item-1',
  item_about: { id: 1, item_id: 1 },
  item_chat: { id: 1, item_id: 1, server: '' },
  item_content_links: [],
  item_enclosures: [],
  item_flag_status_id: 1,
  item_fundings: [],
  item_images: [],
  item_license: { id: 1, identifier: '', item_id: 1, url: null },
  item_location: { id: 1, item_id: 1, name: null },
  item_persons: [],
  item_season: { channel_season_id: 1, id: 1, item_id: 1, title: null },
  item_social_interacts: [],
  item_soundbites: [],
  item_transcripts: [],
  item_txts: [],
  item_values: [],
  pub_date: overrides.pub_date === undefined ? '2026-03-04T12:00:00.000Z' : overrides.pub_date,
  title: overrides.title ?? 'Item Title',
});

describe('downloadRowIdentity', () => {
  it('names a podcast with channel, title, and date', () => {
    const identity = downloadRowIdentity(
      baseRecord(),
      itemFixture({ medium_id: MediumEnum.Podcast }),
      'en-US'
    );

    expect(identity.kind).toBe('podcast');
    expect(identity.contextTitle).toBe('Show Title');
    expect(identity.title).toBe('Item Title');
    expect(identity.dateLabel).not.toBeNull();
    expect(identity.secondaryTitle).toBeNull();
    expect(identity.accessibilityParts).toEqual(['Show Title', 'Item Title', identity.dateLabel]);
  });

  it('falls back to channel and title when the stored item is missing', () => {
    const identity = downloadRowIdentity(baseRecord(), null, 'en-US');

    expect(identity).toEqual({
      accessibilityParts: ['Show Title', 'Item Title'],
      contextTitle: 'Show Title',
      dateLabel: null,
      kind: 'podcast',
      secondaryTitle: null,
      title: 'Item Title',
    });
  });

  it('names an album track with album, title, and artist', () => {
    const identity = downloadRowIdentity(
      baseRecord({ channelTitle: 'The Album', title: 'Track One' }),
      itemFixture({
        author: 'The Artist',
        channelTitle: 'The Album',
        medium_id: MediumEnum.Music,
        title: 'Track One',
      }),
      'en-US'
    );

    expect(identity).toEqual({
      accessibilityParts: ['The Album', 'Track One', 'The Artist'],
      contextTitle: 'The Album',
      dateLabel: null,
      kind: 'music',
      secondaryTitle: 'The Artist',
      title: 'Track One',
    });
  });

  it('omits a repeated artist that matches the album title', () => {
    const identity = downloadRowIdentity(
      baseRecord({ channelTitle: 'Same Name', title: 'Track One' }),
      itemFixture({
        author: 'Same Name',
        channelTitle: 'Same Name',
        medium_id: MediumEnum.Music,
        title: 'Track One',
      }),
      'en-US'
    );

    expect(identity.secondaryTitle).toBeNull();
    expect(identity.accessibilityParts).toEqual(['Same Name', 'Track One']);
  });

  it('uses the artist channel as the context line with no album', () => {
    const identity = downloadRowIdentity(
      baseRecord({ channelTitle: 'The Artist', title: 'Track One' }),
      itemFixture({
        channelTitle: 'The Artist',
        medium_id: MediumEnum.PublisherMusic,
        title: 'Track One',
      }),
      'en-US'
    );

    expect(identity).toEqual({
      accessibilityParts: ['The Artist', 'Track One'],
      contextTitle: 'The Artist',
      dateLabel: null,
      kind: 'music',
      secondaryTitle: null,
      title: 'Track One',
    });
  });
});

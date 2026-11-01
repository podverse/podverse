import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DTOItem } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';

import type { SubscribedChannel } from '../../data/repositories';
import {
  addByRssRepository,
  channelItemsRepository,
  subscriptionsRepository,
} from '../../data/repositories';
import {
  fetchHomeFeed,
  HomeFeedStaleReadError,
  isHomeFeedStaleRead,
  mapItemsToHomeFeedRows,
  mapItemToHomeFeedRow,
  normalizeChannelRows,
  normalizeClipRows,
  normalizeItemRows,
  readChannelUpdatedAt,
  readUpdatedAt,
  withChannelTitleFallback,
} from './homeFeedData';

vi.mock('../../data/repositories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/repositories')>();
  return {
    ...actual,
    addByRssRepository: {
      ...actual.addByRssRepository,
      listFeedsByCredentials: vi.fn(),
    },
    channelItemsRepository: {
      ...actual.channelItemsRepository,
      listSubscribed: vi.fn(),
    },
    subscriptionsRepository: {
      ...actual.subscriptionsRepository,
      list: vi.fn(),
    },
  };
});

describe('readUpdatedAt', () => {
  it('keeps a positive epoch and drops zero or non-finite values', () => {
    expect(readUpdatedAt(1_700_000_000)).toBe(1_700_000_000);
    expect(readUpdatedAt(0)).toBeNull();
    expect(readUpdatedAt(Number.NaN)).toBeNull();
  });

  it('keeps a parseable timestamp string and drops empty or junk', () => {
    expect(readUpdatedAt('2026-03-04T12:00:00.000Z')).toBe('2026-03-04T12:00:00.000Z');
    expect(readUpdatedAt('  ')).toBeNull();
    expect(readUpdatedAt('not-a-date')).toBeNull();
  });
});

describe('readChannelUpdatedAt', () => {
  it('prefers channel_about.last_pub_date over a top-level last_pub_date', () => {
    expect(
      readChannelUpdatedAt({
        channel_about: { last_pub_date: '2026-03-04T12:00:00.000Z' },
        last_pub_date: '2020-01-01T00:00:00.000Z',
      })
    ).toBe('2026-03-04T12:00:00.000Z');
  });

  it('falls back to a top-level last_pub_date', () => {
    expect(readChannelUpdatedAt({ last_pub_date: '2026-01-15T00:00:00.000Z' })).toBe(
      '2026-01-15T00:00:00.000Z'
    );
  });
});

describe('normalizeChannelRows', () => {
  it('copies last_pub_date onto the row as updatedAt', () => {
    const rows = normalizeChannelRows([
      {
        channel_about: { last_pub_date: '2026-03-04T12:00:00.000Z' },
        id_text: 'show-1',
        title: 'Example Show',
      },
    ]);

    expect(rows).toEqual([
      {
        id: 'show-1',
        imageUrl: null,
        subtitle: null,
        title: 'Example Show',
        updatedAt: '2026-03-04T12:00:00.000Z',
      },
    ]);
  });

  it('sets subtitle from channel_about.author when includeAuthor is true', () => {
    const rows = normalizeChannelRows(
      [
        {
          channel_about: {
            author: 'Adam Curry & John C. Dvorak',
            last_pub_date: '2026-03-04T12:00:00.000Z',
          },
          id_text: 'show-1',
          title: 'No Agenda Show',
        },
      ],
      { includeAuthor: true }
    );

    expect(rows[0]?.subtitle).toBe('Adam Curry & John C. Dvorak');
  });

  it('ignores channel_about.author when includeAuthor is omitted or false', () => {
    const payload = [
      {
        channel_about: {
          author: 'Adam Curry & John C. Dvorak',
          last_pub_date: '2026-03-04T12:00:00.000Z',
        },
        id_text: 'show-1',
        title: 'No Agenda Show',
      },
    ];

    expect(normalizeChannelRows(payload)[0]?.subtitle).toBeNull();
    expect(normalizeChannelRows(payload, { includeAuthor: false })[0]?.subtitle).toBeNull();
  });

  it('omits the subtitle when includeAuthor is true but author is empty', () => {
    const rows = normalizeChannelRows(
      [
        {
          channel_about: { author: '  ', last_pub_date: '2026-03-04T12:00:00.000Z' },
          id_text: 'show-1',
          title: 'Example Show',
        },
      ],
      { includeAuthor: true }
    );

    expect(rows[0]?.subtitle).toBeNull();
  });
});

describe('normalizeItemRows', () => {
  it('prefers the stored preview over the full notes for the row description', () => {
    const rows = normalizeItemRows(
      [
        {
          channel: { title: 'No Agenda Show' },
          id_text: 'ep-2',
          item_description: {
            is_truncated: true,
            preview: 'Stored preview text',
            value: '<h2>Heading</h2><p>Full notes body</p>',
          },
          title: 'Episode 1825',
        },
      ],
      'episode'
    );

    expect(rows[0]?.description).toBe('Stored preview text');
  });

  it('maps nested episode fields onto subtitle, date, duration, and description', () => {
    const rows = normalizeItemRows(
      [
        {
          channel: { title: 'No Agenda Show' },
          id_text: 'ep-1',
          item_about: { duration: '  3600  ' },
          item_description: { value: '<p>A weekly look at the news.</p>' },
          pub_date: '2026-03-04T12:00:00.000Z',
          title: 'Episode 1824',
        },
      ],
      'episode'
    );

    expect(rows).toEqual([
      {
        description: 'A weekly look at the news.',
        duration: '3600',
        id: 'ep-1',
        imageUrl: null,
        subtitle: 'No Agenda Show',
        title: 'Episode 1824',
        updatedAt: '2026-03-04T12:00:00.000Z',
      },
    ]);
  });

  it('omits missing nested episode fields and still uses a flat podcast_title subtitle', () => {
    const rows = normalizeItemRows(
      [
        {
          id_text: 'ep-2',
          podcast_title: 'Fallback Show',
          title: 'Episode without extras',
        },
      ],
      'episode'
    );

    expect(rows).toEqual([
      {
        id: 'ep-2',
        imageUrl: null,
        subtitle: 'Fallback Show',
        title: 'Episode without extras',
      },
    ]);
    expect(rows[0]).not.toHaveProperty('updatedAt');
    expect(rows[0]).not.toHaveProperty('duration');
    expect(rows[0]).not.toHaveProperty('description');
  });

  it('does not set updatedAt from junk or empty pub_date', () => {
    const rows = normalizeItemRows(
      [
        {
          id_text: 'ep-3',
          pub_date: 'not-a-date',
          title: 'Bad date',
        },
        {
          id_text: 'ep-4',
          pub_date: '   ',
          title: 'Empty date',
        },
      ],
      'episode'
    );

    expect(rows[0]).not.toHaveProperty('updatedAt');
    expect(rows[1]).not.toHaveProperty('updatedAt');
  });

  it('leaves track rows thin even when the payload has date, duration, and description', () => {
    const rows = normalizeItemRows(
      [
        {
          channel: {
            id_text: 'album-1',
            medium_id: MediumEnum.Music,
            title: 'Example Album',
          },
          id_text: 'tr-1',
          item_about: { duration: '215' },
          item_description: { value: '<p>A liner note.</p>' },
          podcast_title: 'Flat Album',
          pub_date: '2026-03-04T12:00:00.000Z',
          title: 'Track One',
        },
      ],
      'track'
    );

    expect(rows).toEqual([
      {
        channelId: 'album-1',
        channelKind: 'albums',
        id: 'tr-1',
        imageUrl: null,
        subtitle: 'Example Album',
        title: 'Track One',
      },
    ]);
    expect(rows[0]).not.toHaveProperty('updatedAt');
    expect(rows[0]).not.toHaveProperty('duration');
    expect(rows[0]).not.toHaveProperty('description');
  });
});

type ItemFixture = {
  channel?: { id_text?: string; medium_id?: MediumEnum; title: string };
  description?: string;
  duration?: string;
  id_text: string;
  pub_date?: string;
  title: string;
};

const itemFixture = (fixture: ItemFixture): DTOItem => ({
  channel:
    fixture.channel === undefined
      ? undefined
      : {
          feed_id: 1,
          has_podcast_index_value: false,
          has_value_time_splits: false,
          id: 1,
          id_text: fixture.channel.id_text ?? '',
          medium_id: fixture.channel.medium_id ?? MediumEnum.Podcast,
          podcast_guid: null,
          slug: null,
          sortable_title: null,
          title: fixture.channel.title,
        },
  channel_id: 1,
  id: 1,
  id_text: fixture.id_text,
  item_about: { duration: fixture.duration, id: 1, item_id: 1 },
  item_chat: { id: 1, item_id: 1, server: '' },
  item_content_links: [],
  item_description:
    fixture.description === undefined
      ? undefined
      : { id: 1, item_id: 1, value: fixture.description },
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
  pub_date: fixture.pub_date,
  title: fixture.title,
});

describe('withChannelTitleFallback', () => {
  it('keeps an existing subtitle and fills a blank one from the follow title', () => {
    expect(
      withChannelTitleFallback(
        {
          id: 'ep-1',
          imageUrl: null,
          subtitle: 'Payload Show',
          title: 'Episode',
        },
        'Follow Show'
      ).subtitle
    ).toBe('Payload Show');

    expect(
      withChannelTitleFallback(
        {
          id: 'ep-2',
          imageUrl: null,
          subtitle: null,
          title: 'Episode',
        },
        'Follow Show'
      ).subtitle
    ).toBe('Follow Show');
  });
});

describe('mapItemToHomeFeedRow', () => {
  const richTrack = itemFixture({
    channel: {
      id_text: 'album-9',
      medium_id: MediumEnum.Music,
      title: 'Nested Album',
    },
    description: '<p>A liner note.</p>',
    duration: '215',
    id_text: 'tr-9',
    pub_date: '2026-03-04T12:00:00.000Z',
    title: 'Track Nine',
  });

  it('reads the stored preview on a typed item', () => {
    const item = itemFixture({
      channel: { title: 'No Agenda Show' },
      id_text: 'ep-10',
      title: 'Episode 1826',
    });
    const row = mapItemToHomeFeedRow({
      ...item,
      item_description: {
        id: 1,
        is_truncated: true,
        item_id: 1,
        preview: 'Stored preview text',
        value: '<h2>Heading</h2><p>Full notes body</p>',
      },
    });

    expect(row.description).toBe('Stored preview text');
  });

  it('keeps episode rows rich', () => {
    const row = mapItemToHomeFeedRow(
      itemFixture({
        channel: { title: 'No Agenda Show' },
        description: '<p>A weekly look at the news.</p>',
        duration: '3600',
        id_text: 'ep-9',
        pub_date: '2026-03-04T12:00:00.000Z',
        title: 'Episode 1824',
      })
    );

    expect(row).toEqual({
      description: 'A weekly look at the news.',
      duration: '3600',
      id: 'ep-9',
      imageUrl: null,
      subtitle: 'No Agenda Show',
      title: 'Episode 1824',
      updatedAt: '2026-03-04T12:00:00.000Z',
    });
  });

  it('omits date, duration, and description on compact track rows and keeps channel go-to', () => {
    const row = mapItemToHomeFeedRow(richTrack, { compact: true });

    expect(row).toEqual({
      channelId: 'album-9',
      channelKind: 'albums',
      id: 'tr-9',
      imageUrl: null,
      subtitle: 'Nested Album',
      title: 'Track Nine',
    });
    expect(row).not.toHaveProperty('updatedAt');
    expect(row).not.toHaveProperty('duration');
    expect(row).not.toHaveProperty('description');
  });

  it('maps a compact artist track to go-to artist', () => {
    const row = mapItemToHomeFeedRow(
      itemFixture({
        channel: {
          id_text: 'artist-1',
          medium_id: MediumEnum.PublisherMusic,
          title: 'Example Artist',
        },
        id_text: 'tr-10',
        title: 'Track Ten',
      }),
      { compact: true }
    );

    expect(row.channelId).toBe('artist-1');
    expect(row.channelKind).toBe('artists');
    expect(row.subtitle).toBe('Example Artist');
  });

  it('maps a list of items compactly when asked', () => {
    const rows = mapItemsToHomeFeedRows([richTrack], { compact: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('updatedAt');
    expect(rows[0]?.channelId).toBe('album-9');
  });
});

describe('normalizeClipRows', () => {
  it('reads nested podcast and episode titles from a public clip payload', () => {
    const rows = normalizeClipRows([
      {
        end_time: '90',
        id_text: 'clip-public-1',
        item: {
          channel: {
            channel_images: [{ url: 'https://example.com/show.jpg' }],
            medium_id: 2,
            title: 'Nested Show',
          },
          id_text: 'item-public-1',
          item_images: [{ is_resized: true, url: 'https://example.com/episode.jpg' }],
          pub_date: '2026-04-01T00:00:00.000Z',
          title: 'Nested Episode',
        },
        start_time: '30',
        title: 'Nested Clip',
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Nested Clip');
    expect(rows[0]?.subtitle).toBe('Nested Show • Nested Episode');
    expect(rows[0]?.imageUrl).toBe('https://example.com/episode.jpg');
    expect(rows[0]?.updatedAt).toBe('2026-04-01T00:00:00.000Z');
    expect(rows[0]?.clipStartTime).toBe('30');
    expect(rows[0]?.clipEndTime).toBe('90');
    expect(rows[0]?.duration).toBeNull();
  });

  it('skips payloads that are not clips', () => {
    expect(normalizeClipRows([null, { title: 'No id' }, 'clip'])).toEqual([]);
  });
});

describe('fetchHomeFeed isCurrent', () => {
  const followedPodcast = (): SubscribedChannel => ({
    idText: 'show-1',
    imageUrl: null,
    kind: 'podcasts',
    latestItemPubDateMs: null,
    medium: 'podcasts',
    popularityRank: null,
    source: 'directory',
    title: 'Example Show',
  });

  const storedEpisode = itemFixture({
    channel: { title: 'No Agenda Show' },
    description: '<p>A weekly look at the news.</p>',
    duration: '3600',
    id_text: 'ep-stale-1',
    pub_date: '2026-03-04T12:00:00.000Z',
    title: 'Episode 1824',
  });

  beforeEach(() => {
    vi.mocked(subscriptionsRepository.list).mockReset();
    vi.mocked(channelItemsRepository.listSubscribed).mockReset();
    vi.mocked(addByRssRepository.listFeedsByCredentials).mockReset();
    vi.mocked(subscriptionsRepository.list).mockResolvedValue([followedPodcast()]);
    vi.mocked(channelItemsRepository.listSubscribed).mockResolvedValue([
      { channelIdText: 'show-1', item: storedEpisode },
    ]);
    vi.mocked(addByRssRepository.listFeedsByCredentials).mockResolvedValue({
      needsCredentials: [],
      ready: [],
    });
  });

  it('abandons a superseded read before mapping rows', async () => {
    const error = await fetchHomeFeed('episodes', { isCurrent: () => false }).then(
      () => {
        throw new Error('expected fetchHomeFeed to reject');
      },
      (reason: unknown) => reason
    );

    expect(isHomeFeedStaleRead(error)).toBe(true);
    expect(error).toBeInstanceOf(HomeFeedStaleReadError);
    expect(channelItemsRepository.listSubscribed).not.toHaveBeenCalled();
  });

  it('matches a read that omits isCurrent when isCurrent stays true', async () => {
    const withoutOption = await fetchHomeFeed('episodes');
    const withCurrent = await fetchHomeFeed('episodes', { isCurrent: () => true });

    expect(withCurrent).toEqual(withoutOption);
    expect(withCurrent.rows).toEqual(mapItemsToHomeFeedRows([storedEpisode]));
  });

  it('fills the overline from the follow title when the stored item omits channel.title', async () => {
    const withoutChannel = itemFixture({
      id_text: 'ep-no-channel',
      pub_date: '2026-03-04T12:00:00.000Z',
      title: 'Episode Without Nested Channel',
    });
    vi.mocked(channelItemsRepository.listSubscribed).mockResolvedValue([
      { channelIdText: 'show-1', item: withoutChannel },
    ]);

    const read = await fetchHomeFeed('episodes');

    expect(read.rows).toEqual([
      expect.objectContaining({
        id: 'ep-no-channel',
        subtitle: 'Example Show',
        title: 'Episode Without Nested Channel',
      }),
    ]);
  });

  it('requests every ready follow for channel chips and directory follows for item channel ids', async () => {
    await fetchHomeFeed('podcasts');
    expect(subscriptionsRepository.list).toHaveBeenCalledWith({
      credentials: 'ready',
      filter: 'all',
      kind: 'podcasts',
      sort: 'alphabetical',
    });

    vi.mocked(subscriptionsRepository.list).mockClear();
    await fetchHomeFeed('episodes');
    expect(subscriptionsRepository.list).toHaveBeenCalledWith({
      filter: 'directory',
      kind: 'podcasts',
      sort: 'alphabetical',
    });

    vi.mocked(subscriptionsRepository.list).mockClear();
    await fetchHomeFeed('tracks');
    expect(subscriptionsRepository.list).toHaveBeenCalledWith({
      filter: 'directory',
      sort: 'alphabetical',
    });
  });
});

describe('isHomeFeedStaleRead', () => {
  it('returns false for a plain Error and for undefined', () => {
    expect(isHomeFeedStaleRead(new Error('disk failed'))).toBe(false);
    expect(isHomeFeedStaleRead(undefined)).toBe(false);
  });
});

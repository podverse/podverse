import { describe, expect, it } from 'vitest';

import type { DTOItem } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';

import {
  mapItemToHomeFeedRow,
  mapItemsToHomeFeedRows,
  normalizeChannelRows,
  normalizeClipRows,
  normalizeItemRows,
  readChannelUpdatedAt,
  readUpdatedAt,
} from './homeFeedData';

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

describe('mapItemToHomeFeedRow', () => {
  const richTrack = {
    channel: {
      id_text: 'album-9',
      medium_id: MediumEnum.Music,
      title: 'Nested Album',
    },
    id_text: 'tr-9',
    item_about: { duration: '215' },
    item_description: { value: '<p>A liner note.</p>' },
    item_images: [],
    pub_date: '2026-03-04T12:00:00.000Z',
    title: 'Track Nine',
  } as DTOItem;

  it('keeps episode rows rich', () => {
    const row = mapItemToHomeFeedRow({
      channel: { title: 'No Agenda Show' },
      id_text: 'ep-9',
      item_about: { duration: '3600' },
      item_description: { value: '<p>A weekly look at the news.</p>' },
      item_images: [],
      pub_date: '2026-03-04T12:00:00.000Z',
      title: 'Episode 1824',
    } as DTOItem);

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
      {
        channel: {
          id_text: 'artist-1',
          medium_id: MediumEnum.PublisherMusic,
          title: 'Example Artist',
        },
        id_text: 'tr-10',
        item_images: [],
        title: 'Track Ten',
      } as DTOItem,
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

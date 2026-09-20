import { describe, expect, it } from 'vitest';

import type { Episode, FeedObject } from '../../types/partytime.js';
import { compatChannelAboutDto } from './channel.js';

const invalidDate = new Date('not-a-date');

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    guid: 'ep-1',
    enclosure: {
      url: 'https://example.com/a.mp3',
      type: 'audio/mpeg',
      length: 1,
    },
    duration: 1,
    explicit: false,
    ...overrides,
  };
}

function feed(overrides: Partial<FeedObject> = {}): FeedObject {
  return {
    title: 'Artist',
    explicit: false,
    link: 'https://example.com',
    items: [],
    ...overrides,
  };
}

describe('compatChannelAboutDto last_pub_date', () => {
  it('uses the newest item pubDate even when feed-level dates are later', () => {
    const olderItem = new Date('2024-01-01T00:00:00.000Z');
    const newerItem = new Date('2024-06-01T00:00:00.000Z');
    const laterFeedDate = new Date('2025-01-01T00:00:00.000Z');

    const about = compatChannelAboutDto(
      feed({
        lastPubDate: laterFeedDate,
        pubDate: laterFeedDate,
        lastBuildDate: laterFeedDate,
        items: [
          episode({ guid: 'old', pubDate: olderItem }),
          episode({ guid: 'new', pubDate: newerItem }),
        ],
      })
    );

    expect(about.last_pub_date).toEqual(newerItem);
  });

  it.each([
    {
      name: 'empty items fall back to lastPubDate',
      parsedFeed: feed({
        lastPubDate: new Date('2024-03-01T00:00:00.000Z'),
        pubDate: new Date('2024-02-01T00:00:00.000Z'),
        lastBuildDate: new Date('2024-01-01T00:00:00.000Z'),
      }),
      expected: new Date('2024-03-01T00:00:00.000Z'),
    },
    {
      name: 'undated items fall back to lastPubDate',
      parsedFeed: feed({
        lastPubDate: new Date('2024-03-01T00:00:00.000Z'),
        pubDate: new Date('2024-02-01T00:00:00.000Z'),
        lastBuildDate: new Date('2024-01-01T00:00:00.000Z'),
        items: [episode()],
      }),
      expected: new Date('2024-03-01T00:00:00.000Z'),
    },
    {
      name: 'empty items fall back to pubDate when lastPubDate is missing',
      parsedFeed: feed({
        pubDate: new Date('2024-02-01T00:00:00.000Z'),
        lastBuildDate: new Date('2024-01-01T00:00:00.000Z'),
      }),
      expected: new Date('2024-02-01T00:00:00.000Z'),
    },
    {
      name: 'empty items fall back to lastBuildDate when earlier feed dates are missing',
      parsedFeed: feed({
        lastBuildDate: new Date('2024-01-01T00:00:00.000Z'),
      }),
      expected: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      name: 'skips an invalid lastPubDate and uses pubDate',
      parsedFeed: feed({
        lastPubDate: invalidDate,
        pubDate: new Date('2024-02-01T00:00:00.000Z'),
        lastBuildDate: new Date('2024-01-01T00:00:00.000Z'),
      }),
      expected: new Date('2024-02-01T00:00:00.000Z'),
    },
    {
      name: 'all missing stays null',
      parsedFeed: feed(),
      expected: null,
    },
  ])('$name', ({ parsedFeed, expected }) => {
    expect(compatChannelAboutDto(parsedFeed).last_pub_date).toEqual(expected);
  });
});

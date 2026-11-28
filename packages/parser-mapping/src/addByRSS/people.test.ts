import { describe, expect, it } from 'vitest';

import { convertParsedRSSFeedToCompat } from '../compat/partytime/compatFull.js';
import type { FeedObject } from '../types/partytime.js';
import { Phase4LiveStatus } from '../types/partytime.js';
import { localPeopleSectionsFromMappedFeed } from './people.js';

const feed = (overrides: Partial<FeedObject> = {}): FeedObject => ({
  explicit: false,
  items: [],
  link: 'https://example.com',
  title: 'Show',
  ...overrides,
});

describe('localPeopleSectionsFromMappedFeed', () => {
  it('counts a livestream guest and a channel host', () => {
    const mapped = convertParsedRSSFeedToCompat(
      feed({
        podcastLiveItems: [
          {
            contentLinks: [],
            enclosure: { length: 1, type: 'audio/mpeg', url: 'https://example.com/live.mp3' },
            guid: 'live-1',
            podcastPeople: [{ name: 'Live Guest' }],
            start: new Date('2026-02-01T00:00:00.000Z'),
            status: Phase4LiveStatus.Live,
          },
        ],
        podcastPeople: [{ name: 'Ada Host', role: 'host' }],
      })
    );

    const sections = localPeopleSectionsFromMappedFeed(mapped);

    expect(sections.cast.map((person) => person.name)).toEqual(['Ada Host']);
    expect(sections.appearances).toEqual([{ img: null, itemCount: 1, name: 'Live Guest' }]);
  });

  it('is empty when the feed is missing', () => {
    expect(localPeopleSectionsFromMappedFeed(null)).toEqual({
      appearances: [],
      cast: [],
      hasPeople: false,
    });
    expect(localPeopleSectionsFromMappedFeed(undefined).hasPeople).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import type { AddByRSSFeedRecord, AddByRSSMappedFeed } from '../addByRSS/types.js';
import { addByRSSChannelHeaderTriple } from './addByRSSChannelHeaderCandidates.js';
import { addByRSSFeedListArtworkCandidates } from './addByRSSFeedListArtworkCandidates.js';
import { listItemImageCandidates } from './listItemImageCandidates.js';

function baseFeed(overrides: Partial<AddByRSSFeedRecord>): AddByRSSFeedRecord {
  return {
    id: 1,
    idText: 'feed-1',
    resourceType: 'podcasts',
    feedUrl: 'https://example.com/feed.xml',
    title: null,
    imageUrl: null,
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('listItemImageCandidates', () => {
  it('defaults to empty and passes through defined chains', () => {
    expect(listItemImageCandidates({})).toEqual([]);
    expect(listItemImageCandidates({ imageCandidates: ['https://x.test/a.jpg'] })).toEqual([
      'https://x.test/a.jpg',
    ]);
  });
});

describe('addByRSSChannelHeaderTriple', () => {
  it('returns three breakpoint chains and primaryUrl from desktop pick', () => {
    const feedUrl = 'https://feed.example.com/image.jpg';
    const channelUrl = 'https://cdn.example.com/ch-w256.webp';
    const channelImages = [{ url: channelUrl, image_width_size: 256 }];
    const got = addByRSSChannelHeaderTriple(channelImages, feedUrl);
    expect(got.candidatesMobile.length).toBeGreaterThan(0);
    expect(got.candidatesTablet.length).toBeGreaterThan(0);
    expect(got.candidatesDesktop.length).toBeGreaterThan(0);
    expect(got.primaryUrl).toBe(got.candidatesDesktop[0]);
    expect(got.candidatesDesktop[0]).toBe(feedUrl);
  });
});

describe('addByRSSFeedListArtworkCandidates', () => {
  it('places feed imageUrl before channel chain (web IMAGES.LIST.PODCASTS wrapper)', () => {
    const feedOverride = 'https://feed.example.com/cover.jpg';
    const channel = 'https://cdn.example.com/w168.webp';
    const feed = baseFeed({
      imageUrl: feedOverride,
      mappedFeed: {
        channel: {
          images: [{ url: channel, image_width_size: 168 }],
        },
      } as AddByRSSMappedFeed,
    });
    const got = addByRSSFeedListArtworkCandidates(feed);
    expect(got[0]).toBe(feedOverride);
    expect(got).toContain(channel);
  });
});

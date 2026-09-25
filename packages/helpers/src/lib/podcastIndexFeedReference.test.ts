import { describe, expect, it } from 'vitest';

import {
  podcastIndexFeedListImageUrl,
  unparsedPodcastIndexFeedTarget,
} from './podcastIndexFeedReference.js';

describe('podcastIndexFeedListImageUrl', () => {
  it('returns null for missing feed', () => {
    expect(podcastIndexFeedListImageUrl(undefined)).toBeNull();
    expect(podcastIndexFeedListImageUrl(null)).toBeNull();
    expect(podcastIndexFeedListImageUrl({})).toBeNull();
  });

  it('prefers image over artwork', () => {
    expect(
      podcastIndexFeedListImageUrl({
        artwork: 'https://example.com/artwork.jpg',
        image: 'https://example.com/image.jpg',
      })
    ).toBe('https://example.com/image.jpg');
  });

  it('falls back to artwork when image is empty', () => {
    expect(
      podcastIndexFeedListImageUrl({
        artwork: 'https://example.com/artwork.jpg',
        image: '   ',
      })
    ).toBe('https://example.com/artwork.jpg');
  });

  it('returns null when both image and artwork are blank', () => {
    expect(podcastIndexFeedListImageUrl({ artwork: '', image: null })).toBeNull();
  });
});

describe('unparsedPodcastIndexFeedTarget', () => {
  it('returns null when id is missing or not positive', () => {
    expect(unparsedPodcastIndexFeedTarget(undefined)).toBeNull();
    expect(unparsedPodcastIndexFeedTarget({})).toBeNull();
    expect(unparsedPodcastIndexFeedTarget({ id: 0 })).toBeNull();
    expect(unparsedPodcastIndexFeedTarget({ id: -1 })).toBeNull();
    expect(unparsedPodcastIndexFeedTarget({ id: Number.NaN })).toBeNull();
  });

  it('returns a target for a positive id', () => {
    expect(
      unparsedPodcastIndexFeedTarget({
        author: 'Right Said Fred',
        description: 'An album',
        id: 42,
        image: 'https://example.com/image.jpg',
        title: "I'm A Celebrity",
        url: 'https://example.com/feed.xml',
      })
    ).toEqual({
      author: 'Right Said Fred',
      description: 'An album',
      feedUrl: 'https://example.com/feed.xml',
      imageUrl: 'https://example.com/image.jpg',
      podcastIndexId: '42',
      title: "I'm A Celebrity",
    });
  });

  it('uses artwork when image is empty and leaves blank strings for missing fields', () => {
    expect(
      unparsedPodcastIndexFeedTarget({
        artwork: 'https://example.com/artwork.jpg',
        id: 7,
        image: '',
      })
    ).toEqual({
      author: '',
      description: '',
      feedUrl: '',
      imageUrl: 'https://example.com/artwork.jpg',
      podcastIndexId: '7',
      title: '',
    });
  });
});

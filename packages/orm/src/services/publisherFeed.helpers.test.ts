import { describe, expect, it } from 'vitest';

import {
  feedUrlsForPublisherAlbumUrlLookup,
  isPublisherAlbumRemoteRef,
} from './publisherFeed.helpers.js';

describe('isPublisherAlbumRemoteRef', () => {
  it('is true for a feed_guid without item_guid', () => {
    expect(
      isPublisherAlbumRemoteRef({
        feed_guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        feed_url: null,
        item_guid: null,
      })
    ).toBe(true);
  });

  it('is true for a feed_url without item_guid even when feed_guid is empty', () => {
    expect(
      isPublisherAlbumRemoteRef({
        feed_guid: '',
        feed_url: 'https://example.com/album.xml',
        item_guid: null,
      })
    ).toBe(true);
  });

  it('is false when item_guid is set (track ref)', () => {
    expect(
      isPublisherAlbumRemoteRef({
        feed_guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        feed_url: 'https://example.com/album.xml',
        item_guid: 'track-1',
      })
    ).toBe(false);
  });

  it('is false when both guid and url are blank', () => {
    expect(
      isPublisherAlbumRemoteRef({
        feed_guid: '  ',
        feed_url: null,
        item_guid: null,
      })
    ).toBe(false);
  });
});

describe('feedUrlsForPublisherAlbumUrlLookup', () => {
  it('returns unique trimmed urls from unmatched album refs', () => {
    expect(
      feedUrlsForPublisherAlbumUrlLookup([
        {
          feed_guid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          feed_url: ' https://example.com/a.xml ',
          item_guid: null,
        },
        {
          feed_guid: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
          feed_url: 'https://example.com/a.xml',
          item_guid: null,
        },
        {
          feed_guid: 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee',
          feed_url: null,
          item_guid: null,
        },
        {
          feed_guid: 'dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee',
          feed_url: 'https://example.com/b.xml',
          item_guid: 'track',
        },
        {
          feed_guid: 'eeeeeeee-bbbb-cccc-dddd-eeeeeeeeeeee',
          feed_url: 'https://example.com/c.xml',
          item_guid: null,
        },
      ])
    ).toEqual(['https://example.com/a.xml', 'https://example.com/c.xml']);
  });
});

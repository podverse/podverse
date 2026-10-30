import { describe, expect, it } from 'vitest';

import { convertParsedRSSFeedToCompat } from '../compat/partytime/compatFull.js';
import type { FeedObject } from '../types/partytime.js';
import {
  getAddByRSSRemoteItemRefs,
  toAddByRSSRemoteItemLookupRef,
  toAddByRSSRemoteItemResolveRef,
} from './remoteItemRefs.js';
import type { AddByRSSMappedFeed } from './types.js';

type CompatRemoteRef = AddByRSSMappedFeed['channel']['remoteItems'][number];

function feed(overrides: Partial<FeedObject> = {}): FeedObject {
  return {
    title: 'Show',
    explicit: false,
    link: 'https://show.example',
    items: [],
    ...overrides,
  };
}

function compatRef(overrides: Partial<CompatRemoteRef> = {}): CompatRemoteRef {
  return {
    feed_guid: 'remote-guid',
    feed_url: 'https://remote.example/feed.xml',
    item_guid: null,
    title: null,
    medium_id: null,
    ...overrides,
  };
}

function mappedFeedWithRefs(input: {
  podroll?: CompatRemoteRef[];
  remoteItems?: CompatRemoteRef[];
}): AddByRSSMappedFeed {
  const mapped = convertParsedRSSFeedToCompat(feed());
  mapped.channel.podrollRemoteItems = input.podroll ?? [];
  mapped.channel.remoteItems = input.remoteItems ?? [];
  return mapped;
}

describe('getAddByRSSRemoteItemRefs', () => {
  const own = { feedGuid: 'own-guid', feedUrl: 'https://own.example/feed.xml' };

  it('keeps feed order and reads only the selected list', () => {
    const mapped = mappedFeedWithRefs({
      podroll: [compatRef({ feed_guid: 'pod-a' }), compatRef({ feed_guid: 'pod-b' })],
      remoteItems: [compatRef({ feed_guid: 'remote-a' })],
    });

    expect(getAddByRSSRemoteItemRefs(mapped, own, 'podroll').map((ref) => ref.feedGuid)).toEqual([
      'pod-a',
      'pod-b',
    ]);
    expect(
      getAddByRSSRemoteItemRefs(mapped, own, 'remote_items').map((ref) => ref.feedGuid)
    ).toEqual(['remote-a']);
  });

  it('keeps both channel and item references on the same feed', () => {
    const mapped = mappedFeedWithRefs({
      podroll: [
        compatRef({ feed_guid: 'same-feed', item_guid: null }),
        compatRef({ feed_guid: 'same-feed', item_guid: 'item-guid-1' }),
      ],
    });

    expect(getAddByRSSRemoteItemRefs(mapped, own, 'podroll')).toEqual([
      {
        feedGuid: 'same-feed',
        feedUrl: 'https://remote.example/feed.xml',
        itemGuid: null,
        title: null,
      },
      {
        feedGuid: 'same-feed',
        feedUrl: 'https://remote.example/feed.xml',
        itemGuid: 'item-guid-1',
        title: null,
      },
    ]);
  });

  it('dedupes GUID references case-insensitively', () => {
    const mapped = mappedFeedWithRefs({
      remoteItems: [compatRef({ feed_guid: 'DUP-GUID' }), compatRef({ feed_guid: 'dup-guid' })],
    });

    expect(getAddByRSSRemoteItemRefs(mapped, own, 'remote_items')).toHaveLength(1);
    expect(getAddByRSSRemoteItemRefs(mapped, own, 'remote_items')[0]?.feedGuid).toBe('dup-guid');
  });

  it('dedupes URL-only references and strips userinfo', () => {
    const mapped = mappedFeedWithRefs({
      remoteItems: [
        compatRef({ feed_guid: '', feed_url: 'https://user:pw@remote.example/feed.xml' }),
        compatRef({ feed_guid: '', feed_url: 'https://remote.example/feed.xml' }),
      ],
    });

    expect(getAddByRSSRemoteItemRefs(mapped, own, 'remote_items')).toEqual([
      {
        feedGuid: null,
        feedUrl: 'https://remote.example/feed.xml',
        itemGuid: null,
        title: null,
      },
    ]);
  });

  it('skips refs with neither key and refs to the feed itself', () => {
    const mapped = mappedFeedWithRefs({
      remoteItems: [
        compatRef({ feed_guid: '', feed_url: '' }),
        compatRef({ feed_guid: own.feedGuid, feed_url: 'https://elsewhere.example/feed.xml' }),
        compatRef({
          feed_guid: 'other-guid',
          feed_url: 'https://user:pw@own.example/feed.xml',
        }),
        compatRef({ feed_guid: 'kept-guid', feed_url: 'https://kept.example/feed.xml' }),
      ],
    });

    expect(getAddByRSSRemoteItemRefs(mapped, own, 'remote_items')).toEqual([
      {
        feedGuid: 'kept-guid',
        feedUrl: 'https://kept.example/feed.xml',
        itemGuid: null,
        title: null,
      },
    ]);
  });

  it('normalizes blank title to null and returns [] for a null bundle', () => {
    const mapped = mappedFeedWithRefs({
      podroll: [compatRef({ title: '   ' })],
    });

    expect(getAddByRSSRemoteItemRefs(mapped, own, 'podroll')[0]?.title).toBeNull();
    expect(getAddByRSSRemoteItemRefs(null, own, 'podroll')).toEqual([]);
  });
});

describe('remote item ref request mappers', () => {
  const ref = {
    feedGuid: 'feed-guid',
    feedUrl: 'https://feeds.example.com/feed.xml',
    itemGuid: 'item-guid',
    title: 'Any',
  };

  it('maps resolve refs to feed_guid/feed_url only', () => {
    const resolveRef = toAddByRSSRemoteItemResolveRef(ref);
    expect(resolveRef).toEqual({
      feed_guid: 'feed-guid',
      feed_url: 'https://feeds.example.com/feed.xml',
    });
    expect(Object.keys(resolveRef).sort()).toEqual(['feed_guid', 'feed_url']);
  });

  it('maps lookup refs to feed_guid/feed_url/item_guid only', () => {
    const lookupRef = toAddByRSSRemoteItemLookupRef(ref);
    expect(lookupRef).toEqual({
      feed_guid: 'feed-guid',
      feed_url: 'https://feeds.example.com/feed.xml',
      item_guid: 'item-guid',
    });
    expect(Object.keys(lookupRef).sort()).toEqual(['feed_guid', 'feed_url', 'item_guid']);
  });
});

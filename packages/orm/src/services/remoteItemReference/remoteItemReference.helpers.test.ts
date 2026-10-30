import { describe, expect, it } from 'vitest';

import type { RemoteItemGeneric } from '@podverse/helpers';

import {
  feedUrlsForUnmatchedRefs,
  parsedChannelIdForRef,
  parsedItemKey,
  partitionRemoteItemRefs,
  remoteRefFeedUrlKey,
  remoteRefGuidKey,
  remoteRefItemGuidKey,
} from './remoteItemReference.helpers.js';

function ref(
  feedGuid: string | null,
  feedUrl: string | null,
  itemGuid: string | null
): RemoteItemGeneric {
  return {
    feed_guid: feedGuid,
    feed_url: feedUrl,
    item_guid: itemGuid,
  };
}

describe('remote reference key helpers', () => {
  it('normalizes guid and trims feed and item keys', () => {
    const value = ref(' ABC-123 ', ' https://example.com/feed.xml ', ' ITEM-1 ');

    expect(remoteRefGuidKey(value)).toBe('abc-123');
    expect(remoteRefFeedUrlKey(value)).toBe('https://example.com/feed.xml');
    expect(remoteRefItemGuidKey(value)).toBe('ITEM-1');
  });

  it('returns empty strings for missing values', () => {
    const value = ref(null, null, null);

    expect(remoteRefGuidKey(value)).toBe('');
    expect(remoteRefFeedUrlKey(value)).toBe('');
    expect(remoteRefItemGuidKey(value)).toBe('');
  });
});

describe('parsedChannelIdForRef', () => {
  it('prefers a GUID match even when URL maps to another channel', () => {
    const result = parsedChannelIdForRef(ref(' GUID-1 ', 'https://example.com/a.xml', null), {
      parsedChannelIdByGuid: new Map([['guid-1', 11]]),
      parsedChannelIdByFeedUrl: new Map([['https://example.com/a.xml', 99]]),
    });

    expect(result).toBe(11);
  });

  it('uses URL match when GUID misses or is blank', () => {
    const byMissingGuid = parsedChannelIdForRef(
      ref(' unknown-guid ', ' https://example.com/b.xml ', null),
      {
        parsedChannelIdByGuid: new Map([['other-guid', 1]]),
        parsedChannelIdByFeedUrl: new Map([['https://example.com/b.xml', 22]]),
      }
    );
    const byBlankGuid = parsedChannelIdForRef(ref(null, 'https://example.com/c.xml', null), {
      parsedChannelIdByGuid: new Map(),
      parsedChannelIdByFeedUrl: new Map([['https://example.com/c.xml', 23]]),
    });

    expect(byMissingGuid).toBe(22);
    expect(byBlankGuid).toBe(23);
  });
});

describe('feedUrlsForUnmatchedRefs', () => {
  it('skips GUID-matched refs and dedupes unmatched URLs in ref order', () => {
    const refs = [
      ref('guid-1', 'https://example.com/matched.xml', null),
      ref('guid-2', ' https://example.com/a.xml ', null),
      ref('guid-3', 'https://example.com/a.xml', null),
      ref('', 'https://example.com/b.xml', null),
      ref(null, null, null),
    ];

    const result = feedUrlsForUnmatchedRefs(refs, new Map([['guid-1', 1]]));

    expect(result).toEqual(['https://example.com/a.xml', 'https://example.com/b.xml']);
  });
});

describe('partitionRemoteItemRefs', () => {
  it('keeps channel refs in feed order and dedupes added and unmatched channels', () => {
    const refs = [
      ref('GUID-A', null, null),
      ref('guid-b', null, null),
      ref(' guid-a ', 'https://example.com/ignored.xml', null),
      ref('unknown', 'https://example.com/unknown-1.xml', null),
      ref(' UNKNOWN ', 'https://example.com/unknown-2.xml', null),
      ref(null, 'https://example.com/url-only.xml', null),
      ref('', 'https://example.com/url-only.xml', null),
      ref(null, null, null),
    ];

    const result = partitionRemoteItemRefs({
      refs,
      matches: {
        parsedChannelIdByGuid: new Map([
          ['guid-a', 10],
          ['guid-b', 20],
        ]),
        parsedChannelIdByFeedUrl: new Map(),
      },
      parsedItemIdByKey: new Map(),
    });

    expect(result.addedChannelIds).toEqual([10, 20]);
    expect(result.unmatchedChannelRefs).toEqual([
      ref('unknown', 'https://example.com/unknown-1.xml', null),
      ref(null, 'https://example.com/url-only.xml', null),
    ]);
    expect(result.addedItemIds).toEqual([]);
    expect(result.unmatchedItemRefs).toEqual([]);
  });

  it('splits item refs by parsed item lookup and drops missing parsed-channel items', () => {
    const parsedChannelMissingItem = ref('guid-a', null, 'item-missing');
    const refs = [
      ref('guid-a', null, 'Item-1'),
      ref('guid-a', null, ' Item-1 '),
      parsedChannelMissingItem,
      ref('guid-b', null, 'item-2'),
      ref('guid-b', null, 'item-2'),
      ref(null, 'https://example.com/url-channel.xml', 'url-item-1'),
      ref('', 'https://example.com/url-channel.xml', 'url-item-1'),
      ref(null, null, 'orphan'),
    ];

    const result = partitionRemoteItemRefs({
      refs,
      matches: {
        parsedChannelIdByGuid: new Map([['guid-a', 1]]),
        parsedChannelIdByFeedUrl: new Map(),
      },
      parsedItemIdByKey: new Map([[parsedItemKey(1, 'Item-1'), 1001]]),
    });

    expect(result.addedChannelIds).toEqual([]);
    expect(result.unmatchedChannelRefs).toEqual([]);
    expect(result.addedItemIds).toEqual([1001]);
    expect(result.unmatchedItemRefs).toEqual([
      ref('guid-b', null, 'item-2'),
      ref(null, 'https://example.com/url-channel.xml', 'url-item-1'),
    ]);
    expect(result.unmatchedItemRefs).not.toContain(parsedChannelMissingItem);
  });
});

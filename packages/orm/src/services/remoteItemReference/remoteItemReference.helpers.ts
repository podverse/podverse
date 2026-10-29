import type { RemoteItemGeneric } from '@podverse/helpers';

import type { PublisherAlbumMatchMaps } from '../publisherFeed.helpers.js';

/** Lowercased trimmed feed GUID, or '' when absent. */
export function remoteRefGuidKey(ref: RemoteItemGeneric): string {
  return typeof ref.feed_guid === 'string' ? ref.feed_guid.trim().toLowerCase() : '';
}

/** Trimmed feed URL, or '' when absent. */
export function remoteRefFeedUrlKey(ref: RemoteItemGeneric): string {
  return typeof ref.feed_url === 'string' ? ref.feed_url.trim() : '';
}

/** Trimmed item GUID, or '' when absent. A non-empty value makes the ref an item reference. */
export function remoteRefItemGuidKey(ref: RemoteItemGeneric): string {
  return typeof ref.item_guid === 'string' ? ref.item_guid.trim() : '';
}

/** Parsed channel id for the ref: GUID match first, then feed URL, else undefined. */
export function parsedChannelIdForRef(
  ref: RemoteItemGeneric,
  matches: PublisherAlbumMatchMaps
): number | undefined {
  const guidKey = remoteRefGuidKey(ref);
  if (guidKey.length > 0) {
    const matchedByGuid = matches.parsedChannelIdByGuid.get(guidKey);
    if (matchedByGuid !== undefined) {
      return matchedByGuid;
    }
  }

  const feedUrlKey = remoteRefFeedUrlKey(ref);
  if (feedUrlKey.length === 0) {
    return undefined;
  }
  return matches.parsedChannelIdByFeedUrl.get(feedUrlKey);
}

/** Unique trimmed feed URLs of refs whose GUID did not match, in ref order. */
export function feedUrlsForUnmatchedRefs(
  refs: readonly RemoteItemGeneric[],
  parsedChannelIdByGuid: ReadonlyMap<string, number>
): string[] {
  const feedUrls: string[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    const guidKey = remoteRefGuidKey(ref);
    if (guidKey.length > 0 && parsedChannelIdByGuid.has(guidKey)) {
      continue;
    }

    const feedUrl = remoteRefFeedUrlKey(ref);
    if (feedUrl.length === 0 || seen.has(feedUrl)) {
      continue;
    }
    seen.add(feedUrl);
    feedUrls.push(feedUrl);
  }

  return feedUrls;
}

export type RemoteItemRefPartition<T extends RemoteItemGeneric> = {
  /** Parsed channel ids for channel refs, ref order, deduped. */
  addedChannelIds: number[];
  /** Channel refs with no parsed channel, ref order, deduped by guid key else url key. */
  unmatchedChannelRefs: T[];
  /** Parsed item ids for item refs, ref order, deduped. */
  addedItemIds: number[];
  /** Item refs whose channel is not parsed, ref order, deduped by channel key + item guid. */
  unmatchedItemRefs: T[];
};

/**
 * Splits refs (already in feed order). A ref with neither a GUID nor a URL is skipped.
 * An item ref whose channel is parsed but whose item is not in `parsedItemIdByKey` is dropped:
 * a fully parsed channel wins over any stub, and no item stub exists without a channel stub.
 */
export function partitionRemoteItemRefs<T extends RemoteItemGeneric>(args: {
  refs: readonly T[];
  matches: PublisherAlbumMatchMaps;
  /** Key `${channelId}||${itemGuid}` (item GUID trimmed, case kept) → parsed item id. */
  parsedItemIdByKey: ReadonlyMap<string, number>;
}): RemoteItemRefPartition<T> {
  const addedChannelIds: number[] = [];
  const seenAddedChannelIds = new Set<number>();
  const unmatchedChannelRefs: T[] = [];
  const seenUnmatchedChannelKeys = new Set<string>();
  const addedItemIds: number[] = [];
  const seenAddedItemIds = new Set<number>();
  const unmatchedItemRefs: T[] = [];
  const seenUnmatchedItemKeys = new Set<string>();

  for (const ref of args.refs) {
    const guidKey = remoteRefGuidKey(ref);
    const feedUrlKey = remoteRefFeedUrlKey(ref);
    const itemGuidKey = remoteRefItemGuidKey(ref);

    if (guidKey.length === 0 && feedUrlKey.length === 0) {
      continue;
    }

    const matchedChannelId = parsedChannelIdForRef(ref, args.matches);

    if (itemGuidKey.length === 0) {
      if (matchedChannelId !== undefined) {
        if (!seenAddedChannelIds.has(matchedChannelId)) {
          seenAddedChannelIds.add(matchedChannelId);
          addedChannelIds.push(matchedChannelId);
        }
      } else {
        const unmatchedChannelKey = guidKey.length > 0 ? `guid:${guidKey}` : `url:${feedUrlKey}`;
        if (!seenUnmatchedChannelKeys.has(unmatchedChannelKey)) {
          seenUnmatchedChannelKeys.add(unmatchedChannelKey);
          unmatchedChannelRefs.push(ref);
        }
      }
      continue;
    }

    if (matchedChannelId !== undefined) {
      const itemId = args.parsedItemIdByKey.get(parsedItemKey(matchedChannelId, itemGuidKey));
      if (itemId !== undefined && !seenAddedItemIds.has(itemId)) {
        seenAddedItemIds.add(itemId);
        addedItemIds.push(itemId);
      }
      continue;
    }

    const unmatchedChannelKey = guidKey.length > 0 ? `guid:${guidKey}` : `url:${feedUrlKey}`;
    const unmatchedItemKey = `${unmatchedChannelKey}||item:${itemGuidKey}`;
    if (!seenUnmatchedItemKeys.has(unmatchedItemKey)) {
      seenUnmatchedItemKeys.add(unmatchedItemKey);
      unmatchedItemRefs.push(ref);
    }
  }

  return {
    addedChannelIds,
    unmatchedChannelRefs,
    addedItemIds,
    unmatchedItemRefs,
  };
}

export function parsedItemKey(channelId: number, itemGuid: string): string {
  return `${channelId}||${itemGuid.trim()}`;
}

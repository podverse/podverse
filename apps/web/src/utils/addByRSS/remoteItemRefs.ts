import type { AddByRSSBundleRemoteRef } from '@podverse/parser-mapping';

import { normalizeAddByRSSGuid, toAddByRSSComparableFeedUrl } from './listedFeeds';
import { getAddByRSSFeedGuid } from './publisherLinks';
import { buildAddByRSSRemoteFeedPath } from './remoteFeedPath';
import type { AddByRSSFeedRecord } from './types';

/** The stored Add by RSS feed a reference's feed names: comparable feed URL first, then podcast GUID. */
export const findAddByRSSFeedForRemoteRef = (
  ref: AddByRSSBundleRemoteRef,
  feeds: readonly AddByRSSFeedRecord[]
): AddByRSSFeedRecord | undefined => {
  if (ref.feedUrl !== null) {
    const comparableUrl = toAddByRSSComparableFeedUrl(ref.feedUrl);
    const byUrl = feeds.find((feed) => toAddByRSSComparableFeedUrl(feed.feedUrl) === comparableUrl);
    if (byUrl !== undefined) {
      return byUrl;
    }
  }

  const guid = normalizeAddByRSSGuid(ref.feedGuid);
  if (guid === null) {
    return undefined;
  }

  return feeds.find((feed) => getAddByRSSFeedGuid(feed) === guid);
};

const remoteRefFeedKey = (ref: AddByRSSBundleRemoteRef): string => {
  const guid = normalizeAddByRSSGuid(ref.feedGuid);
  if (guid !== null) {
    return `guid:${guid}`;
  }
  const url = ref.feedUrl === null ? '' : toAddByRSSComparableFeedUrl(ref.feedUrl);
  return `url:${url}`;
};

/** Stable row key: `guid:<feedGuid>` or `url:<comparable url>`, plus `|item:<itemGuid>` for an item reference. */
export const remoteRefRowKey = (ref: AddByRSSBundleRemoteRef): string => {
  const base = remoteRefFeedKey(ref);
  if (ref.itemGuid === null) {
    return base;
  }
  return `${base}|item:${ref.itemGuid}`;
};

/**
 * Add by RSS search detail path for a reference the provider does not know. Carries the remote
 * feed URL, and the reference title only for a channel reference (an item reference's title names
 * the item, not the feed). Null when the reference has no feed URL.
 */
export const remoteFeedPathForRef = (ref: AddByRSSBundleRemoteRef): string | null => {
  if (ref.feedUrl === null) {
    return null;
  }
  return buildAddByRSSRemoteFeedPath({
    feedUrl: ref.feedUrl,
    title: ref.itemGuid === null ? ref.title : null,
  });
};

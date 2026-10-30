import type { AddByRSSRemoteItemLookupRef, AddByRSSRemoteItemRef } from '@podverse/helpers';
import { splitFeedUrlUserinfo } from '@podverse/helpers';

import type { AddByRSSMappedFeed } from './types.js';

/** `podroll` is `podcast:podroll`; `remote_items` is the channel's own `podcast:remoteItem` list. */
export type AddByRSSRemoteItemList = 'podroll' | 'remote_items';

export type AddByRSSBundleRemoteRef = {
  /** Trimmed and lowercased, or null. */
  feedGuid: string | null;
  /** Trimmed with userinfo removed, or null. */
  feedUrl: string | null;
  /** Trimmed, case kept, or null. Set for an item reference. */
  itemGuid: string | null;
  /** The reference's own `title` attribute, trimmed, or null. */
  title: string | null;
};

type CompatRemoteRef = {
  feed_guid: string;
  feed_url: string | null;
  item_guid: string | null;
  title: string | null;
};

function trimmedOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizedGuid(value: string | null | undefined): string | null {
  const trimmed = trimmedOrNull(value);
  return trimmed === null ? null : trimmed.toLowerCase();
}

function normalizedFeedUrl(value: string | null | undefined): string | null {
  const trimmed = trimmedOrNull(value);
  if (trimmed === null) {
    return null;
  }
  return trimmedOrNull(splitFeedUrlUserinfo(trimmed).feedUrl);
}

function refDedupeKey(ref: AddByRSSBundleRemoteRef): string {
  const feedKey = ref.feedGuid ?? `url:${ref.feedUrl}`;
  return `${feedKey}||${ref.itemGuid ?? ''}`;
}

function refsForList(
  mappedFeed: AddByRSSMappedFeed | null | undefined,
  list: AddByRSSRemoteItemList
): CompatRemoteRef[] {
  if (list === 'podroll') {
    return mappedFeed?.channel?.podrollRemoteItems ?? [];
  }
  return mappedFeed?.channel?.remoteItems ?? [];
}

/**
 * References of one list in the bundle, in feed order. Channel and item references are both kept.
 * Deduped by feed key (GUID, else URL) plus item GUID. A reference with neither feed key, or one
 * naming the feed itself (`own.feedGuid` / `own.feedUrl`, compared the same way), is skipped.
 */
export const getAddByRSSRemoteItemRefs = (
  mappedFeed: AddByRSSMappedFeed | null | undefined,
  own: { feedGuid: string | null; feedUrl: string },
  list: AddByRSSRemoteItemList
): AddByRSSBundleRemoteRef[] => {
  const ownGuid = normalizedGuid(own.feedGuid);
  const ownUrl = normalizedFeedUrl(own.feedUrl);
  const output: AddByRSSBundleRemoteRef[] = [];
  const seen = new Set<string>();

  for (const rawRef of refsForList(mappedFeed, list)) {
    const ref: AddByRSSBundleRemoteRef = {
      feedGuid: normalizedGuid(rawRef.feed_guid),
      feedUrl: normalizedFeedUrl(rawRef.feed_url),
      itemGuid: trimmedOrNull(rawRef.item_guid),
      title: trimmedOrNull(rawRef.title),
    };

    if (ref.feedGuid === null && ref.feedUrl === null) {
      continue;
    }

    if (
      (ownGuid !== null && ref.feedGuid === ownGuid) ||
      (ownUrl !== null && ref.feedUrl === ownUrl)
    ) {
      continue;
    }

    const dedupeKey = refDedupeKey(ref);
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    output.push(ref);
  }

  return output;
};

/** Lookup body entry: the reference's feed keys and item GUID. */
export const toAddByRSSRemoteItemLookupRef = (
  ref: AddByRSSBundleRemoteRef
): AddByRSSRemoteItemLookupRef => ({
  feed_guid: ref.feedGuid,
  feed_url: ref.feedUrl,
  item_guid: ref.itemGuid,
});

/** Resolve body: the reference's feed keys only, for an item reference too. */
export const toAddByRSSRemoteItemResolveRef = (
  ref: AddByRSSBundleRemoteRef
): AddByRSSRemoteItemRef => ({
  feed_guid: ref.feedGuid,
  feed_url: ref.feedUrl,
});

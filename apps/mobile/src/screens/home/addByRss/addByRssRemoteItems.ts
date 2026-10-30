import type {
  DTOAddByRSSRemoteItemLookupResult,
  DTOIndexProviderFeedTarget,
  DTORemoteItemStub,
} from '@podverse/helpers/dto';
import type { AddByRSSBundleRemoteRef, AddByRSSRemoteItemList } from '@podverse/parser-mapping';
import { getAddByRSSRemoteItemRefs } from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../../prefs/addByRSSFeeds';
import type { AddByRssHomeDetailData } from '../addByRssHomeDetailData';

type AddByRssRemoteEntryBase = {
  key: string;
  title: string | null;
  /** Second line: the channel title on item rows, when known and not already the title. */
  subtitle: string | null;
  imageUrl: string | null;
};

export type AddByRssRemoteEntry =
  | (AddByRssRemoteEntryBase & { kind: 'add_by_rss'; feedIdText: string; feedUrl: string })
  | (AddByRssRemoteEntryBase & { kind: 'channel'; channelIdText: string; mediumId: number | null })
  | (AddByRssRemoteEntryBase & { kind: 'item'; itemIdText: string; mediumId: number | null })
  | (AddByRssRemoteEntryBase & { kind: 'provider_feed'; target: DTOIndexProviderFeedTarget })
  | (AddByRssRemoteEntryBase & { kind: 'item_stub'; stub: DTORemoteItemStub })
  | (AddByRssRemoteEntryBase & { kind: 'reference'; ref: AddByRSSBundleRemoteRef });

const trimmedOrNull = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const withFallback = (preferred: string | null, fallback: string | null): string | null =>
  trimmedOrNull(preferred) ?? trimmedOrNull(fallback);

const itemSubtitle = (subtitle: string | null, title: string | null): string | null => {
  const trimmed = trimmedOrNull(subtitle);
  if (trimmed === null || trimmed === title) {
    return null;
  }
  return trimmed;
};

/** `guid:<guid>` or `url:<url>`, plus `|item:<itemGuid>` for an item reference. */
export const remoteRefKey = (ref: AddByRSSBundleRemoteRef): string => {
  const feedKey = ref.feedGuid !== null ? `guid:${ref.feedGuid}` : `url:${ref.feedUrl}`;
  if (ref.itemGuid === null) {
    return feedKey;
  }
  return `${feedKey}|item:${ref.itemGuid}`;
};

const rowBase = (
  ref: AddByRSSBundleRemoteRef,
  title: string | null,
  subtitleSource: string | null,
  imageUrl: string | null
): AddByRssRemoteEntryBase => ({
  imageUrl: trimmedOrNull(imageUrl),
  key: remoteRefKey(ref),
  subtitle: ref.itemGuid === null ? null : itemSubtitle(subtitleSource, title),
  title,
});

const deviceEntry = (
  ref: AddByRSSBundleRemoteRef,
  record: MobileAddByRSSFeedRecord
): AddByRssRemoteEntry => {
  const refTitle = trimmedOrNull(ref.title);
  const recordTitle = trimmedOrNull(record.title);
  const title =
    ref.itemGuid === null
      ? withFallback(recordTitle, refTitle)
      : withFallback(refTitle, recordTitle);
  return {
    ...rowBase(ref, title, recordTitle, record.imageUrl),
    feedIdText: record.idText,
    feedUrl: record.feedUrl,
    kind: 'add_by_rss',
  };
};

const referenceEntry = (ref: AddByRSSBundleRemoteRef): AddByRssRemoteEntry => ({
  ...rowBase(ref, trimmedOrNull(ref.title), null, null),
  kind: 'reference',
  ref,
});

const entryFromLookup = (
  ref: AddByRSSBundleRemoteRef,
  result: Exclude<DTOAddByRSSRemoteItemLookupResult, { kind: 'none' }>
): AddByRssRemoteEntry => {
  const refTitle = trimmedOrNull(ref.title);
  switch (result.kind) {
    case 'channel': {
      const channelTitle = trimmedOrNull(result.channel.title);
      const title =
        ref.itemGuid === null
          ? withFallback(channelTitle, refTitle)
          : withFallback(refTitle, channelTitle);
      return {
        ...rowBase(ref, title, channelTitle, null),
        channelIdText: result.channel.id_text,
        kind: 'channel',
        mediumId: result.channel.medium_id,
      };
    }
    case 'item': {
      const channelTitle = trimmedOrNull(result.item.channel.title);
      return {
        ...rowBase(
          ref,
          withFallback(trimmedOrNull(result.item.title), refTitle),
          channelTitle,
          null
        ),
        itemIdText: result.item.id_text,
        kind: 'item',
        mediumId: result.item.channel.medium_id,
      };
    }
    case 'provider_feed': {
      const targetTitle = trimmedOrNull(result.provider_feed.title);
      const title =
        ref.itemGuid === null
          ? withFallback(targetTitle, refTitle)
          : withFallback(refTitle, targetTitle);
      return {
        ...rowBase(ref, title, targetTitle, result.provider_feed.image_url),
        kind: 'provider_feed',
        target: result.provider_feed,
      };
    }
    case 'item_stub': {
      const channelTitle = trimmedOrNull(result.item_stub.channel_stub.title);
      const imageUrl =
        trimmedOrNull(result.item_stub.image_url) ??
        trimmedOrNull(result.item_stub.channel_stub.image_url);
      return {
        ...rowBase(
          ref,
          withFallback(trimmedOrNull(result.item_stub.title), refTitle),
          channelTitle,
          imageUrl
        ),
        kind: 'item_stub',
        stub: result.item_stub,
      };
    }
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
};

/** Refs in one list of the detail's bundle; [] when there is no bundle. */
export const getAddByRssRemoteRefsForDetail = (
  detail: AddByRssHomeDetailData | null,
  list: AddByRSSRemoteItemList
): AddByRSSBundleRemoteRef[] => {
  if (detail === null) {
    return [];
  }
  return getAddByRSSRemoteItemRefs(
    detail.mappedFeed,
    {
      feedGuid: detail.mappedFeed?.channel?.channel?.podcast_guid ?? null,
      feedUrl: detail.feed.feedUrl,
    },
    list
  );
};

/** Initial entries: a device feed match wins, the rest are references. */
export const toInitialRemoteEntries = (
  refs: readonly AddByRSSBundleRemoteRef[],
  deviceFeedByRefKey: ReadonlyMap<string, MobileAddByRSSFeedRecord>
): AddByRssRemoteEntry[] =>
  refs.map((ref) => {
    const record = deviceFeedByRefKey.get(remoteRefKey(ref));
    if (record !== undefined) {
      return deviceEntry(ref, record);
    }
    return referenceEntry(ref);
  });

/** Applies lookup results (aligned with `lookupRefs`) onto the matching reference rows. */
export const applyRemoteLookup = (
  entries: readonly AddByRssRemoteEntry[],
  lookupRefs: readonly AddByRSSBundleRemoteRef[],
  results: readonly DTOAddByRSSRemoteItemLookupResult[]
): AddByRssRemoteEntry[] => {
  const replacementByKey = new Map<string, AddByRssRemoteEntry>();
  const count = Math.min(lookupRefs.length, results.length);
  for (let index = 0; index < count; index += 1) {
    const ref = lookupRefs[index];
    const result = results[index];
    if (ref === undefined || result === undefined || result.kind === 'none') {
      continue;
    }
    replacementByKey.set(remoteRefKey(ref), entryFromLookup(ref, result));
  }

  return entries.map((entry) => {
    if (entry.kind !== 'reference') {
      return entry;
    }
    return replacementByKey.get(entry.key) ?? entry;
  });
};

/**
 * The feed URL whose stored credentials row artwork may use: the matched device feed's own URL
 * for an `add_by_rss` row, null for every other row. Never the source feed's URL.
 */
export const artworkAddByRssFeedUrlForEntry = (entry: AddByRssRemoteEntry): string | null =>
  entry.kind === 'add_by_rss' ? entry.feedUrl : null;

/**
 * `AddByRssRemoteFeedDetail` params for a reference the provider does not know: the remote feed
 * URL, and the reference title only for a channel reference (an item reference's title names the
 * item, not the feed). Null when the reference has no feed URL.
 */
export const remoteFeedDetailParamsForRef = (
  ref: AddByRSSBundleRemoteRef
): { feedUrl: string; title?: string } | null => {
  const feedUrl = trimmedOrNull(ref.feedUrl);
  if (feedUrl === null) {
    return null;
  }
  if (ref.itemGuid !== null) {
    return { feedUrl };
  }
  const title = trimmedOrNull(ref.title);
  if (title === null) {
    return { feedUrl };
  }
  return { feedUrl, title };
};

/** Visible row title. A reference with no title shows its feed URL, then `untitled`. */
export const remoteEntryDisplayTitle = (entry: AddByRssRemoteEntry, untitled: string): string => {
  if (entry.title !== null) {
    return entry.title;
  }
  if (entry.kind === 'reference') {
    const feedUrl = trimmedOrNull(entry.ref.feedUrl);
    if (feedUrl !== null) {
      return feedUrl;
    }
  }
  return untitled;
};

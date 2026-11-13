/**
 * Listings for an Add by RSS artist parsed on this device. The grouping and classification are the
 * shared planner's (`planAddByRSSPublisherListedFeeds`), so a device-parsed artist lists the same
 * albums the server would; only the directory matches come from the public remote-item lookup.
 */
import type { AddByRSSPublisherListedFeed } from '@podverse/helpers';
import { isValidReliableUUID } from '@podverse/helpers';
import type {
  AddByRSSRemoteItemLookupRef,
  DTOAddByRSSRemoteItemLookupResult,
} from '@podverse/helpers/dto';
import type {
  AddByRSSDirectoryChannelMatch,
  AddByRSSPublisherListedFeedRef,
} from '@podverse/parser-mapping';
import { planAddByRSSPublisherListedFeeds } from '@podverse/parser-mapping';

/** Pending ids of albums this device parses. The server has no record of them. */
export const DEVICE_LISTED_REQUEST_ID_PREFIX = 'device:';

export const isDeviceListedRequestId = (requestId: string): boolean =>
  requestId.startsWith(DEVICE_LISTED_REQUEST_ID_PREFIX);

/**
 * A guid-only channel-level listing that a directory resolve can answer: listed at channel level,
 * no feed URL, and a reliable UUID guid. The worker asks the index provider under the same three.
 */
export const isResolvableListedRef = (ref: {
  feedGuid: string;
  feedUrl: string | null;
  listedAtChannelLevel: boolean;
}): boolean =>
  ref.listedAtChannelLevel && ref.feedUrl === null && isValidReliableUUID(ref.feedGuid);

/** One channel-level lookup ref per listed feed, in ref order. */
export const deviceListedFeedLookupRefs = (
  refs: readonly AddByRSSPublisherListedFeedRef[]
): AddByRSSRemoteItemLookupRef[] =>
  refs.map((ref) => ({ feed_guid: ref.feedGuid, feed_url: ref.feedUrl, item_guid: null }));

export type DeviceListedFeedMatches = {
  /** Keyed by lowercased feed guid. */
  directoryByFeedGuid: Map<string, AddByRSSDirectoryChannelMatch>;
  /** Stub feed URLs the server already holds, keyed by lowercased feed guid. */
  lookedUpFeedUrlByFeedGuid: Map<string, string>;
};

/**
 * Directory channels and known stub URLs from a lookup whose results line up with `refs`. A stub
 * URL is used only for a ref the index provider would be asked about.
 */
export const deviceListedFeedMatches = (
  refs: readonly AddByRSSPublisherListedFeedRef[],
  results: readonly DTOAddByRSSRemoteItemLookupResult[]
): DeviceListedFeedMatches => {
  const directoryByFeedGuid = new Map<string, AddByRSSDirectoryChannelMatch>();
  const lookedUpFeedUrlByFeedGuid = new Map<string, string>();
  for (const [index, ref] of refs.entries()) {
    const result = results[index];
    if (result === undefined) {
      continue;
    }
    const guid = ref.feedGuid.toLowerCase();
    if (result.kind === 'channel') {
      directoryByFeedGuid.set(guid, {
        channelIdText: result.channel.id_text,
        title: result.channel.title,
        mediumId: result.channel.medium_id,
      });
    } else if (result.kind === 'provider_feed' && isResolvableListedRef(ref)) {
      lookedUpFeedUrlByFeedGuid.set(guid, result.provider_feed.feed_url);
    }
  }
  return { directoryByFeedGuid, lookedUpFeedUrlByFeedGuid };
};

/**
 * The artist's listings. `matches` null (a private artist, whose references never leave the
 * phone) plans with no directory matches: refs with a URL become device-parsed albums and the
 * rest stay unresolved.
 */
export const planDeviceListedFeeds = (input: {
  refs: readonly AddByRSSPublisherListedFeedRef[];
  matches: DeviceListedFeedMatches | null;
  newUuid: () => string;
}): AddByRSSPublisherListedFeed[] =>
  planAddByRSSPublisherListedFeeds({
    refs: input.refs,
    directoryByFeedGuid: input.matches?.directoryByFeedGuid ?? new Map(),
    lookedUpFeedUrlByFeedGuid: input.matches?.lookedUpFeedUrlByFeedGuid ?? new Map(),
    newRequestId: () => DEVICE_LISTED_REQUEST_ID_PREFIX + input.newUuid(),
  }).listedFeeds;

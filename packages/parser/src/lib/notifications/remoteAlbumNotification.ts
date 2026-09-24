import type { RemoteItemDto } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

export type RemoteItemPair = {
  feed_guid: string;
  item_guid: string | null;
};

export type RemoteAlbumGroup = {
  feedGuid: string;
  feedUrls: string[];
  albumTitle: string | null;
  trackTitles: string[];
};

const remoteItemPairKey = (feedGuid: string, itemGuid: string | null | undefined): string => {
  return `${feedGuid}\0${itemGuid ?? ''}`;
};

const trimmedOrNull = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Artist feeds are the only medium whose remote-item catalog is a subscriber notification. */
export function shouldNotifyForRemoteAlbumRefs(mediumId: number): boolean {
  return mediumId === MediumEnum.PublisherMusic;
}

/**
 * Rows whose feed guid + item guid pair was not already stored. Incoming order is preserved.
 * A repeated pair in one parse is kept once.
 */
export function listNewRemoteItemRefs(
  existing: readonly RemoteItemPair[],
  incoming: readonly RemoteItemDto[]
): RemoteItemDto[] {
  const existingKeys = new Set(
    existing.map((row) => remoteItemPairKey(row.feed_guid, row.item_guid))
  );
  const seen = new Set<string>();
  const created: RemoteItemDto[] = [];

  for (const ref of incoming) {
    const key = remoteItemPairKey(ref.feed_guid, ref.item_guid);
    if (existingKeys.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    created.push(ref);
  }

  return created;
}

/** One group per feed guid, in the order the new refs first appeared. */
export function groupNewRemoteItemsByFeed(refs: readonly RemoteItemDto[]): RemoteAlbumGroup[] {
  const order: string[] = [];
  const byGuid = new Map<string, RemoteAlbumGroup>();

  for (const ref of refs) {
    let group = byGuid.get(ref.feed_guid);
    if (group === undefined) {
      group = {
        albumTitle: null,
        feedGuid: ref.feed_guid,
        feedUrls: [],
        trackTitles: [],
      };
      byGuid.set(ref.feed_guid, group);
      order.push(ref.feed_guid);
    }

    const feedUrl = trimmedOrNull(ref.feed_url);
    if (feedUrl !== null && !group.feedUrls.includes(feedUrl)) {
      group.feedUrls.push(feedUrl);
    }

    const title = trimmedOrNull(ref.title);
    const isAlbumRef = ref.item_guid === null || ref.item_guid === undefined || ref.item_guid === '';
    if (isAlbumRef) {
      if (group.albumTitle === null && title !== null) {
        group.albumTitle = title;
      }
    } else if (title !== null) {
      group.trackTitles.push(title);
    }
  }

  return order.flatMap((feedGuid) => {
    const group = byGuid.get(feedGuid);
    return group === undefined ? [] : [group];
  });
}

export function remoteAlbumNotificationTitle(
  group: RemoteAlbumGroup,
  resolvedName: string | null
): string {
  const resolved = trimmedOrNull(resolvedName);
  if (resolved !== null) {
    return resolved;
  }
  if (group.albumTitle !== null) {
    return group.albumTitle;
  }
  return group.trackTitles[0] ?? '';
}

/** First group that resolves. Later groups are not notified. */
export async function pickFirstResolvedRemoteAlbum<T>(
  groups: readonly RemoteAlbumGroup[],
  resolve: (group: RemoteAlbumGroup) => Promise<T | null>
): Promise<T | null> {
  for (const group of groups) {
    const resolved = await resolve(group);
    if (resolved !== null) {
      return resolved;
    }
  }
  return null;
}

export function newRemoteItemsFromParsedChannel(
  result: { newRemoteItems: RemoteItemDto[] } | null | undefined
): RemoteItemDto[] {
  if (result === null || result === undefined) {
    return [];
  }
  return result.newRemoteItems;
}

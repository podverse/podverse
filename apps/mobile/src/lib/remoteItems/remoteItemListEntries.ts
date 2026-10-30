import type {
  DTOChannel,
  DTOItem,
  DTORemoteChannelStub,
  DTORemoteItemStub,
  RemoteItemsResponse,
} from '@podverse/helpers';
import { primaryChannelListArtworkUrl, primaryListArtworkUrl } from '@podverse/helpers';

/** One row in a podroll, a remote item list, or the artist's Not Yet Added albums. */
export type RemoteItemListEntry =
  | {
      kind: 'channel';
      key: string;
      title: string;
      subtitle: string | null;
      imageUrl: string | null;
      channelIdText: string;
      mediumId: number | null;
    }
  | {
      kind: 'item';
      key: string;
      title: string;
      subtitle: string | null;
      imageUrl: string | null;
      itemIdText: string;
      /** The item's channel medium; picks episode versus track detail. */
      mediumId: number | null;
    }
  | {
      kind: 'channel_stub';
      key: string;
      /** Null when the provider reported no title; the row shows the untitled label. */
      title: string | null;
      subtitle: string | null;
      imageUrl: string | null;
      /** The channel the row opens on the provider search detail. */
      target: DTORemoteChannelStub;
    }
  | {
      kind: 'item_stub';
      key: string;
      title: string | null;
      subtitle: string | null;
      imageUrl: string | null;
      /** An item stub opens its channel's provider search detail, never an item page. */
      target: DTORemoteChannelStub;
    };

export const remoteChannelStubKey = (stub: DTORemoteChannelStub): string =>
  `${stub.index_provider}:${stub.provider_feed_id}`;

export const remoteItemStubKey = (stub: DTORemoteItemStub): string =>
  `${remoteChannelStubKey(stub.channel_stub)}:${stub.item_guid}`;

/** Whitespace-only stub text is absent. A non-blank value is kept as written. */
const stubText = (value: string | null): string | null => {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  return value;
};

const trimmedIdText = (idText: string): string | null => {
  const trimmed = idText.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const appendEntry = (
  entries: RemoteItemListEntry[],
  seen: Set<string>,
  entry: RemoteItemListEntry
): void => {
  if (seen.has(entry.key)) {
    return;
  }
  seen.add(entry.key);
  entries.push(entry);
};

const toParsedChannelEntry = (channel: DTOChannel): RemoteItemListEntry | null => {
  const idText = trimmedIdText(channel.id_text);
  if (idText === null) {
    return null;
  }
  return {
    channelIdText: idText,
    imageUrl: primaryChannelListArtworkUrl(channel.channel_images),
    key: `channel:${idText}`,
    kind: 'channel',
    mediumId: channel.medium_id ?? null,
    subtitle: channel.channel_about?.author ?? null,
    title: channel.title ?? idText,
  };
};

const toParsedItemEntry = (item: DTOItem): RemoteItemListEntry | null => {
  const idText = trimmedIdText(item.id_text);
  if (idText === null) {
    return null;
  }
  return {
    imageUrl: primaryListArtworkUrl(item.item_images, item.channel?.channel_images),
    itemIdText: idText,
    key: `item:${idText}`,
    kind: 'item',
    mediumId: item.channel?.medium_id ?? null,
    subtitle: item.channel?.title ?? null,
    title: item.title ?? idText,
  };
};

export const toRemoteChannelStubEntry = (stub: DTORemoteChannelStub): RemoteItemListEntry => ({
  imageUrl: stubText(stub.image_url),
  key: remoteChannelStubKey(stub),
  kind: 'channel_stub',
  subtitle: stubText(stub.author),
  target: stub,
  title: stubText(stub.title),
});

const toRemoteItemStubEntry = (stub: DTORemoteItemStub): RemoteItemListEntry => {
  const channel = stub.channel_stub;
  return {
    imageUrl: stubText(stub.image_url) ?? stubText(channel.image_url),
    key: remoteItemStubKey(stub),
    kind: 'item_stub',
    subtitle: stubText(channel.title),
    target: channel,
    title: stubText(stub.title) ?? stubText(channel.title),
  };
};

/**
 * Parsed channels, then channel stubs, then parsed items, then item stubs, each in response
 * order. A repeated key is kept once. A parsed row with a blank id is left out.
 */
export const toRemoteItemListEntries = (response: RemoteItemsResponse): RemoteItemListEntry[] => {
  const entries: RemoteItemListEntry[] = [];
  const seen = new Set<string>();

  for (const channel of response.channelsAdded) {
    const entry = toParsedChannelEntry(channel);
    if (entry !== null) {
      appendEntry(entries, seen, entry);
    }
  }
  for (const stub of response.channelsUnadded) {
    appendEntry(entries, seen, toRemoteChannelStubEntry(stub));
  }
  for (const item of response.itemsAdded) {
    const entry = toParsedItemEntry(item);
    if (entry !== null) {
      appendEntry(entries, seen, entry);
    }
  }
  for (const stub of response.itemsUnadded) {
    appendEntry(entries, seen, toRemoteItemStubEntry(stub));
  }

  return entries;
};

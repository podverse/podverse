import { AppDataSourceRead } from '@orm/db/index.js';
import { Channel } from '@orm/entities/channel/channel.js';
import { Item } from '@orm/entities/item/item.js';
import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus.js';
import type { RemoteItemGeneric } from '@podverse/helpers';
import { In, IsNull, Not } from 'typeorm';

import { ChannelService } from '../channel/channel.js';
import { FeedService } from '../feed/feed.js';
import type { PublisherAlbumMatchMaps } from '../publisherFeed.helpers.js';
import {
  feedUrlsForUnmatchedRefs,
  parsedChannelIdForRef,
  parsedItemKey,
  partitionRemoteItemRefs,
  remoteRefItemGuidKey,
} from './remoteItemReference.helpers.js';

export async function loadParsedChannelIdsByGuid(
  refs: readonly RemoteItemGeneric[]
): Promise<Map<string, number>> {
  const guids: string[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    const guid = typeof ref.feed_guid === 'string' ? ref.feed_guid.trim() : '';
    const key = guid.toLowerCase();
    if (key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    guids.push(guid);
  }

  const parsedChannelIdByGuid = new Map<string, number>();
  if (guids.length === 0) {
    return parsedChannelIdByGuid;
  }

  const channelService = new ChannelService();
  const channels = await channelService.getAllByPodcastGuids(
    { relations: { channel_about: true } },
    guids
  );
  for (const matched of channels) {
    if (!matched.channel_about || !matched.podcast_guid) {
      continue;
    }
    const key = matched.podcast_guid.trim().toLowerCase();
    if (key.length === 0 || parsedChannelIdByGuid.has(key)) {
      continue;
    }
    parsedChannelIdByGuid.set(key, matched.id);
  }

  return parsedChannelIdByGuid;
}

/** feedUrls: already trimmed and unique (callers build the list). */
export async function loadParsedChannelIdsByFeedUrls(
  feedUrls: readonly string[]
): Promise<Map<string, number>> {
  const parsedChannelIdByFeedUrl = new Map<string, number>();
  if (feedUrls.length === 0) {
    return parsedChannelIdByFeedUrl;
  }

  const channelService = new ChannelService();
  const feedService = new FeedService();
  for (const feedUrl of feedUrls) {
    if (feedUrl.length === 0 || parsedChannelIdByFeedUrl.has(feedUrl)) {
      continue;
    }

    const feed = await feedService.getByUrl({ url: feedUrl });
    const channelId = feed?.channel?.id;
    if (channelId === undefined || channelId === null) {
      continue;
    }

    const channel = await channelService.get(channelId, {
      channel_about: true,
      channel_images: true,
    });
    if (channel?.channel_about) {
      parsedChannelIdByFeedUrl.set(feedUrl, channel.id);
    }
  }

  return parsedChannelIdByFeedUrl;
}

export type PartitionedRemoteItemReferences = {
  /** Parsed channels (channel_about, channel_images loaded), ref order. */
  channelsAdded: Channel[];
  channelRefsUnmatched: RemoteItemGeneric[];
  /** Parsed active items (channel.channel_images, item_images loaded), ref order. */
  itemsAdded: Item[];
  itemRefsUnmatched: RemoteItemGeneric[];
};

export class RemoteItemReferenceService {
  async partition(refs: readonly RemoteItemGeneric[]): Promise<PartitionedRemoteItemReferences> {
    if (refs.length === 0) {
      return {
        channelsAdded: [],
        channelRefsUnmatched: [],
        itemsAdded: [],
        itemRefsUnmatched: [],
      };
    }

    const parsedChannelIdByGuid = await loadParsedChannelIdsByGuid(refs);
    const parsedChannelIdByFeedUrl = await loadParsedChannelIdsByFeedUrls(
      feedUrlsForUnmatchedRefs(refs, parsedChannelIdByGuid)
    );
    const matches: PublisherAlbumMatchMaps = {
      parsedChannelIdByGuid,
      parsedChannelIdByFeedUrl,
    };

    const itemChannelIds: number[] = [];
    const seenItemChannelIds = new Set<number>();
    const itemGuids: string[] = [];
    const seenItemGuids = new Set<string>();
    for (const ref of refs) {
      const itemGuid = remoteRefItemGuidKey(ref);
      if (itemGuid.length === 0) {
        continue;
      }

      const matchedChannelId = parsedChannelIdForRef(ref, matches);
      if (matchedChannelId === undefined) {
        continue;
      }

      if (!seenItemChannelIds.has(matchedChannelId)) {
        seenItemChannelIds.add(matchedChannelId);
        itemChannelIds.push(matchedChannelId);
      }
      if (!seenItemGuids.has(itemGuid)) {
        seenItemGuids.add(itemGuid);
        itemGuids.push(itemGuid);
      }
    }

    const parsedItemIdByKey = new Map<string, number>();
    let matchedItems: Item[] = [];
    if (itemChannelIds.length > 0 && itemGuids.length > 0) {
      matchedItems = await AppDataSourceRead.getRepository(Item).find({
        where: {
          channel: {
            id: In(itemChannelIds),
            channel_about: { id: Not(IsNull()) },
          },
          guid: In(itemGuids),
          item_flag_status: { id: ItemFlagStatusStatusEnum.Active },
        },
        relations: {
          channel: { channel_images: true },
          item_images: true,
        },
      });

      for (const item of matchedItems) {
        const channelId = item.channel?.id;
        const itemGuid = typeof item.guid === 'string' ? item.guid.trim() : '';
        if (channelId === undefined || channelId === null || itemGuid.length === 0) {
          continue;
        }
        const key = parsedItemKey(channelId, itemGuid);
        if (!parsedItemIdByKey.has(key)) {
          parsedItemIdByKey.set(key, item.id);
        }
      }
    }

    const partitioned = partitionRemoteItemRefs({
      refs,
      matches,
      parsedItemIdByKey,
    });

    let channelsAdded: Channel[] = [];
    if (partitioned.addedChannelIds.length > 0) {
      const loadedChannels = await AppDataSourceRead.getRepository(Channel).find({
        where: {
          id: In(partitioned.addedChannelIds),
          channel_about: { id: Not(IsNull()) },
        },
        relations: { channel_about: true, channel_images: true },
      });
      const channelById = new Map<number, Channel>();
      for (const channel of loadedChannels) {
        channelById.set(channel.id, channel);
      }
      channelsAdded = partitioned.addedChannelIds
        .map((id) => channelById.get(id))
        .filter((channel): channel is Channel => channel !== undefined);
    }

    const matchedItemById = new Map<number, Item>();
    for (const item of matchedItems) {
      matchedItemById.set(item.id, item);
    }
    const itemsAdded = partitioned.addedItemIds
      .map((id) => matchedItemById.get(id))
      .filter((item): item is Item => item !== undefined);

    return {
      channelsAdded,
      channelRefsUnmatched: partitioned.unmatchedChannelRefs,
      itemsAdded,
      itemRefsUnmatched: partitioned.unmatchedItemRefs,
    };
  }
}

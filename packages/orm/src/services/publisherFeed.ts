import { AppDataSourceRead } from '@orm/db/index.js';
import { Channel } from '@orm/entities/channel/channel.js';
import type { ChannelRemoteItem } from '@orm/entities/channel/channelRemoteItem.js';
import { Item } from '@orm/entities/item/item.js';
import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus.js';
import type { FindOptionsWhere } from 'typeorm';
import { In, IsNull, Not } from 'typeorm';

import { channelGetOneRelations, ChannelService } from './channel/channel.js';
import { ChannelVerifiedPublisherService } from './channel/channelVerifiedPublisher.js';
import { itemGetManyRelationsWithChannel } from './item/item.js';
import {
  feedUrlsForPublisherAlbumUrlLookup,
  isPublisherAlbumRemoteRef,
  partitionPublisherAlbumRefs,
} from './publisherFeed.helpers.js';
import {
  loadParsedChannelIdsByFeedUrls,
  loadParsedChannelIdsByGuid,
} from './remoteItemReference/remoteItemReference.js';

/** Newest-first cap for tracks on one publisher feed. */
export const PUBLISHER_FEED_TRACKS_MAX = 500;

export type PublisherFeedRemoteItemsResult = {
  channel: Channel | null;
  /** Verified albums, artist feed order. */
  verifiedAlbums: Channel[];
  /** Album references to parsed-nothing feeds, for Podcast Index enrichment. */
  notYetAddedAlbumRefs: ChannelRemoteItem[];
  /** Tracks on verified albums plus item-credited tracks, newest first. */
  tracks: Item[];
};

export class PublisherFeedService {
  private async loadVerifiedAlbums(verifiedChannelIds: readonly number[]): Promise<Channel[]> {
    if (verifiedChannelIds.length === 0) {
      return [];
    }
    const loaded = await AppDataSourceRead.getRepository(Channel).find({
      where: {
        id: In(verifiedChannelIds),
        channel_about: { id: Not(IsNull()) },
      },
      relations: { channel_about: true, channel_images: true },
    });
    const byId = new Map<number, Channel>();
    for (const album of loaded) {
      byId.set(album.id, album);
    }
    const verifiedAlbums: Channel[] = [];
    for (const id of verifiedChannelIds) {
      const album = byId.get(id);
      if (album !== undefined) {
        verifiedAlbums.push(album);
      }
    }
    return verifiedAlbums;
  }

  private async loadPublisherTracks(
    albumIds: readonly number[],
    creditedItemIds: readonly number[]
  ): Promise<Item[]> {
    if (albumIds.length === 0 && creditedItemIds.length === 0) {
      return [];
    }

    const where: FindOptionsWhere<Item>[] = [];
    if (albumIds.length > 0) {
      where.push({
        channel: {
          id: In(albumIds),
          channel_about: { id: Not(IsNull()) },
        },
        live_item: { id: IsNull() },
        item_flag_status: { id: ItemFlagStatusStatusEnum.Active },
      });
    }
    if (creditedItemIds.length > 0) {
      where.push({
        id: In(creditedItemIds),
        channel: { channel_about: { id: Not(IsNull()) } },
        live_item: { id: IsNull() },
        item_flag_status: { id: ItemFlagStatusStatusEnum.Active },
      });
    }

    return AppDataSourceRead.getRepository(Item).find({
      where,
      relations: itemGetManyRelationsWithChannel,
      order: { pub_date: 'DESC', id: 'DESC' },
      take: PUBLISHER_FEED_TRACKS_MAX,
    });
  }

  async getPublisherFeedRemoteItemsForChannel(
    idOrIdText: string
  ): Promise<PublisherFeedRemoteItemsResult> {
    const channelService = new ChannelService();

    // Artist pages use this channel for About, people, funding, and podroll. It needs the
    // same relations as GET /channel, including feed URL and website.
    const channel = await channelService.getByIdOrIdText(idOrIdText, channelGetOneRelations);
    if (!channel) {
      return {
        channel: null,
        verifiedAlbums: [],
        notYetAddedAlbumRefs: [],
        tracks: [],
      };
    }

    const albumRefs = [...(channel.channel_remote_items ?? [])]
      .sort((left, right) => left.id - right.id)
      .filter((ref) => isPublisherAlbumRemoteRef(ref));
    const catalog = await new ChannelVerifiedPublisherService().getCatalogForPublisher(channel.id);
    const parsedChannelIdByGuid = await loadParsedChannelIdsByGuid(albumRefs);
    const unmatchedByGuid = albumRefs.filter((ref) => {
      const guidKey = typeof ref.feed_guid === 'string' ? ref.feed_guid.trim().toLowerCase() : '';
      return guidKey.length === 0 || !parsedChannelIdByGuid.has(guidKey);
    });
    const parsedChannelIdByFeedUrl = await loadParsedChannelIdsByFeedUrls(
      feedUrlsForPublisherAlbumUrlLookup(unmatchedByGuid)
    );
    const partitioned = partitionPublisherAlbumRefs({
      refs: albumRefs,
      matches: { parsedChannelIdByGuid, parsedChannelIdByFeedUrl },
      verifiedAlbumChannelIds: new Set(catalog.albumChannelIds),
    });
    const verifiedAlbums = await this.loadVerifiedAlbums(partitioned.verifiedChannelIds);
    const loadedAlbumIds = new Set(verifiedAlbums.map((album) => album.id));
    const tracks = await this.loadPublisherTracks(
      catalog.albumChannelIds.filter((id) => loadedAlbumIds.has(id)),
      catalog.creditedItemIds
    );

    return {
      channel,
      verifiedAlbums,
      notYetAddedAlbumRefs: partitioned.notYetAddedRefs,
      tracks,
    };
  }
}

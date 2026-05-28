import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelPodroll } from '@orm/entities/channel/channelPodroll.js';
import type { ChannelPodrollRemoteItem } from '@orm/entities/channel/channelPodrollRemoteItem.js';
import type { Item } from '@orm/entities/item/item.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

import { ItemService } from '../item/item.js';
import { ChannelService } from './channel.js';

type ChannelPodrollDto = object;

export class ChannelPodrollService extends BaseOneService<ChannelPodroll, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelPodroll, 'channel', transactionalEntityManager);
  }

  async get(channel: Channel): Promise<ChannelPodroll | null> {
    return super._get(channel);
  }

  async update(channel: Channel, dto: ChannelPodrollDto): Promise<ChannelPodroll> {
    return super._update(channel, dto);
  }

  async delete(channel: Channel): Promise<void> {
    return super._delete(channel);
  }

  async getPodrollChannels(
    channel_podroll_remote_items: ChannelPodrollRemoteItem[]
  ): Promise<Channel[]> {
    const channelService = new ChannelService();

    const feed_guids = [];

    for (const channel_podroll_remote_item of channel_podroll_remote_items) {
      if (channel_podroll_remote_item.feed_guid && !channel_podroll_remote_item.item_guid) {
        feed_guids.push(channel_podroll_remote_item.feed_guid);
      }
    }

    const podrollChannels = await channelService.getAllByPodcastGuids(
      {
        relations: { channel_images: true },
      },
      feed_guids
    );

    return podrollChannels;
  }

  async getPodrollItems(channel_podroll_remote_items: ChannelPodrollRemoteItem[]) {
    const itemService = new ItemService();

    const params = [];
    for (const channel_podroll_remote_item of channel_podroll_remote_items) {
      if (channel_podroll_remote_item.feed_guid && channel_podroll_remote_item.item_guid) {
        params.push({
          podcast_guid: channel_podroll_remote_item.feed_guid,
          item_guid: channel_podroll_remote_item.item_guid,
        });
      }
    }

    const podrollItems = await itemService.getManyByPodcastGuidAndItemGuid(params, {
      relations: {
        channel: { channel_images: true },
        item_images: true,
      },
    });

    return podrollItems;
  }

  async getPodrollForChannel(idOrIdText: string) {
    const channelService = new ChannelService();

    const channel = await channelService.getByIdOrIdText(idOrIdText, {
      channel_podroll: {
        channel_podroll_remote_items: true,
      },
    });

    if (!channel) {
      return {
        podrollChannelsAdded: [],
        podrollChannelsUnadded: [],
        podrollItemsAdded: [],
        podrollItemsUnadded: [],
      };
    }

    const channel_podroll_remote_items =
      channel.channel_podroll?.channel_podroll_remote_items || [];

    if (!channel_podroll_remote_items || channel_podroll_remote_items.length === 0) {
      return {
        podrollChannelsAdded: [],
        podrollChannelsUnadded: [],
        podrollItemsAdded: [],
        podrollItemsUnadded: [],
      };
    }

    const channelFeedGuids: string[] = [];
    const itemParams: { podcast_guid: string; item_guid: string }[] = [];

    for (const rItem of channel_podroll_remote_items) {
      if (rItem.feed_guid && !rItem.item_guid) {
        channelFeedGuids.push(rItem.feed_guid);
      }

      if (rItem.feed_guid && rItem.item_guid) {
        itemParams.push({ podcast_guid: rItem.feed_guid, item_guid: rItem.item_guid });
      }
    }

    const podrollChannels = channelFeedGuids.length
      ? await this.getPodrollChannels(channel_podroll_remote_items)
      : [];
    const podrollItems = itemParams.length
      ? await this.getPodrollItems(channel_podroll_remote_items)
      : [];

    const foundChannelGuids = new Set<string>(
      podrollChannels.map((c) => c.podcast_guid).filter((g): g is string => !!g)
    );

    const foundItemKey = new Set<string>(
      podrollItems
        .filter((i) => !!i.channel?.podcast_guid && !!i.guid)
        .map((i) => `${i.channel?.podcast_guid}||${i.guid}`)
    );

    const podrollChannelsAdded: Channel[] = [];
    const podrollChannelsUnadded: ChannelPodrollRemoteItem[] = [];

    for (const rItem of channel_podroll_remote_items) {
      if (rItem.feed_guid && !rItem.item_guid) {
        if (foundChannelGuids.has(rItem.feed_guid)) {
          const ch = podrollChannels.find((c) => c.podcast_guid === rItem.feed_guid);
          if (ch && !podrollChannelsAdded.find((pc) => pc.id === ch.id)) {
            podrollChannelsAdded.push(ch);
          }
        } else {
          podrollChannelsUnadded.push(rItem);
        }
      }
    }

    const podrollItemsAdded: Item[] = [];
    const podrollItemsUnadded: ChannelPodrollRemoteItem[] = [];

    for (const rItem of channel_podroll_remote_items) {
      if (rItem.feed_guid && rItem.item_guid) {
        const key = `${rItem.feed_guid}||${rItem.item_guid}`;
        if (foundItemKey.has(key)) {
          const it = podrollItems.find(
            (i) => i.guid === rItem.item_guid && i.channel?.podcast_guid === rItem.feed_guid
          );
          if (it && !podrollItemsAdded.find((pi) => pi.id === it.id)) {
            podrollItemsAdded.push(it);
          }
        } else {
          podrollItemsUnadded.push(rItem);
        }
      }
    }

    return {
      podrollChannelsAdded,
      podrollChannelsUnadded,
      podrollItemsAdded,
      podrollItemsUnadded,
    };
  }
}

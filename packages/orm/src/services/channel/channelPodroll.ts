import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelPodroll } from '@orm/entities/channel/channelPodroll.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

import { RemoteItemReferenceService } from '../remoteItemReference/remoteItemReference.js';
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

    const channel_podroll_remote_items = [...(channel.channel_podroll?.channel_podroll_remote_items ?? [])]
      .sort((left, right) => left.id - right.id);

    if (!channel_podroll_remote_items || channel_podroll_remote_items.length === 0) {
      return {
        podrollChannelsAdded: [],
        podrollChannelsUnadded: [],
        podrollItemsAdded: [],
        podrollItemsUnadded: [],
      };
    }

    const remoteItemReferenceService = new RemoteItemReferenceService();
    const partitioned = await remoteItemReferenceService.partition(channel_podroll_remote_items);

    return {
      podrollChannelsAdded: partitioned.channelsAdded,
      podrollChannelsUnadded: partitioned.channelRefsUnmatched,
      podrollItemsAdded: partitioned.itemsAdded,
      podrollItemsUnadded: partitioned.itemRefsUnmatched,
    };
  }
}

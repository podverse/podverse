import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelChat } from '@orm/entities/channel/channelChat.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

type ChannelChatDto = {
  server: string;
  protocol: string;
  account_id: string | null;
  space: string | null;
};

export class ChannelChatService extends BaseOneService<ChannelChat, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelChat, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelChatDto): Promise<ChannelChat> {
    return super._update(channel, dto);
  }
}

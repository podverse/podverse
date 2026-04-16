import { ChannelMetaBoost } from '@orm/entities/channel/channelMetaBoost.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

export type ChannelMetaBoostDto = {
  standard: string;
  node: string;
};

export class ChannelMetaBoostService extends BaseOneService<ChannelMetaBoost, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelMetaBoost, 'channel', transactionalEntityManager);
  }

  update(
    channel: ChannelMetaBoost['channel'],
    dto: ChannelMetaBoostDto
  ): Promise<ChannelMetaBoost> {
    return this._update(channel, dto);
  }

  delete(channel: ChannelMetaBoost['channel']): Promise<void> {
    return this._delete(channel);
  }
}

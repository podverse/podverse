import { ChannelValueMetaBoost } from '@orm/entities/channel/channelValueMetaBoost.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { EntityManager } from 'typeorm';

export type ChannelValueMetaBoostDto = {
  type: string;
  schema: string;
  license?: string | null;
  node: string;
};

export class ChannelValueMetaBoostService extends BaseOneService<
  ChannelValueMetaBoost,
  'channel_value'
> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelValueMetaBoost, 'channel_value', transactionalEntityManager);
  }

  update(
    channel_value: ChannelValueMetaBoost['channel_value'],
    dto: ChannelValueMetaBoostDto
  ): Promise<ChannelValueMetaBoost> {
    return this._update(channel_value, dto);
  }

  delete(channel_value: ChannelValueMetaBoost['channel_value']): Promise<void> {
    return this._delete(channel_value);
  }
}

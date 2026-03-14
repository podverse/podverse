import type { ChannelValue } from '@orm/entities/channel/channelValue.js';
import { ChannelValueRecipient } from '@orm/entities/channel/channelValueRecipient.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';

type ChannelValueRecipientDto = {
  type: string;
  address: string;
  split: number;
  name: string | null;
  custom_key: string | null;
  custom_value: string | null;
  fee: boolean;
};

export class ChannelValueRecipientService extends BaseManyService<
  ChannelValueRecipient,
  'channel_value'
> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelValueRecipient, 'channel_value', transactionalEntityManager);
  }

  async update(
    channel_value: ChannelValue,
    dto: ChannelValueRecipientDto
  ): Promise<ChannelValueRecipient> {
    const whereKeys = [
      'type',
      'address',
      'custom_key',
      'custom_value',
    ] as (keyof ChannelValueRecipient)[];
    return super._update(channel_value, whereKeys, dto);
  }

  async updateMany(
    channel_value: ChannelValue,
    dtos: ChannelValueRecipientDto[]
  ): Promise<ChannelValueRecipient[]> {
    const whereKeys = [
      'type',
      'address',
      'custom_key',
      'custom_value',
    ] as (keyof ChannelValueRecipient)[];
    return super._updateMany(channel_value, whereKeys, dtos);
  }
}

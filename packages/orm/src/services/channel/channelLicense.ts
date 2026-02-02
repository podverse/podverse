import type { EntityManager } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelLicense } from '@orm/entities/channel/channelLicense.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

type ChannelLicenseDto = {
  identifier: string;
  url: string | null;
};

export class ChannelLicenseService extends BaseOneService<ChannelLicense, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelLicense, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelLicenseDto): Promise<ChannelLicense> {
    return super._update(channel, dto);
  }
}

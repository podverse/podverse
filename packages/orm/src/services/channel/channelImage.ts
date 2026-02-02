import type { EntityManager } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelImage } from '@orm/entities/channel/channelImage.js';
import { filterDtosByHighestWidth } from '@orm/lib/filterImageDtosByHighestWidth.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';

type ChannelImageDto = {
  url: string;
  image_width_size: number | null;
};

export class ChannelImageService extends BaseManyService<ChannelImage, 'channel'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ChannelImage, 'channel', transactionalEntityManager);
  }

  async update(channel: Channel, dto: ChannelImageDto): Promise<ChannelImage> {
    const whereKeys = ['url'] as (keyof ChannelImage)[];
    return super._update(channel, whereKeys, dto);
  }

  async updateMany(channel: Channel, dtos: ChannelImageDto[]): Promise<ChannelImage[]> {
    // TODO: adding image shrinking if an image < 500px is not found

    const filteredDtos = filterDtosByHighestWidth(dtos);
    const whereKeys = ['url'] as (keyof ChannelImage)[];
    return super._updateMany(channel, whereKeys, filteredDtos);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}

import type { Channel } from '@orm/entities/channel/channel.js';
import { ChannelImage } from '@orm/entities/channel/channelImage.js';
import { filterDtosByHighestWidth } from '@orm/lib/filterImageDtosByHighestWidth.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';
import { In, Like, MoreThan } from 'typeorm';

import { sha256Hex } from '@podverse/helpers';

type ChannelImageDto = {
  url: string;
  image_width_size: number | null;
  is_resized?: boolean;
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
    const normalizedDtos = filteredDtos.map((dto) => ({
      ...dto,
      is_resized: dto.is_resized ?? false,
    }));
    const existingEntities = await this._getAll(channel);
    const existingNonResized = existingEntities.filter((entity) => entity.is_resized === false);

    const uniqueIdentifiers = new Set<string>();
    const uniqueDtos = normalizedDtos.filter((dto) => {
      const identifier = dto.url;
      if (uniqueIdentifiers.has(identifier)) {
        return false;
      }
      uniqueIdentifiers.add(identifier);
      return true;
    });

    const updatedEntities: ChannelImage[] = [];
    for (const uniqueDto of uniqueDtos) {
      const matchingEntity = existingNonResized.find((entity) => entity.url === uniqueDto.url);
      const updatedEntity = await this._update(
        channel,
        ['url'],
        uniqueDto,
        undefined,
        matchingEntity
      );
      updatedEntities.push(updatedEntity);
    }

    await this.repositoryReadWrite.save(updatedEntities);

    const urlsToKeep = new Set(uniqueDtos.map((dto) => dto.url));
    const entitiesToDelete = existingNonResized.filter((entity) => !urlsToKeep.has(entity.url));
    if (entitiesToDelete.length > 0) {
      await this.repositoryReadWrite.remove(entitiesToDelete);
    }

    return updatedEntities;
  }

  async getByUrls(urls: string[], isResized: boolean): Promise<ChannelImage[]> {
    if (urls.length === 0) {
      return [];
    }
    return this.repositoryRead.find({
      where: {
        url: In(urls),
        is_resized: isResized,
      },
      relations: {
        channel: true,
      },
    });
  }

  async getUnresizedImages(limit: number): Promise<ChannelImage[]> {
    return this.repositoryRead.find({
      where: {
        is_resized: false,
      },
      relations: {
        channel: true,
      },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  /**
   * Finds a resized CDN row for a given origin image URL hash (same key prefix as image shrink).
   */
  /**
   * All resized CDN rows whose storage key matches this origin URL (any channel).
   */
  async findResizedRowsByOriginImageUrl(params: {
    cdnBaseUrl: string;
    sourceUrl: string;
    widthPx: number;
  }): Promise<ChannelImage[]> {
    const base = params.cdnBaseUrl.replace(/\/+$/, '');
    const urlHash = sha256Hex(params.sourceUrl);
    const likePattern = `${base}/images/channel/%/${urlHash}-w${params.widthPx}%`;
    return this.repositoryRead.find({
      where: {
        is_resized: true,
        url: Like(likePattern),
      },
      relations: {
        channel: true,
      },
    });
  }

  async findResizedByShrinkKeyPrefix(
    channel: Channel,
    params: { cdnBaseUrl: string; sourceUrl: string; widthPx: number }
  ): Promise<ChannelImage | null> {
    const base = params.cdnBaseUrl.replace(/\/+$/, '');
    const urlHash = sha256Hex(params.sourceUrl);
    const prefix = `${base}/images/channel/${channel.id}/${urlHash}-w${params.widthPx}`;
    return this.repositoryRead.findOne({
      where: {
        channel: { id: channel.id },
        is_resized: true,
        url: Like(`${prefix}%`),
      },
      relations: {
        channel: true,
      },
    });
  }

  async existsByUrl(url: string, isResized: boolean): Promise<boolean> {
    const count = await this.repositoryRead.count({
      where: {
        url,
        is_resized: isResized,
      },
    });
    return count > 0;
  }

  async findResizedRowsAfterId(lastId: number, limit: number): Promise<ChannelImage[]> {
    return this.repositoryRead.find({
      where: {
        is_resized: true,
        id: MoreThan(lastId),
      },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.repositoryReadWrite.delete(ids);
  }

  async deleteAll(channel: Channel): Promise<void> {
    return super._deleteAll(channel);
  }
}

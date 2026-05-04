import type { Item } from '@orm/entities/item/item.js';
import { ItemImage } from '@orm/entities/item/itemImage.js';
import { filterDtosByHighestWidth } from '@orm/lib/filterImageDtosByHighestWidth.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager } from 'typeorm';
import { In, Like } from 'typeorm';

import { sha256Hex } from '@podverse/helpers';

type ItemImageDto = {
  url: string;
  image_width_size: number | null;
  is_resized?: boolean;
};

export class ItemImageService extends BaseManyService<ItemImage, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemImage, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemImageDto): Promise<ItemImage> {
    const whereKeys = ['url'] as (keyof ItemImage)[];
    return super._update(item, whereKeys, dto);
  }

  async updateMany(item: Item, dtos: ItemImageDto[]): Promise<ItemImage[]> {
    // TODO: adding image shrinking if an image < 500px is not found

    const filteredDtos = filterDtosByHighestWidth(dtos);
    const normalizedDtos = filteredDtos.map((dto) => ({
      ...dto,
      is_resized: dto.is_resized ?? false,
    }));
    const existingEntities = await this._getAll(item);
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

    const updatedEntities: ItemImage[] = [];
    for (const uniqueDto of uniqueDtos) {
      const matchingEntity = existingNonResized.find((entity) => entity.url === uniqueDto.url);
      const updatedEntity = await this._update(item, ['url'], uniqueDto, undefined, matchingEntity);
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

  async getByUrls(urls: string[], isResized: boolean): Promise<ItemImage[]> {
    if (urls.length === 0) {
      return [];
    }
    return this.repositoryRead.find({
      where: {
        url: In(urls),
        is_resized: isResized,
      },
      relations: {
        item: true,
      },
    });
  }

  async getUnresizedImages(limit: number): Promise<ItemImage[]> {
    return this.repositoryRead.find({
      where: {
        is_resized: false,
      },
      relations: {
        item: true,
      },
      order: { id: 'ASC' },
      take: limit,
    });
  }

  /**
   * Finds a resized CDN row for a given origin image URL hash (same key prefix as image shrink).
   */
  /**
   * All resized CDN rows whose storage key matches this origin URL (any item).
   */
  async findResizedRowsByOriginImageUrl(params: {
    cdnBaseUrl: string;
    sourceUrl: string;
    widthPx: number;
  }): Promise<ItemImage[]> {
    const base = params.cdnBaseUrl.replace(/\/+$/, '');
    const urlHash = sha256Hex(params.sourceUrl);
    const likePattern = `${base}/images/item/%/${urlHash}-w${params.widthPx}%`;
    return this.repositoryRead.find({
      where: {
        is_resized: true,
        url: Like(likePattern),
      },
      relations: {
        item: true,
      },
    });
  }

  async findResizedByShrinkKeyPrefix(
    item: Item,
    params: { cdnBaseUrl: string; sourceUrl: string; widthPx: number }
  ): Promise<ItemImage | null> {
    const base = params.cdnBaseUrl.replace(/\/+$/, '');
    const urlHash = sha256Hex(params.sourceUrl);
    const prefix = `${base}/images/item/${item.id}/${urlHash}-w${params.widthPx}`;
    return this.repositoryRead.findOne({
      where: {
        item: { id: item.id },
        is_resized: true,
        url: Like(`${prefix}%`),
      },
      relations: {
        item: true,
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

  async deleteAll(item: Item): Promise<void> {
    return super._deleteAll(item);
  }
}

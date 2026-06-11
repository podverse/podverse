import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { FindOneOptions, ObjectLiteral } from 'typeorm';

/** Remote-item rows looked up by Podcast Index feed_guid / feed_url / item_guid. */
type RemoteItemWhereFields = {
  feed_guid: string;
  feed_url?: string | null;
  item_guid?: string | null;
};

export class BaseRemoteItemsService<
  T extends ObjectLiteral & RemoteItemWhereFields,
  K extends keyof T,
> extends BaseManyService<T, K> {
  async getAll(parentEntity: T[K]): Promise<T[]> {
    return this._getAll(parentEntity);
  }

  async getByItemGuid(parentEntity: T[K], item_guid: T['item_guid']): Promise<T | null> {
    return this._get(parentEntity, { item_guid });
  }

  async getByFeedGuid(parentEntity: T[K], feed_guid: T['feed_guid']): Promise<T | null> {
    return this._get(parentEntity, { feed_guid });
  }

  async getByFeedUrl(parentEntity: T[K], feed_url: T['feed_url']): Promise<T | null> {
    return this._get(parentEntity, { feed_url });
  }

  async get(parentEntity: T[K], dto: Partial<T>): Promise<T | null> {
    if (dto.item_guid !== null && dto.item_guid !== undefined) {
      return this.getByItemGuid(parentEntity, dto.item_guid);
    }
    if (dto.feed_guid !== null && dto.feed_guid !== undefined) {
      return this.getByFeedGuid(parentEntity, dto.feed_guid);
    }
    if (dto.feed_url !== null && dto.feed_url !== undefined) {
      return this.getByFeedUrl(parentEntity, dto.feed_url);
    }

    return null;
  }

  async update(parentEntity: T[K], dto: Partial<T>, config?: FindOneOptions<T>): Promise<T> {
    const whereKeys = ['feed_guid', 'feed_url', 'item_guid'] as (keyof T)[];
    return super._update(parentEntity, whereKeys, dto, config);
  }

  async updateMany(
    parentEntity: T[K],
    dtos: Partial<T>[],
    config?: FindOneOptions<T>
  ): Promise<T[]> {
    const whereKeys = ['feed_guid', 'feed_url', 'item_guid'] as (keyof T)[];
    return super._updateMany(parentEntity, whereKeys, dtos, config);
  }
}

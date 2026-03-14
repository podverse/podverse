import { getDataSourceReadWrite } from '@orm/context.js';
import type { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed.js';
import { ItemChaptersObject } from '@orm/entities/item/itemChaptersObject.js';
import { applyProperties } from '@orm/lib/applyProperties.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

export type ItemChaptersObjectMetadataDto = {
  version?: string | null;
  author?: string | null;
  title?: string | null;
  podcast_name?: string | null;
  description?: string | null;
  file_name?: string | null;
  waypoints?: boolean | null;
};

export class ItemChaptersObjectService extends BaseOneService<
  ItemChaptersObject,
  'item_chapters_feed'
> {
  constructor() {
    super(ItemChaptersObject, 'item_chapters_feed');
  }

  async getOrCreateByItemChaptersFeed(
    item_chapters_feed: ItemChaptersFeed
  ): Promise<ItemChaptersObject> {
    return this._update(item_chapters_feed, {});
  }

  async getByItemChaptersFeed(
    item_chapters_feed: ItemChaptersFeed
  ): Promise<ItemChaptersObject | null> {
    return this._get(item_chapters_feed);
  }

  async updateMetadata(
    object: ItemChaptersObject,
    dto: ItemChaptersObjectMetadataDto
  ): Promise<ItemChaptersObject> {
    const repo = getDataSourceReadWrite().getRepository(ItemChaptersObject);
    const updated = applyProperties(object, dto);
    return repo.save(updated);
  }
}

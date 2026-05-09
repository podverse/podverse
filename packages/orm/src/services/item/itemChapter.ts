import { getDataSourceReadWrite } from '@orm/context.js';
import { ItemChapter } from '@orm/entities/item/itemChapter.js';
import { ItemChapterLocation } from '@orm/entities/item/itemChapterLocation.js';
import type { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed.js';
import type { ItemChaptersObject } from '@orm/entities/item/itemChaptersObject.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { ItemChaptersObjectService } from '@orm/services/item/itemChaptersObject.js';
import type { EntityManager, FindManyOptions, FindOneOptions } from 'typeorm';
import { In } from 'typeorm';

import type { DTOItemChapterLocation } from '@podverse/helpers';

export type ItemChapterDto = {
  start_time: string;
  end_time: string | null;
  title: string | null;
  web_url: string | null;
  table_of_contents: boolean;
  data_hash: string;
  location?: Pick<DTOItemChapterLocation, 'name' | 'geo' | 'osm'> | null;
};

export class ItemChapterService extends BaseManyService<ItemChapter, 'item_chapters_object'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemChapter, 'item_chapters_object', transactionalEntityManager);
  }

  private async resolveObject(item_chapters_feed: ItemChaptersFeed): Promise<ItemChaptersObject> {
    const objectService = new ItemChaptersObjectService();
    return objectService.getOrCreateByItemChaptersFeed(item_chapters_feed);
  }

  private toParentObject(obj: ItemChaptersObject): ItemChaptersObject {
    const parent = { ...obj };
    delete (parent as Partial<ItemChaptersObject>).item_chapters;
    return parent;
  }

  async getAll(
    item_chapters_feed: ItemChaptersFeed,
    config?: FindManyOptions<ItemChapter>
  ): Promise<ItemChapter[]> {
    const object = await this.resolveObject(item_chapters_feed);
    return super._getAll(this.toParentObject(object), config);
  }

  async getAllWithCount(
    item_chapters_feed: ItemChaptersFeed,
    config?: FindManyOptions<ItemChapter>
  ): Promise<{ count: number; results: ItemChapter[] }> {
    if (!item_chapters_feed) {
      return { count: 0, results: [] };
    }
    const object = await this.resolveObject(item_chapters_feed);
    return super._getAllWithCount(this.toParentObject(object), config);
  }

  async getByIdText(
    id_text: string,
    config?: FindOneOptions<ItemChapter>
  ): Promise<ItemChapter | null> {
    const defaultRelations = [
      'item_chapters_object',
      'item_chapters_object.item_chapters_feed',
      'item_chapters_object.item_chapters_feed.item',
    ];
    const { relations: extraRelations, ...restConfig } = config ?? {};
    const mergedRelations = [
      ...defaultRelations,
      ...(Array.isArray(extraRelations) ? extraRelations : []),
    ];
    const relations = [...new Set(mergedRelations)];

    const options: FindOneOptions<ItemChapter> = {
      where: { id_text },
      relations,
      ...restConfig,
    };

    const chapter = await this.repositoryRead.findOne(options);

    if (!chapter?.item_chapters_object?.item_chapters_feed) {
      return chapter;
    }

    const allChapters = await this.getAll(chapter.item_chapters_object.item_chapters_feed, {
      order: { start_time: 'ASC' },
    });

    const currentStart = parseFloat(chapter.start_time);
    const nextChapter = allChapters.find((ch) => parseFloat(ch.start_time) > currentStart);

    if (nextChapter) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ...chapter, end_time: nextChapter.start_time } as any;
    }

    return chapter;
  }

  async update(item_chapters_feed: ItemChaptersFeed, dto: ItemChapterDto): Promise<ItemChapter> {
    const whereKeys = ['start_time', 'end_time', 'table_of_contents'] as (keyof ItemChapter)[];
    const object = await this.resolveObject(item_chapters_feed);
    const { location, ...chapterDto } = dto;
    const saved = await super._update(this.toParentObject(object), whereKeys, chapterDto);
    if (location) {
      await this.upsertChapterLocation(saved.id, location);
    }
    return saved;
  }

  private async upsertChapterLocation(
    item_chapter_id: number,
    location: Pick<DTOItemChapterLocation, 'name' | 'geo' | 'osm'>
  ): Promise<void> {
    const hasGeo = location.geo !== null && location.geo !== undefined && location.geo.length > 0;
    const hasOsm = location.osm !== undefined && location.osm !== null && location.osm.length > 0;
    if (!hasGeo && !hasOsm) {
      return;
    }
    const repo = getDataSourceReadWrite().getRepository(ItemChapterLocation);
    const existing = await repo.findOne({ where: { item_chapter: { id: item_chapter_id } } });
    const name = location.name ?? null;
    const geo = hasGeo ? location.geo : null;
    const osm = hasGeo ? null : (location.osm ?? null);
    if (existing) {
      existing.name = name;
      existing.geo = geo;
      existing.osm = osm;
      await repo.save(existing);
    } else {
      await repo.save(
        repo.create({
          item_chapter: { id: item_chapter_id },
          name,
          geo,
          osm,
        })
      );
    }
  }

  async updateMany(
    item_chapters_feed: ItemChaptersFeed,
    dtos: ItemChapterDto[]
  ): Promise<ItemChapter[]> {
    const whereKeys = ['start_time', 'end_time', 'table_of_contents'] as (keyof ItemChapter)[];
    const object = await this.resolveObject(item_chapters_feed);
    const chapterDtos = dtos.map(({ location: _loc, ...rest }) => rest);
    const saved = await super._updateMany(this.toParentObject(object), whereKeys, chapterDtos);
    const key = (c: ItemChapter | ItemChapterDto) =>
      `${c.start_time}|${c.end_time ?? null}|${c.table_of_contents}`;
    const dtoByKey = new Map(dtos.map((d) => [key(d), d]));
    await Promise.all(
      saved.map((c) => {
        const dto = dtoByKey.get(key(c));
        const loc = dto?.location;
        return loc ? this.upsertChapterLocation(c.id, loc) : Promise.resolve();
      })
    );
    return saved;
  }

  async deleteMany(ids: number[]): Promise<void> {
    if (ids.length) {
      await this.repositoryReadWrite.delete(ids);
    }
  }

  async deleteManyByDataHash(
    item_chapters_feed: ItemChaptersFeed,
    dataHashes: string[]
  ): Promise<void> {
    if (!dataHashes.length) {
      return;
    }
    const object = await this.resolveObject(item_chapters_feed);
    await this.repositoryReadWrite.delete({
      item_chapters_object: this.toParentObject(object),
      data_hash: In(dataHashes),
    });
  }
}

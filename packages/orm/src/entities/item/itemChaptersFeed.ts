import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import type { ItemChaptersFeedLog } from '@orm/entities/item/itemChaptersFeedLog.js';
import type { ItemChaptersObject } from '@orm/entities/item/itemChaptersObject.js';

@Entity('item_chapters_feed')
export class ItemChaptersFeed {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Item', (item: Item) => item.item_chapters_feed, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', name: 'url', length: DATABASE_CONSTANTS.varchar_url })
  url!: string;

  @Column({ type: 'varchar', name: 'type', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @OneToOne(
    'ItemChaptersObject',
    (item_chapters_object: ItemChaptersObject) => item_chapters_object.item_chapters_feed
  )
  item_chapters_object!: Relation<ItemChaptersObject>;

  @OneToOne(
    'ItemChaptersFeedLog',
    (item_chapters_feed_log: ItemChaptersFeedLog) => item_chapters_feed_log.item_chapters_feed
  )
  item_chapters_feed_log!: Relation<ItemChaptersFeedLog>;
}

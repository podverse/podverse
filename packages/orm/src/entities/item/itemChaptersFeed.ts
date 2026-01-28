import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Item } from '@orm/entities/item/item';
import { ItemChaptersFeedLog } from '@orm/entities/item/itemChaptersFeedLog';
import { ItemChapter } from '@orm/entities/item/itemChapter';

@Entity('item_chapters_feed')
export class ItemChaptersFeed {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Item, (item) => item.item_chapters_feed, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'varchar', name: 'url', length: DATABASE_CONSTANTS.varchar_url })
  url!: string;

  @Column({ type: 'varchar', name: 'type', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @OneToMany(() => ItemChapter, (item_chapter) => item_chapter.item_chapters_feed)
  item_chapters!: ItemChapter[];

  @OneToOne(
    () => ItemChaptersFeedLog,
    (item_chapters_feed_log) => item_chapters_feed_log.item_chapters_feed
  )
  item_chapters_feed_log!: ItemChaptersFeedLog;
}

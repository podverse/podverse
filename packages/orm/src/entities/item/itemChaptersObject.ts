import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed.js';
import type { ItemChapter } from '@orm/entities/item/itemChapter.js';

@Entity('item_chapters_object')
export class ItemChaptersObject {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('ItemChaptersFeed', (feed: ItemChaptersFeed) => feed.item_chapters_object, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_chapters_feed_id' })
  item_chapters_feed!: Relation<ItemChaptersFeed>;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  version?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  author?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  podcast_name?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_longer })
  description?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  file_name?: string | null;

  @Column({ type: 'boolean', nullable: true })
  waypoints?: boolean | null;

  @OneToMany('ItemChapter', (item_chapter: ItemChapter) => item_chapter.item_chapters_object)
  item_chapters!: ItemChapter[];
}

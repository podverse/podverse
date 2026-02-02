import { DATABASE_CONSTANTS } from '@podverse/helpers';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { ItemChaptersFeed } from './itemChaptersFeed.js';
import { generateRandomIdText } from '@orm/lib/nanoid.js';

@Entity()
export class ItemChapter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @ManyToOne('ItemChaptersFeed', (item_chapters_feed: ItemChaptersFeed) => item_chapters_feed.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_chapters_feed_id' })
  item_chapters_feed!: Relation<ItemChaptersFeed>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_md5 })
  data_hash!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  start_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  end_time?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  img?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  web_url?: string | null;

  @Column({ type: 'boolean', default: true })
  table_of_contents!: boolean;

  @BeforeInsert()
  setIdText() {
    this.id_text = generateRandomIdText();
  }
}

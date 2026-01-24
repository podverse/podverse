import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ItemChaptersFeed } from '@orm/entities/item/itemChaptersFeed';

@Entity('item_chapters_feed_log')
export class ItemChaptersFeedLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ItemChaptersFeed, item_chapters_feed => item_chapters_feed.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_chapters_feed_id' })
  item_chapters_feed!: ItemChaptersFeed;

  @Column({ type: 'int', nullable: true })
  last_http_status!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_good_http_status_time!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_finished_parse_time!: Date | null;

  @Column({ type: 'int', default: 0 })
  parse_errors!: number;
}

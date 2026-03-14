import type { Feed } from '@orm/entities/feed/feed.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feed_log')
export class FeedLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Feed', (feed: Feed) => feed.feed_log, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: Relation<Feed>;

  @Column({ type: 'int', nullable: true })
  last_http_status!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_good_http_status_time!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_finished_parse_time!: Date | null;

  @Column({ type: 'int', default: 0 })
  parse_errors!: number;
}

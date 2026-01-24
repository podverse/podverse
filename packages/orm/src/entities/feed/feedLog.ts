import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Feed } from '@orm/entities/feed/feed';

@Entity('feed_log')
export class FeedLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => Feed, feed => feed.feed_log, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: Feed;

  @Column({ type: 'int', nullable: true })
  last_http_status!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_good_http_status_time!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_finished_parse_time!: Date | null;

  @Column({ type: 'int', default: 0 })
  parse_errors!: number;
}

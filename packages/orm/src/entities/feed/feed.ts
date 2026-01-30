import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import { FeedFlagStatus } from '@orm/entities/feed/feedFlagStatus';
import { FeedLog } from './feedLog';

@Entity('feed')
export class Feed {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: DATABASE_CONSTANTS.varchar_url })
  url!: string;

  @Column({ type: 'int', unique: true })
  podcast_index_id!: number;

  @ManyToOne(() => FeedFlagStatus, (feed_flag_status) => feed_flag_status.id)
  @JoinColumn({ name: 'feed_flag_status_id' })
  feed_flag_status!: FeedFlagStatus;

  @OneToOne(() => FeedLog, (feed_log) => feed_log.feed)
  feed_log!: FeedLog;

  @Column({ type: 'timestamp', nullable: true })
  is_parsing!: Date | null;

  @Column({ type: 'int', default: 0 })
  parsing_priority!: number;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_md5, nullable: true })
  last_parsed_file_hash!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 12 })
  container_id!: string | null;

  @OneToOne(() => Channel, (channel) => channel.feed)
  channel!: Channel;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}

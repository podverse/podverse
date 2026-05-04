import type { Channel } from '@orm/entities/channel/channel.js';
import type { FeedFlagStatus } from '@orm/entities/feed/feedFlagStatus.js';
import type { FeedFlagStatusReason } from '@orm/entities/feed/feedFlagStatusReason.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { FeedLog } from './feedLog.js';

@Entity('feed')
export class Feed {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: DATABASE_CONSTANTS.varchar_url })
  url!: string;

  @Column({ type: 'int', unique: true })
  podcast_index_id!: number;

  @ManyToOne('FeedFlagStatus', (feed_flag_status: FeedFlagStatus) => feed_flag_status.id)
  @JoinColumn({ name: 'feed_flag_status_id' })
  feed_flag_status!: Relation<FeedFlagStatus>;

  @ManyToOne(
    'FeedFlagStatusReason',
    (feed_flag_status_reason: FeedFlagStatusReason) => feed_flag_status_reason.id
  )
  @JoinColumn({ name: 'feed_flag_status_reason_id' })
  feed_flag_status_reason!: Relation<FeedFlagStatusReason> | null;

  @Column({ type: 'text', nullable: true })
  feed_flag_status_reason_note!: string | null;

  @OneToOne('FeedLog', (feed_log: FeedLog) => feed_log.feed)
  feed_log!: Relation<FeedLog>;

  @Column({ type: 'timestamp', nullable: true })
  is_parsing!: Date | null;

  @Column({ type: 'int', default: 0 })
  parsing_priority!: number;

  @Column({ type: 'int', nullable: true })
  spam_item_limit_override!: number | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_md5, nullable: true })
  last_parsed_file_hash!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 12 })
  container_id!: string | null;

  @OneToOne('Channel', (channel: Channel) => channel.feed)
  channel!: Relation<Channel>;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}

import type { Channel } from '@orm/entities/channel/channel.js';
import type { FeedCondition } from '@orm/entities/feed/feedCondition.js';
import type { FeedLifecycleState } from '@orm/entities/feed/feedLifecycleState.js';
import type { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';
import type { FeedPolicyOverride } from '@orm/entities/feed/feedPolicyOverride.js';
import { FEED_CONTAINER_ID_MAX_LENGTH } from '@orm/lib/feedTableLimits.js';
import type { Relation } from 'typeorm';
import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

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

  @OneToOne('FeedLifecycleState', (lifecycle: FeedLifecycleState) => lifecycle.feed)
  feed_lifecycle_state!: Relation<FeedLifecycleState | null>;

  @OneToOne('FeedLog', (feed_log: FeedLog) => feed_log.feed)
  feed_log!: Relation<FeedLog>;

  @OneToMany('FeedCondition', (feed_condition: FeedCondition) => feed_condition.feed)
  feed_conditions!: FeedCondition[];

  @OneToOne('FeedPolicy', (feed_policy: FeedPolicy) => feed_policy.feed)
  feed_policy!: Relation<FeedPolicy> | null;

  @OneToOne(
    'FeedPolicyOverride',
    (feed_policy_override: FeedPolicyOverride) => feed_policy_override.feed
  )
  feed_policy_override!: Relation<FeedPolicyOverride> | null;

  @Column({ type: 'timestamp', nullable: true })
  is_parsing!: Date | null;

  @Column({ type: 'int', default: 0 })
  parsing_priority!: number;

  @Column({ type: 'int', nullable: true })
  spam_item_limit_override!: number | null;

  @Column({ type: 'int', nullable: true })
  max_response_body_bytes_override!: number | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_md5, nullable: true })
  last_parsed_file_hash!: string | null;

  @Column({ type: 'varchar', nullable: true, length: FEED_CONTAINER_ID_MAX_LENGTH })
  container_id!: string | null;

  @OneToOne('Channel', (channel: Channel) => channel.feed)
  channel!: Relation<Channel>;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}

import type { Feed } from '@orm/entities/feed/feed.js';
import { FEED_LIFECYCLE_UPDATE_SOURCE_MAX_LENGTH } from '@orm/lib/feedLifecycleLimits.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import type { FeedConditionType } from './feedConditionType.js';

export enum FeedConditionSourceEnum {
  Auto = 'auto',
  Admin = 'admin',
}

@Entity('feed_condition')
@Unique(['feed_id', 'feed_condition_type_id'])
export class FeedCondition {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Feed', (feed: Feed) => feed.feed_conditions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: Relation<Feed>;

  @Column({ type: 'int' })
  feed_id!: number;

  @ManyToOne(
    'FeedConditionType',
    (feed_condition_type: FeedConditionType) => feed_condition_type.feed_conditions,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'feed_condition_type_id' })
  feed_condition_type!: Relation<FeedConditionType>;

  @Column({ type: 'int' })
  feed_condition_type_id!: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({
    type: 'varchar',
    length: FEED_LIFECYCLE_UPDATE_SOURCE_MAX_LENGTH,
    default: FeedConditionSourceEnum.Auto,
  })
  source!: FeedConditionSourceEnum;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}

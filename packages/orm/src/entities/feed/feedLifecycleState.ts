import type { Feed } from '@orm/entities/feed/feed.js';
import type { FeedLifecycleStateType } from '@orm/entities/feed/feedLifecycleStateType.js';
import type { FeedLifecycleUpdateSourceEnum } from '@orm/entities/feed/feedLifecycleUpdateSource.js';
import {
  FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH,
  FEED_LIFECYCLE_UPDATE_SOURCE_MAX_LENGTH,
} from '@orm/lib/feedLifecycleLimits.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feed_lifecycle_state')
export class FeedLifecycleState {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Feed', (feed: Feed) => feed.feed_lifecycle_state, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: Relation<Feed>;

  @Column({ type: 'int', unique: true })
  feed_id!: number;

  @ManyToOne('FeedLifecycleStateType', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'feed_lifecycle_state_type_id' })
  feed_lifecycle_state_type!: Relation<FeedLifecycleStateType>;

  @Column({ type: 'int' })
  feed_lifecycle_state_type_id!: number;

  @Column({ type: 'varchar', length: FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH, nullable: true })
  reason_key!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: FEED_LIFECYCLE_UPDATE_SOURCE_MAX_LENGTH })
  updated_by_source!: FeedLifecycleUpdateSourceEnum;

  @Column({ type: 'int', nullable: true })
  updated_by_admin_id!: number | null;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}

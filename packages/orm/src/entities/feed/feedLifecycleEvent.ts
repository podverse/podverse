import type { Feed } from '@orm/entities/feed/feed.js';
import type { FeedLifecycleStateType } from '@orm/entities/feed/feedLifecycleStateType.js';
import type { FeedLifecycleUpdateSourceEnum } from '@orm/entities/feed/feedLifecycleUpdateSource.js';
import {
  FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH,
  FEED_LIFECYCLE_UPDATE_SOURCE_MAX_LENGTH,
} from '@orm/lib/feedLifecycleLimits.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feed_lifecycle_event')
export class FeedLifecycleEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Feed', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: Relation<Feed>;

  @Column({ type: 'int' })
  feed_id!: number;

  @ManyToOne('FeedLifecycleStateType', { nullable: true })
  @JoinColumn({ name: 'from_lifecycle_state_type_id' })
  from_lifecycle_state_type!: Relation<FeedLifecycleStateType | null>;

  @Column({ type: 'int', nullable: true })
  from_lifecycle_state_type_id!: number | null;

  @ManyToOne('FeedLifecycleStateType', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_lifecycle_state_type_id' })
  to_lifecycle_state_type!: Relation<FeedLifecycleStateType>;

  @Column({ type: 'int' })
  to_lifecycle_state_type_id!: number;

  @Column({ type: 'varchar', length: FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH, nullable: true })
  reason_key!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: FEED_LIFECYCLE_UPDATE_SOURCE_MAX_LENGTH })
  source!: FeedLifecycleUpdateSourceEnum;

  @Column({ type: 'timestamp' })
  created_at!: Date;
}

import type { Feed } from '@orm/entities/feed/feed.js';
import { FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH } from '@orm/lib/feedLifecycleLimits.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum FeedPolicyReasonEnum {
  SpamDetected = 'spam_detected',
  OversizedDetected = 'oversized_detected',
  TakedownActive = 'takedown_active',
  ManualBlock = 'manual_block',
}

@Entity('feed_policy')
export class FeedPolicy {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Feed', (feed: Feed) => feed.feed_policy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'feed_id' })
  feed!: Relation<Feed>;

  @Column({ type: 'int', unique: true })
  feed_id!: number;

  @Column({ type: 'boolean', default: true })
  parse_allowed!: boolean;

  @Column({ type: 'boolean', default: true })
  public_visible!: boolean;

  @Column({ type: 'boolean', default: true })
  add_allowed!: boolean;

  @Column({ type: 'varchar', nullable: true, length: FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH })
  primary_block_reason!: FeedPolicyReasonEnum | null;

  @Column({ type: 'timestamp', nullable: true })
  last_policy_refresh_at!: Date | null;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}

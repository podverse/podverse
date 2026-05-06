import { FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH } from '@orm/lib/feedLifecycleLimits.js';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import type { FeedCondition } from './feedCondition.js';

export enum FeedConditionTypeKeyEnum {
  SpamDetected = 'spam_detected',
  SpamPermitted = 'spam_permitted',
  OversizedDetected = 'oversized_detected',
  TakedownActive = 'takedown_active',
  ManualBlock = 'manual_block',
  ParseFailureTransient = 'parse_failure_transient',
}

@Entity('feed_condition_type')
export class FeedConditionType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH })
  condition_key!: FeedConditionTypeKeyEnum;

  @OneToMany('FeedCondition', (feed_condition: FeedCondition) => feed_condition.feed_condition_type)
  feed_conditions!: FeedCondition[];
}

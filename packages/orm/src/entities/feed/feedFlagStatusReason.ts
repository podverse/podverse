import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import type { Feed } from './feed.js';

export enum FeedFlagStatusReasonEnum {
  Copyright = 1,
  IllegalContent = 2,
  Spam = 3,
  Malware = 4,
  DeadFeed = 5,
  OwnerRequest = 6,
  Other = 7,
}

@Entity('feed_flag_status_reason')
export class FeedFlagStatusReason {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  reason!: string;

  @OneToMany('Feed', (feed: Feed) => feed.feed_flag_status_reason)
  feeds!: Feed[];
}

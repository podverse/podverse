import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import type { Feed } from './feed.js';

export enum FeedFlagStatusStatusEnum {
  Active = 1,
  AlwaysParse = 2,
  Spam = 3,
  PendingArchive = 4,
  Archived = 5,
  Takedown = 6,
  SpamPermitted = 7,
}

@Entity('feed_flag_status')
export class FeedFlagStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: FeedFlagStatusStatusEnum,
    default: FeedFlagStatusStatusEnum.Active,
  })
  status!: FeedFlagStatusStatusEnum;

  @OneToMany('Feed', (feed: Feed) => feed.feed_flag_status)
  feeds!: Feed[];
}

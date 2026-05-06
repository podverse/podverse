import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Matches seeded rows in `feed_takedown_reason`. */
export enum FeedTakedownReasonEnum {
  Copyright = 1,
  IllegalContent = 2,
  Spam = 3,
  Malware = 4,
  DeadFeed = 5,
  OwnerRequest = 6,
  Other = 7,
}

@Entity('feed_takedown_reason')
export class FeedTakedownReason {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', unique: true })
  reason!: string;
}

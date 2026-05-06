import { FEED_LIFECYCLE_STATE_KEY_MAX_LENGTH } from '@orm/lib/feedLifecycleLimits.js';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum FeedLifecycleStateKeyEnum {
  Active = 'active',
  PendingArchive = 'pending_archive',
  Archived = 'archived',
  Takedown = 'takedown',
}

@Entity('feed_lifecycle_state_type')
export class FeedLifecycleStateType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: FEED_LIFECYCLE_STATE_KEY_MAX_LENGTH })
  state_key!: FeedLifecycleStateKeyEnum;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @Column({ type: 'timestamp' })
  updated_at!: Date;
}

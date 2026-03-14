import type { Account } from '@orm/entities/account/account.js';
import type { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stats_track_event_account')
export class StatsTrackEventAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('StatsTrackAccountGuid', (accountGuid: StatsTrackAccountGuid) => accountGuid.id)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: Relation<StatsTrackAccountGuid>;

  @ManyToOne('Account', (account: Account) => account.id)
  @JoinColumn({ name: 'tracked_account_id' })
  tracked_account!: Relation<Account>;

  @Column()
  tracked_account_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}

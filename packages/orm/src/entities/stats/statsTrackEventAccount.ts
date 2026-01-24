import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { StatsTrackAccountGuid } from '@orm/entities/stats/statsTrackAccountGuid';
import { Account } from '@orm/entities/account/account';

@Entity('stats_track_event_account')
export class StatsTrackEventAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => StatsTrackAccountGuid)
  @JoinColumn({ name: 'account_guid' })
  account_guid!: StatsTrackAccountGuid;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'tracked_account_id' })
  tracked_account!: Account;

  @Column()
  tracked_account_id!: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
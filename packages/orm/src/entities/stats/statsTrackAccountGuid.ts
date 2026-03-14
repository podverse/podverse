import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('stats_track_account_guid')
export class StatsTrackAccountGuid {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Account', (account: Account) => account.id)
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column('uuid')
  account_guid!: string;

  @CreateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}

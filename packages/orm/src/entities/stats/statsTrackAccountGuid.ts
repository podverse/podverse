import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { Account } from '@orm/entities/account/account.js';

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

import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}

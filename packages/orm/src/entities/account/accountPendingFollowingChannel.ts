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

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class AccountPendingFollowingChannel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  account_id!: number;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'int', nullable: true })
  podcast_index_id!: number | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url })
  feed_url!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}

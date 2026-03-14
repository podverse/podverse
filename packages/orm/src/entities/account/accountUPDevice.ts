import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity('account_up_device')
export class AccountUPDevice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url, unique: true })
  up_endpoint!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_long, nullable: true })
  up_auth_key!: string | null;

  @Column({ unique: true })
  account_id!: number;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_locale })
  locale!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;
}

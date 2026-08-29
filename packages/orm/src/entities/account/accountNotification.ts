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

import type { NotificationCategoryValues } from '@podverse/helpers';
import { NotificationCategoryEnum } from '@podverse/helpers';

@Entity('account_notification')
export class AccountNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'integer' })
  account_id!: number;

  @Column({ type: 'enum', enum: NotificationCategoryEnum })
  category!: NotificationCategoryValues;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  body?: string | null;

  @Column({ type: 'varchar', nullable: true })
  link_path?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @Column({
    type: 'timestamptz',
    default: () => "(now() + '1 mon'::interval)",
  })
  expires_at!: Date;
}

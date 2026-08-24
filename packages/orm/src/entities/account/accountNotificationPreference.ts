import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import type { NotificationCategoryValues } from '@podverse/helpers';
import { NotificationCategoryEnum } from '@podverse/helpers';

@Entity('account_notification_preference')
@Unique('account_notification_preference_account_id_category_key', ['account_id', 'category'])
export class AccountNotificationPreference {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'integer' })
  account_id!: number;

  @Column({ type: 'enum', enum: NotificationCategoryEnum })
  category!: NotificationCategoryValues;

  @Column({ type: 'boolean', default: true })
  in_app_enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  push_enabled!: boolean;
}

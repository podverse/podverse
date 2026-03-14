import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { AccountSettingsLocale } from './accountSettingsLocale.js';
import type { AccountSettingsNotification } from './accountSettingsNotification.js';

@Entity()
export class AccountSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_id', unique: true })
  account_id!: number;

  @OneToOne('Account', (account: Account) => account.account_settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @OneToOne(
    'AccountSettingsLocale',
    (accountSettingsLocale: AccountSettingsLocale) => accountSettingsLocale.account_settings,
    { cascade: ['insert'] }
  )
  account_settings_locale!: Relation<AccountSettingsLocale>;

  @OneToOne(
    'AccountSettingsNotification',
    (accountSettingsNotification: AccountSettingsNotification) =>
      accountSettingsNotification.account_settings,
    { cascade: ['insert'] }
  )
  account_settings_notification!: Relation<AccountSettingsNotification>;
}

import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { AccountSettings } from './accountSettings.js';

@Entity()
export class AccountSettingsLocale {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_settings_id', unique: true })
  account_settings_id!: number;

  @OneToOne(
    'AccountSettings',
    (accountSettings: AccountSettings) => accountSettings.account_settings_locale,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({ name: 'account_settings_id' })
  account_settings!: Relation<AccountSettings>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_locale, default: 'en-US' })
  locale!: string;
}

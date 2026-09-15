import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { POPULARITY_TRACKING_AGREEMENT_VERSION_MAX_LENGTH } from '@podverse/helpers';

import type { AccountSettingsLocale } from './accountSettingsLocale.js';
import type { AccountSettingsNotification } from './accountSettingsNotification.js';
import type { AccountSettingsPlayback } from './accountSettingsPlayback.js';

@Entity()
export class AccountSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_id', unique: true })
  account_id!: number;

  @Column({ type: 'boolean', name: 'allow_listen_stats', default: false })
  allow_listen_stats!: boolean;

  @Column({ type: 'boolean', name: 'listen_stats_accepted', nullable: true })
  listen_stats_accepted!: boolean | null;

  @Column({
    type: 'varchar',
    length: POPULARITY_TRACKING_AGREEMENT_VERSION_MAX_LENGTH,
    name: 'listen_stats_agreement_version',
    nullable: true,
  })
  listen_stats_agreement_version!: string | null;

  @Column({ type: 'timestamptz', name: 'listen_stats_decided_at', nullable: true })
  listen_stats_decided_at!: Date | null;

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

  @OneToOne(
    'AccountSettingsPlayback',
    (accountSettingsPlayback: AccountSettingsPlayback) => accountSettingsPlayback.account_settings,
    { cascade: ['insert'] }
  )
  account_settings_playback!: Relation<AccountSettingsPlayback>;
}

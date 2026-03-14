import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { AccountSettings } from './accountSettings.js';
import type { AccountSettingsNotificationType } from './accountSettingsNotificationType.js';

@Entity()
export class AccountSettingsNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_settings_id' })
  account_settings_id!: number;

  @OneToOne(
    'AccountSettings',
    (accountSettings: AccountSettings) => accountSettings.account_settings_notification,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'account_settings_id' })
  account_settings!: AccountSettings;

  @OneToMany(
    'AccountSettingsNotificationType',
    (accountSettingsNotificationType: AccountSettingsNotificationType) =>
      accountSettingsNotificationType.account_settings_notification,
    { cascade: ['insert'] }
  )
  account_settings_notification_types!: AccountSettingsNotificationType[];
}

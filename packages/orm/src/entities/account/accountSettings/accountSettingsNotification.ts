import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { AccountSettings } from './accountSettings';
import { AccountSettingsNotificationType } from './accountSettingsNotificationType';

@Entity()
export class AccountSettingsNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_settings_id' })
  account_settings_id!: number;

  @OneToOne(
    () => AccountSettings,
    (accountSettings) => accountSettings.account_settings_notification,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'account_settings_id' })
  account_settings!: AccountSettings;

  @OneToMany(
    () => AccountSettingsNotificationType,
    (accountSettingsNotificationType) =>
      accountSettingsNotificationType.account_settings_notification,
    { cascade: ['insert'] }
  )
  account_settings_notification_types!: AccountSettingsNotificationType[];
}

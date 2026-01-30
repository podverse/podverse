import { AccountNotificationTypeEnum } from '@podverse/helpers';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AccountSettingsNotification } from './accountSettingsNotification';

@Entity('account_settings_notification_type')
export class AccountSettingsNotificationType {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'type', type: 'enum', enum: AccountNotificationTypeEnum })
  type!: AccountNotificationTypeEnum;

  @ManyToOne(
    () => AccountSettingsNotification,
    (accountSettingsNotification) =>
      accountSettingsNotification.account_settings_notification_types,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'account_settings_notification_id' })
  account_settings_notification!: AccountSettingsNotification;

  @Column({ name: 'account_settings_notification_id' })
  account_settings_notification_id!: number;
}

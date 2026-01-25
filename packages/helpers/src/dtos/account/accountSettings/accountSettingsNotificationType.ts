import { AccountNotificationTypeValues } from 'src/lib/accountNotificationType';

export interface DTOAccountSettingsNotificationType {
  id: number;
  account_settings_notification_id?: number;
  type: AccountNotificationTypeValues;
}

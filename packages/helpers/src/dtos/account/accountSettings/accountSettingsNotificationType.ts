import type { AccountNotificationTypeValues } from '../../../lib/accountNotificationType.js';

export interface DTOAccountSettingsNotificationType {
  id: number;
  account_settings_notification_id?: number;
  type: AccountNotificationTypeValues;
}

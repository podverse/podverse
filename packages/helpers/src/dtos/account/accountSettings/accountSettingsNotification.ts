import type { DTOAccountSettingsNotificationType } from './accountSettingsNotificationType.js';

export interface DTOAccountSettingsNotification {
  id: number;
  account_settings_id: number;
  account_settings_notification_types?: DTOAccountSettingsNotificationType[];
}

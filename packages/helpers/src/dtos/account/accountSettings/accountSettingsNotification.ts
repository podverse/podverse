import type { DTOAccountSettingsNotificationType } from './accountSettingsNotificationType.js';

export interface DTOAccountSettingsNotification {
  id: number;
  account_settings_id: number;
  /**
   * Optional because devices hold account snapshots written before the field existed. A snapshot
   * without it must read as off, which is also the server default.
   */
  auto_enable_on_subscribe?: boolean;
  account_settings_notification_types?: DTOAccountSettingsNotificationType[];
}

import type { DTOAccountSettingsLocale } from './accountSettingsLocale.js';
import type { DTOAccountSettingsNotification } from './accountSettingsNotification.js';

export interface DTOAccountSettings {
  id: number;
  account_id: number;
  allow_listen_stats: boolean;
  account_settings_locale: DTOAccountSettingsLocale;
  account_settings_notification?: DTOAccountSettingsNotification;
}

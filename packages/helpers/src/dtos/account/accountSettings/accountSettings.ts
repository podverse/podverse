import type { DTOAccountSettingsLocale } from './accountSettingsLocale.js';
import type { DTOAccountSettingsNotification } from './accountSettingsNotification.js';

export interface DTOAccountSettings {
  id: number;
  account_id: number;
  account_settings_locale: DTOAccountSettingsLocale;
  account_settings_notification?: DTOAccountSettingsNotification;
}

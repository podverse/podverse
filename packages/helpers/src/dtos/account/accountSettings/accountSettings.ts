import type { DTOAccountSettingsLocale } from './accountSettingsLocale.js';
import type { DTOAccountSettingsNotification } from './accountSettingsNotification.js';
import type { DTOAccountSettingsPlayback } from './accountSettingsPlayback.js';

export interface DTOAccountSettings {
  id: number;
  account_id: number;
  allow_listen_stats: boolean;
  account_settings_locale: DTOAccountSettingsLocale;
  account_settings_notification?: DTOAccountSettingsNotification;
  account_settings_playback?: DTOAccountSettingsPlayback;
}

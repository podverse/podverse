import type { DTOAccountSettingsLocale } from './accountSettingsLocale.js';
import type { DTOAccountSettingsNotification } from './accountSettingsNotification.js';
import type { DTOAccountSettingsPlayback } from './accountSettingsPlayback.js';

export interface DTOAccountSettings {
  id: number;
  account_id: number;
  allow_listen_stats: boolean;
  listen_stats_accepted: boolean | null;
  listen_stats_agreement_version: string | null;
  listen_stats_decided_at: string | null;
  account_settings_locale: DTOAccountSettingsLocale;
  account_settings_notification?: DTOAccountSettingsNotification;
  account_settings_playback?: DTOAccountSettingsPlayback;
}

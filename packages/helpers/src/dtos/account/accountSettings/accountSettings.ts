import { DTOAccountSettingsLocale } from './accountSettingsLocale';
import { DTOAccountSettingsNotification } from './accountSettingsNotification';

export interface DTOAccountSettings {
  id: number;
  account_id: number;
  account_settings_locale: DTOAccountSettingsLocale;
  account_settings_notification?: DTOAccountSettingsNotification;
}

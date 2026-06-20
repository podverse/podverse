import type { MediaTypePreference } from '../../../lib/item/itemEnclosure.js';

export interface DTOAccountSettingsPlayback {
  id: number;
  account_settings_id: number;
  preferred_media_type: MediaTypePreference;
}

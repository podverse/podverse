import type { MediaTypePreference } from '@podverse/helpers';
import type { DTOAccount } from '@podverse/helpers/dto';

import { getMobileConfig } from '../config';
import { applyAccountLocaleOverride } from '../i18n';
import { resolveSupportedLocale } from '../i18n/locale';
import { readPlaybackMediaTypePref, writePlaybackMediaTypePref } from '../prefs/preferredMediaType';
import {
  registerFcmDeviceForAccount,
  syncFcmDeviceLocaleIfRegistered,
} from '../push/fcmDeviceSync';
import {
  registerUnifiedPushDeviceForAccount,
  syncUnifiedPushDeviceLocaleIfRegistered,
} from '../push/unifiedPushDeviceSync';
import { createMobileApiRequestService } from './mobileApi';

export type SyncedNotificationType = 'livestream-scheduled' | 'livestream-started' | 'new-item';

type SetAccount = (account: DTOAccount | null) => void;

const isMediaTypePreference = (value: string | undefined): value is MediaTypePreference => {
  return value === 'audio' || value === 'video';
};

const updateAccountWithServerResponse = async (
  account: DTOAccount,
  setAccount: SetAccount
): Promise<void> => {
  setAccount(account);
  await reconcileAccountPrefsFromAccount(account);
};

export const reconcileAccountPrefsFromAccount = async (account: DTOAccount): Promise<void> => {
  const accountPlaybackPref =
    account.account_settings?.account_settings_playback?.preferred_media_type;

  if (isMediaTypePreference(accountPlaybackPref)) {
    const currentPlaybackPref = await readPlaybackMediaTypePref();
    if (currentPlaybackPref !== accountPlaybackPref) {
      await writePlaybackMediaTypePref(accountPlaybackPref);
    }
  }

  await applyAccountLocaleOverride(account.account_settings?.account_settings_locale?.locale);
};

export const runPostAuthAccountSync = async ({
  accessToken,
  account,
}: {
  accessToken: string | null;
  account: DTOAccount;
}): Promise<void> => {
  await reconcileAccountPrefsFromAccount(account);

  const locale = resolveSupportedLocale(account.account_settings?.account_settings_locale?.locale);
  const pushProvider = getMobileConfig().pushProvider;
  try {
    if (pushProvider === 'fcm') {
      await registerFcmDeviceForAccount({ accessToken, locale });
    } else if (pushProvider === 'unifiedpush') {
      await registerUnifiedPushDeviceForAccount({ accessToken, locale });
    }
  } catch (error) {
    if (pushProvider === 'fcm') {
      console.warn('Failed to register FCM device after authentication', error);
    } else if (pushProvider === 'unifiedpush') {
      console.warn('Failed to register UnifiedPush device after authentication', error);
    }
  }
};

export const syncPlaybackPreferenceToAccount = async ({
  accessToken,
  preferredMediaType,
  setAccount,
}: {
  accessToken: string | null;
  preferredMediaType: MediaTypePreference;
  setAccount: SetAccount;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  try {
    const account = await api.reqAccountSettingsPlaybackUpdate({
      preferred_media_type: preferredMediaType,
    });
    await updateAccountWithServerResponse(account, setAccount);
  } catch (error) {
    console.warn('Failed to sync playback preference to account settings', error);
  }
};

export const syncLocaleToAccountSettings = async ({
  accessToken,
  locale,
  setAccount,
}: {
  accessToken: string | null;
  locale: string;
  setAccount: SetAccount;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  try {
    const account = await api.reqAccountSettingsLocaleUpdate({ locale });
    await updateAccountWithServerResponse(account, setAccount);
    const pushProvider = getMobileConfig().pushProvider;
    if (pushProvider === 'fcm') {
      await syncFcmDeviceLocaleIfRegistered({ accessToken, locale });
    } else if (pushProvider === 'unifiedpush') {
      await syncUnifiedPushDeviceLocaleIfRegistered({ accessToken, locale });
    }
  } catch (error) {
    console.warn('Failed to sync locale to account settings', error);
  }
};

export const syncAllowListenStatsToAccountSettings = async ({
  accessToken,
  allowListenStats,
  setAccount,
}: {
  accessToken: string | null;
  allowListenStats: boolean;
  setAccount: SetAccount;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  try {
    const account = await api.reqAccountSettingsListenStatsUpdate({
      allow_listen_stats: allowListenStats,
    });
    await updateAccountWithServerResponse(account, setAccount);
  } catch (error) {
    console.warn('Failed to sync listen-stats setting to account settings', error);
  }
};

export const syncNotificationTypeToAccountSettings = async ({
  accessToken,
  enabled,
  setAccount,
  type,
}: {
  accessToken: string | null;
  enabled: boolean;
  setAccount: SetAccount;
  type: SyncedNotificationType;
}): Promise<void> => {
  if (accessToken === null) {
    return;
  }

  const api = createMobileApiRequestService(accessToken);
  if (api === null) {
    return;
  }

  try {
    const account = enabled
      ? await api.reqAccountSettingsNotificationTypeCreate({ type })
      : await api.reqAccountSettingsNotificationTypeDelete({ type });
    await updateAccountWithServerResponse(account, setAccount);
  } catch (error) {
    console.warn('Failed to sync notification type to account settings', error);
  }
};

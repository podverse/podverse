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
import type { AuthRequestDeps } from './authRequestWithRefresh';
import { requestWithMobileAuthRefreshIfSignedIn } from './authRequestWithRefresh';

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

/**
 * Hand this device's push token to the account.
 *
 * Network-bound, so it belongs to the sync queue rather than to any path a user is waiting on.
 * Errors propagate: the queue records them against the job, which is what puts the failure in front
 * of a support conversation instead of only in a console nobody reads.
 */
export const registerPushDeviceForAccount = async ({
  account,
  auth,
}: {
  account: DTOAccount;
  auth: AuthRequestDeps;
}): Promise<void> => {
  if (auth.accessToken === null) {
    return;
  }

  const locale = resolveSupportedLocale(account.account_settings?.account_settings_locale?.locale);
  const pushProvider = getMobileConfig().pushProvider;

  if (pushProvider === 'fcm') {
    await registerFcmDeviceForAccount({ auth, locale });
  } else if (pushProvider === 'unifiedpush') {
    await registerUnifiedPushDeviceForAccount({ auth, locale });
  }
};

export const syncPlaybackPreferenceToAccount = async ({
  auth,
  preferredMediaType,
  setAccount,
}: {
  auth: AuthRequestDeps;
  preferredMediaType: MediaTypePreference;
  setAccount: SetAccount;
}): Promise<void> => {
  try {
    const account = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
      api.reqAccountSettingsPlaybackUpdate({
        preferred_media_type: preferredMediaType,
      })
    );
    if (account === null) {
      return;
    }
    await updateAccountWithServerResponse(account, setAccount);
  } catch (error) {
    console.warn('Failed to sync playback preference to account settings', error);
  }
};

export const syncLocaleToAccountSettings = async ({
  auth,
  locale,
  setAccount,
}: {
  auth: AuthRequestDeps;
  locale: string;
  setAccount: SetAccount;
}): Promise<void> => {
  try {
    const account = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
      api.reqAccountSettingsLocaleUpdate({ locale })
    );
    if (account === null) {
      return;
    }
    await updateAccountWithServerResponse(account, setAccount);
    const pushProvider = getMobileConfig().pushProvider;
    if (pushProvider === 'fcm') {
      await syncFcmDeviceLocaleIfRegistered({ auth, locale });
    } else if (pushProvider === 'unifiedpush') {
      await syncUnifiedPushDeviceLocaleIfRegistered({ auth, locale });
    }
  } catch (error) {
    console.warn('Failed to sync locale to account settings', error);
  }
};

export const syncAllowListenStatsToAccountSettings = async ({
  accepted,
  auth,
  setAccount,
}: {
  accepted: boolean;
  auth: AuthRequestDeps;
  setAccount: SetAccount;
}): Promise<void> => {
  try {
    const account = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
      api.reqAccountSettingsListenStatsUpdate({
        accepted,
      })
    );
    if (account === null) {
      return;
    }
    await updateAccountWithServerResponse(account, setAccount);
  } catch (error) {
    console.warn('Failed to sync listen-stats setting to account settings', error);
  }
};

export const syncAutoEnableOnSubscribeToAccountSettings = async ({
  auth,
  enabled,
  setAccount,
}: {
  auth: AuthRequestDeps;
  enabled: boolean;
  setAccount: SetAccount;
}): Promise<void> => {
  try {
    const account = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
      api.reqAccountSettingsNotificationUpdate({
        auto_enable_on_subscribe: enabled,
      })
    );
    if (account === null) {
      return;
    }
    await updateAccountWithServerResponse(account, setAccount);
  } catch (error) {
    console.warn('Failed to sync auto-enable-on-subscribe to account settings', error);
    throw error;
  }
};

/**
 * Turn the account's notification row for one channel on or off.
 *
 * Creating the row is what applies the account's type defaults — the server copies them, so the
 * client never has to replay the user's Settings choices per channel. Deleting it removes the
 * channel's types with it, which is why "off" needs no per-type calls.
 *
 * Errors propagate so the caller can tell a membership denial from a failure and show the gate
 * instead of a generic message.
 */
export const syncChannelNotificationEnabled = async ({
  auth,
  channelIdText,
  enabled,
  setAccount,
}: {
  auth: AuthRequestDeps;
  channelIdText: string;
  enabled: boolean;
  setAccount: SetAccount;
}): Promise<void> => {
  const account = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
    enabled
      ? api.reqAccountNotificationChannelCreate({ channel_id_text: channelIdText })
      : api.reqAccountNotificationChannelDelete({ channel_id_text: channelIdText })
  );
  if (account === null) {
    return;
  }
  await updateAccountWithServerResponse(account, setAccount);
};

/**
 * Add or remove one notification type on a channel that already has a notification row.
 *
 * Errors propagate for the same reason as the channel toggle above.
 */
export const syncChannelNotificationType = async ({
  auth,
  channelIdText,
  enabled,
  setAccount,
  type,
}: {
  auth: AuthRequestDeps;
  channelIdText: string;
  enabled: boolean;
  setAccount: SetAccount;
  type: SyncedNotificationType;
}): Promise<void> => {
  const account = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
    enabled
      ? api.reqAccountNotificationChannelTypeCreate({
          channel_id_text: channelIdText,
          type,
        })
      : api.reqAccountNotificationChannelTypeDelete({
          channel_id_text: channelIdText,
          type,
        })
  );
  if (account === null) {
    return;
  }
  await updateAccountWithServerResponse(account, setAccount);
};

export const syncNotificationTypeToAccountSettings = async ({
  auth,
  enabled,
  setAccount,
  type,
}: {
  auth: AuthRequestDeps;
  enabled: boolean;
  setAccount: SetAccount;
  type: SyncedNotificationType;
}): Promise<void> => {
  try {
    const account = await requestWithMobileAuthRefreshIfSignedIn(auth, (api) =>
      enabled
        ? api.reqAccountSettingsNotificationTypeCreate({ type })
        : api.reqAccountSettingsNotificationTypeDelete({ type })
    );
    if (account === null) {
      return;
    }
    await updateAccountWithServerResponse(account, setAccount);
  } catch (error) {
    console.warn('Failed to sync notification type to account settings', error);
    throw error;
  }
};

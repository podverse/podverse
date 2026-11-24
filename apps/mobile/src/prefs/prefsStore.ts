import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UITheme } from '@podverse/design-tokens';
import { ALL_POSSIBLE_THEMES } from '@podverse/design-tokens';
import type { MediaTypePreference } from '@podverse/helpers';
import { DEFAULT_MEDIA_TYPE_PREFERENCE } from '@podverse/helpers';
import type { AuthSessionEndedNotice } from '@podverse/helpers/authSessionNotice';
import { AUTH_SESSION_ENDED_NOTICES } from '@podverse/helpers/authSessionNotice';

const HOME_MEDIA_TYPES = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
  'livestreams',
] as const;

export type HomeMediaType = (typeof HOME_MEDIA_TYPES)[number];
export type PrefBooleanKey = 'aqc.rd' | 'aqc.rp' | 'downloads.auto_delete' | 'offline.mode';
export type PrefKey =
  | 'aqc.rd'
  | 'aqc.rp'
  | 'auth.forced_logout_at'
  | 'auth.forced_logout_notice'
  | 'downloads.auto_delete'
  | 'locale'
  | 'membership.expiry_dismissed_for'
  | 'playback.handoff_dismissed_state'
  | 'boost.sender_name'
  | 'offline.mode'
  | 'pmt'
  | 'preferred_media_type'
  | 'uit';

export type PrefValueMap = {
  'aqc.rd': boolean;
  'aqc.rp': boolean;
  /**
   * When the server last invalidated this device's session, as an ISO timestamp. Set only when the
   * API rejected the credentials, never when the user signed themselves out and never on a network
   * failure, so its presence is proof the user needs to be told they are signed out.
   */
  'auth.forced_logout_at': string;
  /**
   * The server's reason for the pending forced logout. Absent when the 401 named none.
   */
  'auth.forced_logout_notice': AuthSessionEndedNotice;
  'downloads.auto_delete': boolean;
  locale: string;
  /**
   * Dismissal key of the last dismissed expiring-soon notice.
   */
  'membership.expiry_dismissed_for': string;
  /** Declined remote handoff state (`<item-id>::<timestamp-ms>`) for playback prompt suppression. */
  'playback.handoff_dismissed_state': string;
  /**
   * The boost sheet sender name typed on this phone. Empty when they cleared the field. Absent
   * until they type one. Kept across Podverse sign-out.
   */
  'boost.sender_name': string;
  /**
   * User-forced Offline Mode. Device-local only — parks network work and steers UI to downloaded
   * views. Distinct from NetInfo reachability.
   */
  'offline.mode': boolean;
  pmt: MediaTypePreference;
  preferred_media_type: HomeMediaType;
  uit: UITheme;
};

export type PrefSnapshot = { [K in PrefKey]: PrefValueMap[K] | null };

const PREF_KEYS: readonly PrefKey[] = [
  'uit',
  'preferred_media_type',
  'pmt',
  'aqc.rd',
  'aqc.rp',
  'auth.forced_logout_at',
  'auth.forced_logout_notice',
  'locale',
  'downloads.auto_delete',
  'membership.expiry_dismissed_for',
  'playback.handoff_dismissed_state',
  'boost.sender_name',
  'offline.mode',
];

export const DEFAULT_PLAYBACK_MEDIA_TYPE: MediaTypePreference = DEFAULT_MEDIA_TYPE_PREFERENCE;
export const DEFAULT_HOME_MEDIA_TYPE: HomeMediaType = 'podcasts';
export const DEFAULT_DOWNLOAD_AUTO_DELETE = false;
export const DEFAULT_OFFLINE_MODE = false;

const isHomeMediaType = (value: string): value is HomeMediaType => {
  return HOME_MEDIA_TYPES.some((mediaType) => mediaType === value);
};

const isUITheme = (value: string): value is UITheme => {
  return ALL_POSSIBLE_THEMES.some((theme) => theme === value);
};

const isMediaTypePreference = (value: string): value is MediaTypePreference => {
  return value === 'audio' || value === 'video';
};

const isAuthSessionEndedNotice = (value: string): value is AuthSessionEndedNotice => {
  return AUTH_SESSION_ENDED_NOTICES.some((notice) => notice === value);
};

const createEmptySnapshot = (): PrefSnapshot => ({
  'aqc.rd': null,
  'aqc.rp': null,
  'auth.forced_logout_at': null,
  'auth.forced_logout_notice': null,
  'downloads.auto_delete': null,
  locale: null,
  'membership.expiry_dismissed_for': null,
  'playback.handoff_dismissed_state': null,
  'boost.sender_name': null,
  'offline.mode': null,
  pmt: null,
  preferred_media_type: null,
  uit: null,
});

const parseBoolean = (value: string | null): boolean | null => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return null;
};

export function getPref(key: 'aqc.rd'): Promise<boolean | null>;
export function getPref(key: 'aqc.rp'): Promise<boolean | null>;
export function getPref(key: 'auth.forced_logout_at'): Promise<string | null>;
export function getPref(key: 'auth.forced_logout_notice'): Promise<AuthSessionEndedNotice | null>;
export function getPref(key: 'downloads.auto_delete'): Promise<boolean | null>;
export function getPref(key: 'locale'): Promise<string | null>;
export function getPref(key: 'membership.expiry_dismissed_for'): Promise<string | null>;
export function getPref(key: 'playback.handoff_dismissed_state'): Promise<string | null>;
export function getPref(key: 'boost.sender_name'): Promise<string | null>;
export function getPref(key: 'offline.mode'): Promise<boolean | null>;
export function getPref(key: 'pmt'): Promise<MediaTypePreference | null>;
export function getPref(key: 'preferred_media_type'): Promise<HomeMediaType | null>;
export function getPref(key: 'uit'): Promise<UITheme | null>;
export async function getPref(key: PrefKey): Promise<PrefValueMap[PrefKey] | null> {
  const stored = await AsyncStorage.getItem(key);

  if (
    key === 'aqc.rd' ||
    key === 'aqc.rp' ||
    key === 'downloads.auto_delete' ||
    key === 'offline.mode'
  ) {
    return parseBoolean(stored);
  }
  if (
    key === 'auth.forced_logout_at' ||
    key === 'locale' ||
    key === 'membership.expiry_dismissed_for' ||
    key === 'playback.handoff_dismissed_state' ||
    key === 'boost.sender_name'
  ) {
    return stored;
  }
  if (key === 'auth.forced_logout_notice') {
    if (stored === null) {
      return null;
    }
    return isAuthSessionEndedNotice(stored) ? stored : null;
  }
  if (key === 'pmt') {
    if (stored === null) {
      return null;
    }
    return isMediaTypePreference(stored) ? stored : null;
  }
  if (key === 'preferred_media_type') {
    if (stored === null) {
      return null;
    }
    return isHomeMediaType(stored) ? stored : null;
  }
  if (stored === null) {
    return null;
  }
  return isUITheme(stored) ? stored : null;
}

export function setPref(key: 'aqc.rd', value: boolean): Promise<void>;
export function setPref(key: 'aqc.rp', value: boolean): Promise<void>;
export function setPref(key: 'auth.forced_logout_at', value: string): Promise<void>;
export function setPref(
  key: 'auth.forced_logout_notice',
  value: AuthSessionEndedNotice
): Promise<void>;
export function setPref(key: 'downloads.auto_delete', value: boolean): Promise<void>;
export function setPref(key: 'locale', value: string): Promise<void>;
export function setPref(key: 'membership.expiry_dismissed_for', value: string): Promise<void>;
export function setPref(key: 'playback.handoff_dismissed_state', value: string): Promise<void>;
export function setPref(key: 'boost.sender_name', value: string): Promise<void>;
export function setPref(key: 'offline.mode', value: boolean): Promise<void>;
export function setPref(key: 'pmt', value: MediaTypePreference): Promise<void>;
export function setPref(key: 'preferred_media_type', value: HomeMediaType): Promise<void>;
export function setPref(key: 'uit', value: UITheme): Promise<void>;
export async function setPref(key: PrefKey, value: PrefValueMap[PrefKey]): Promise<void> {
  if (
    key === 'aqc.rd' ||
    key === 'aqc.rp' ||
    key === 'downloads.auto_delete' ||
    key === 'offline.mode'
  ) {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
    return;
  }
  if (typeof value === 'string') {
    await AsyncStorage.setItem(key, value);
  }
}

/** Remove a pref entirely, for one-shot markers that must read as absent once consumed. */
export const clearPref = async (key: PrefKey): Promise<void> => {
  await AsyncStorage.removeItem(key);
};

export const hydratePrefs = async (): Promise<PrefSnapshot> => {
  const snapshot = createEmptySnapshot();

  await Promise.all(
    PREF_KEYS.map(async (key) => {
      if (key === 'aqc.rd') {
        snapshot['aqc.rd'] = await getPref('aqc.rd');
        return;
      }
      if (key === 'aqc.rp') {
        snapshot['aqc.rp'] = await getPref('aqc.rp');
        return;
      }
      if (key === 'auth.forced_logout_at') {
        snapshot['auth.forced_logout_at'] = await getPref('auth.forced_logout_at');
        return;
      }
      if (key === 'auth.forced_logout_notice') {
        snapshot['auth.forced_logout_notice'] = await getPref('auth.forced_logout_notice');
        return;
      }
      if (key === 'downloads.auto_delete') {
        snapshot['downloads.auto_delete'] = await getPref('downloads.auto_delete');
        return;
      }
      if (key === 'offline.mode') {
        snapshot['offline.mode'] = await getPref('offline.mode');
        return;
      }
      if (key === 'locale') {
        snapshot.locale = await getPref('locale');
        return;
      }
      if (key === 'membership.expiry_dismissed_for') {
        snapshot['membership.expiry_dismissed_for'] = await getPref(
          'membership.expiry_dismissed_for'
        );
        return;
      }
      if (key === 'playback.handoff_dismissed_state') {
        snapshot['playback.handoff_dismissed_state'] = await getPref(
          'playback.handoff_dismissed_state'
        );
        return;
      }
      if (key === 'boost.sender_name') {
        snapshot['boost.sender_name'] = await getPref('boost.sender_name');
        return;
      }
      if (key === 'pmt') {
        snapshot.pmt = await getPref('pmt');
        return;
      }
      if (key === 'preferred_media_type') {
        snapshot.preferred_media_type = await getPref('preferred_media_type');
        return;
      }
      snapshot.uit = await getPref('uit');
    })
  );

  return snapshot;
};

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UITheme } from '@podverse/design-tokens';
import { ALL_POSSIBLE_THEMES } from '@podverse/design-tokens';
import type { MediaTypePreference } from '@podverse/helpers';
import { DEFAULT_MEDIA_TYPE_PREFERENCE } from '@podverse/helpers';

const HOME_MEDIA_TYPES = ['podcasts', 'episodes', 'clips', 'artists', 'albums', 'tracks'] as const;
const SUBSCRIPTION_FILTERS = ['all', 'addByRss'] as const;

export type HomeMediaType = (typeof HOME_MEDIA_TYPES)[number];
export type SubscriptionListFilter = (typeof SUBSCRIPTION_FILTERS)[number];
export type PrefBooleanKey = 'aqc.rd' | 'aqc.rp' | 'downloads.auto_delete';
export type PrefKey =
  | 'aqc.rd'
  | 'aqc.rp'
  | 'downloads.auto_delete'
  | 'home.subscriptionFilter'
  | 'library.subscriptionFilter'
  | 'locale'
  | 'pmt'
  | 'preferred_media_type'
  | 'uit';

export type PrefValueMap = {
  'aqc.rd': boolean;
  'aqc.rp': boolean;
  'downloads.auto_delete': boolean;
  'home.subscriptionFilter': SubscriptionListFilter;
  'library.subscriptionFilter': SubscriptionListFilter;
  locale: string;
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
  'home.subscriptionFilter',
  'library.subscriptionFilter',
  'locale',
  'downloads.auto_delete',
];

export const DEFAULT_PLAYBACK_MEDIA_TYPE: MediaTypePreference = DEFAULT_MEDIA_TYPE_PREFERENCE;
export const DEFAULT_HOME_MEDIA_TYPE: HomeMediaType = 'podcasts';
export const DEFAULT_SUBSCRIPTION_FILTER: SubscriptionListFilter = 'all';
export const DEFAULT_DOWNLOAD_AUTO_DELETE = false;

const isHomeMediaType = (value: string): value is HomeMediaType => {
  return HOME_MEDIA_TYPES.some((mediaType) => mediaType === value);
};

const isSubscriptionListFilter = (value: string): value is SubscriptionListFilter => {
  return SUBSCRIPTION_FILTERS.some((filter) => filter === value);
};

const isUITheme = (value: string): value is UITheme => {
  return ALL_POSSIBLE_THEMES.some((theme) => theme === value);
};

const isMediaTypePreference = (value: string): value is MediaTypePreference => {
  return value === 'audio' || value === 'video';
};

const createEmptySnapshot = (): PrefSnapshot => ({
  'aqc.rd': null,
  'aqc.rp': null,
  'downloads.auto_delete': null,
  'home.subscriptionFilter': null,
  'library.subscriptionFilter': null,
  locale: null,
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
export function getPref(key: 'downloads.auto_delete'): Promise<boolean | null>;
export function getPref(key: 'home.subscriptionFilter'): Promise<SubscriptionListFilter | null>;
export function getPref(key: 'library.subscriptionFilter'): Promise<SubscriptionListFilter | null>;
export function getPref(key: 'locale'): Promise<string | null>;
export function getPref(key: 'pmt'): Promise<MediaTypePreference | null>;
export function getPref(key: 'preferred_media_type'): Promise<HomeMediaType | null>;
export function getPref(key: 'uit'): Promise<UITheme | null>;
export async function getPref(key: PrefKey): Promise<PrefValueMap[PrefKey] | null> {
  const stored = await AsyncStorage.getItem(key);

  if (key === 'aqc.rd' || key === 'aqc.rp' || key === 'downloads.auto_delete') {
    return parseBoolean(stored);
  }
  if (key === 'home.subscriptionFilter' || key === 'library.subscriptionFilter') {
    if (stored === null) {
      return null;
    }
    return isSubscriptionListFilter(stored) ? stored : null;
  }
  if (key === 'locale') {
    return stored;
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
export function setPref(key: 'downloads.auto_delete', value: boolean): Promise<void>;
export function setPref(
  key: 'home.subscriptionFilter',
  value: SubscriptionListFilter
): Promise<void>;
export function setPref(
  key: 'library.subscriptionFilter',
  value: SubscriptionListFilter
): Promise<void>;
export function setPref(key: 'locale', value: string): Promise<void>;
export function setPref(key: 'pmt', value: MediaTypePreference): Promise<void>;
export function setPref(key: 'preferred_media_type', value: HomeMediaType): Promise<void>;
export function setPref(key: 'uit', value: UITheme): Promise<void>;
export async function setPref(key: PrefKey, value: PrefValueMap[PrefKey]): Promise<void> {
  if (key === 'aqc.rd' || key === 'aqc.rp' || key === 'downloads.auto_delete') {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
    return;
  }
  if (typeof value === 'string') {
    await AsyncStorage.setItem(key, value);
  }
}

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
      if (key === 'downloads.auto_delete') {
        snapshot['downloads.auto_delete'] = await getPref('downloads.auto_delete');
        return;
      }
      if (key === 'home.subscriptionFilter') {
        snapshot['home.subscriptionFilter'] = await getPref('home.subscriptionFilter');
        return;
      }
      if (key === 'library.subscriptionFilter') {
        snapshot['library.subscriptionFilter'] = await getPref('library.subscriptionFilter');
        return;
      }
      if (key === 'locale') {
        snapshot.locale = await getPref('locale');
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

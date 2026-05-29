import type {
  CategoryMappingKeys,
  LiveItemStatus,
  QueryParamsMedium,
  QueryParamsQueueMedium,
} from '@podverse/helpers';
import type {
  QueryParamsHomeSort,
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedMusicType,
  QueryParamsSubscribedPartialSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';

import type { ViewSelectedOption } from '../../components/ViewSelector/ViewSelector';
import {
  COOKIE_CONSENT_MODEL_VERSION,
  normalizeCookieConsentState,
} from '../../lib/cookieConsent/cookieConsentPolicy';
import { clearCookie, readCookie, writeCookie } from '../cookie';
import type { UITheme } from './uiTheme';
import { getDefaultTheme, setUIThemeOnDocument, toUITheme } from './uiTheme';

/*

LocalSettingsState Legend:
  - uit = uiTheme
  - vs = viewSelected
  - seda = serverEnvironmentDisclaimerAccepted
  - aqc = autoQueueConfig
    - rp = repeat
    - rd = random
  - sba = sidebarAccordion (open/closed accordion sections)
  - fd = filterDefaults (per-page filter preferences)
  - metd = membershipExpirationToastDismissed (ISO date string of last dismissal)
  - bfd = boostFormDefaults (per value type: send to creator, send to app, your name)
  - cc = cookieConsent (device-level cookie banner choice)
*/

export type CookieConsentChoice = 'all' | 'essential' | 'none';

export type CookieConsentState = {
  choice: CookieConsentChoice;
  at: string;
  v?: 2;
};

export interface BoostFormDefaultsForValueKey {
  totalAmountToCreator: number;
  totalAmountToApp: number;
  yourName: string;
}

export type BoostFormDefaultsByValueKey = Record<string, BoostFormDefaultsForValueKey>;

export type FilterDefaultsPage =
  | 'home'
  | 'playlists'
  | 'podcasts'
  | 'podcasts-livestreams'
  | 'music-livestreams'
  | 'episodes'
  | 'tracks'
  | 'albums'
  | 'artists'
  | 'clips'
  | 'profiles';

export interface HomeFilterDefaults {
  medium: QueryParamsMedium;
  sort: QueryParamsHomeSort;
}

export interface PlaylistsFilterDefaults {
  type: QueryParamsPlaylistsType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
  medium: QueryParamsQueueMedium;
}

export interface PodcastsFilterDefaults {
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
  category: CategoryMappingKeys | null;
}

export interface EpisodesFilterDefaults {
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
  category: CategoryMappingKeys | null;
}

export interface TracksFilterDefaults {
  type: QueryParamsSubscribedMusicType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
}

export interface AlbumsFilterDefaults {
  type: QueryParamsSubscribedMusicType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
}

export interface ArtistsFilterDefaults {
  type: QueryParamsSubscribedMusicType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
}

export interface ClipsFilterDefaults {
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
  category: CategoryMappingKeys | null;
}

export interface ProfilesFilterDefaults {
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
}

export interface PodcastsLivestreamsFilterDefaults {
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
  category: CategoryMappingKeys | null;
  liveItemType: LiveItemStatus;
}

export interface MusicLivestreamsFilterDefaults {
  type: QueryParamsSubscribedMusicType;
  sort: QueryParamsSubscribedPartialSort;
  range: QueryParamsStatsRange | null;
  liveItemType: LiveItemStatus;
}

export interface FilterDefaults {
  home?: HomeFilterDefaults;
  playlists?: PlaylistsFilterDefaults;
  podcasts?: PodcastsFilterDefaults;
  'podcasts-livestreams'?: PodcastsLivestreamsFilterDefaults;
  'music-livestreams'?: MusicLivestreamsFilterDefaults;
  episodes?: EpisodesFilterDefaults;
  tracks?: TracksFilterDefaults;
  albums?: AlbumsFilterDefaults;
  artists?: ArtistsFilterDefaults;
  clips?: ClipsFilterDefaults;
  profiles?: ProfilesFilterDefaults;
}

export interface SidebarAccordionState {
  podcasts: boolean;
  music: boolean;
  addByRSS: boolean;
  library: boolean;
}

export interface LocalSettingsState {
  uit: UITheme;
  vs: ViewSelectedOption;
  seda: boolean;
  aqc: {
    rp: boolean;
    rd: boolean;
  };
  sba: SidebarAccordionState;
  fd?: Partial<FilterDefaults>;
  metd?: string; // membershipExpirationToastDismissed (ISO date string of last dismissal)
  bfd?: BoostFormDefaultsByValueKey;
  cc?: CookieConsentState;
}

export function handleLocalSettingsUpdate(newState: LocalSettingsState) {
  if (typeof document === 'undefined') {
    return;
  }

  const prev = getParsedLocalSettings();

  if (prev.uit) {
    prev.uit = toUITheme(prev.uit);
  }

  if (!prev.uit || prev.uit !== newState.uit) {
    setUIThemeOnDocument(newState.uit);
  }

  const serialized = encodeURIComponent(JSON.stringify(newState));
  writeCookie('local-settings', serialized);
}

function isStoredCookieConsentChoice(choice: unknown): boolean {
  return (
    choice === 'all' ||
    choice === 'essential' ||
    choice === 'none' ||
    choice === 'features'
  );
}

function isValidCookieConsentState(cc: unknown): cc is CookieConsentState {
  if (typeof cc !== 'object' || cc === null) {
    return false;
  }
  if (!('choice' in cc) || !('at' in cc)) {
    return false;
  }
  const record = cc as { choice: unknown; at: unknown; v?: unknown };
  return isStoredCookieConsentChoice(record.choice) && typeof record.at === 'string';
}

function parseCookieConsentState(cc: unknown): CookieConsentState | undefined {
  if (!isValidCookieConsentState(cc)) {
    return undefined;
  }
  const record = cc as { choice: unknown; at: string; v?: unknown };
  return normalizeCookieConsentState(record);
}

function getDefaultLocalSettings(): LocalSettingsState {
  return {
    uit: getDefaultTheme(),
    vs: 'grid',
    seda: false,
    aqc: {
      rp: false,
      rd: false,
    },
    sba: {
      podcasts: true,
      music: true,
      addByRSS: true,
      library: true,
    },
    fd: {},
    bfd: {},
  };
}

function isValidLocalSettings(settings: unknown): settings is LocalSettingsState {
  const s = settings as Record<string, unknown>;
  if (!s || typeof s !== 'object') {
    return false;
  }
  const aqc = s.aqc as Record<string, unknown> | undefined;
  const sba = s.sba as Record<string, unknown> | undefined;
  return (
    typeof s.uit === 'string' &&
    typeof s.vs === 'string' &&
    typeof s.seda === 'boolean' &&
    typeof aqc === 'object' &&
    aqc !== null &&
    typeof aqc.rp === 'boolean' &&
    typeof aqc.rd === 'boolean' &&
    (sba === undefined ||
      (typeof sba === 'object' &&
        sba !== null &&
        typeof sba.podcasts === 'boolean' &&
        typeof sba.music === 'boolean' &&
        typeof sba.addByRSS === 'boolean' &&
        typeof sba.library === 'boolean')) &&
    (s.fd === undefined || (typeof s.fd === 'object' && s.fd !== null)) &&
    (s.metd === undefined || typeof s.metd === 'string') &&
    (s.bfd === undefined || (typeof s.bfd === 'object' && s.bfd !== null)) &&
    (s.cc === undefined || isValidCookieConsentState(s.cc))
  );
}

export function setCookieConsent(choice: CookieConsentChoice): void {
  const settings = getParsedLocalSettings();
  handleLocalSettingsUpdate({
    ...settings,
    cc: { choice, at: new Date().toISOString(), v: COOKIE_CONSENT_MODEL_VERSION },
  });
}

type CookieStore = { get: (name: string) => { value?: string } | undefined };

export function getParsedLocalSettings(cookieStore?: CookieStore): LocalSettingsState {
  const isServer = typeof document === 'undefined';
  let raw: string | undefined;

  if (isServer) {
    const serverCookie = cookieStore?.get('local-settings');
    raw = serverCookie?.value;
  } else {
    raw = readCookie('local-settings');
  }

  if (!raw) {
    return { ...getDefaultLocalSettings() };
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    const isValid = isValidLocalSettings(parsed);

    if (!isValid) {
      if (isServer) {
        return { ...getDefaultLocalSettings() };
      }
      throw new Error('Invalid local settings format');
    }

    const defaults = getDefaultLocalSettings();
    const cc = parseCookieConsentState(parsed.cc);
    return {
      ...defaults,
      ...parsed,
      sba: {
        ...defaults.sba,
        ...(parsed.sba as Partial<SidebarAccordionState> | undefined),
      },
      bfd: parsed.bfd !== undefined ? (parsed.bfd as BoostFormDefaultsByValueKey) : defaults.bfd,
      cc,
    };
  } catch {
    if (!isServer) {
      clearCookie('local-settings');
      writeCookie('local-settings', encodeURIComponent(JSON.stringify(getDefaultLocalSettings())));
    }
    return { ...getDefaultLocalSettings() };
  }
}

export type FilterDefaultsForPage<T extends FilterDefaultsPage> = T extends 'home'
  ? HomeFilterDefaults
  : T extends 'playlists'
    ? PlaylistsFilterDefaults
    : T extends 'podcasts'
      ? PodcastsFilterDefaults
      : T extends 'podcasts-livestreams'
        ? PodcastsLivestreamsFilterDefaults
        : T extends 'music-livestreams'
          ? MusicLivestreamsFilterDefaults
          : T extends 'episodes'
            ? EpisodesFilterDefaults
            : T extends 'tracks'
              ? TracksFilterDefaults
              : T extends 'albums'
                ? AlbumsFilterDefaults
                : T extends 'artists'
                  ? ArtistsFilterDefaults
                  : T extends 'clips'
                    ? ClipsFilterDefaults
                    : never;

export function updateFilterDefaults<T extends FilterDefaultsPage>(
  page: T,
  filters: FilterDefaultsForPage<T>
) {
  const settings = getParsedLocalSettings();
  // Create a shallow copy to avoid mutating the reference
  const newSettings = { ...settings };

  if (!newSettings.fd) {
    newSettings.fd = {};
  }
  (newSettings.fd as Record<FilterDefaultsPage, FilterDefaultsForPage<T>>)[page] = filters;
  handleLocalSettingsUpdate(newSettings);
}

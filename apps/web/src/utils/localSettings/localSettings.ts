import type {
  CategoryMappingKeys,
  MediaTypePreference,
  QueryParamsQueueMedium,
  SortPrefScope,
  SortPrefValue,
} from '@podverse/helpers';
import { buildSortPrefScopeKey, DEFAULT_MEDIA_TYPE_PREFERENCE } from '@podverse/helpers';
import { clearCookie, readCookie, writeCookie } from '@podverse/helpers-browser';
import type {
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
import type { SortPrefStore } from './sortPrefs';
import {
  parseSortPrefStore,
  readSortPrefFromStore,
  touchSortPrefInStore,
  trimSortPrefStoreToFit,
  writeSortPrefIntoStore,
} from './sortPrefs';
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
  - sba = sidebarAccordion (Library accordion open or closed; cookie-backed for SSR on first paint)
  - fd = filterDefaults (per-page filter preferences)
  - metd = dismissal key of the last dismissed expiring-soon notice
  - bfd = boostFormDefaults (per value type: send to creator, send to app, your name)
  - cc = cookieConsent (device-level cookie banner choice)
  - pmt = preferredMediaType (default media player enclosure preference: 'audio' | 'video')
  - sp = sortPrefs (per-instance list preferences, MRU-ordered — see ./sortPrefs.ts)
  - bae = backgroundActivityExpanded (bottom-right activity overlay open;
    collapsed when unset)
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

export interface PlaylistsFilterDefaults {
  type: QueryParamsPlaylistsType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
  medium: QueryParamsQueueMedium;
  /** Absent on an older cookie. Null means the visitor cleared the tag. */
  tag?: string | null;
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

export interface FilterDefaults {
  playlists?: PlaylistsFilterDefaults;
  podcasts?: PodcastsFilterDefaults;
  episodes?: EpisodesFilterDefaults;
  tracks?: TracksFilterDefaults;
  albums?: AlbumsFilterDefaults;
  artists?: ArtistsFilterDefaults;
  clips?: ClipsFilterDefaults;
  profiles?: ProfilesFilterDefaults;
  'subscribed-podcasts'?: PodcastsFilterDefaults;
  'subscribed-episodes'?: EpisodesFilterDefaults;
  'subscribed-clips'?: ClipsFilterDefaults;
  'subscribed-artists'?: ArtistsFilterDefaults;
  'subscribed-albums'?: AlbumsFilterDefaults;
  'subscribed-tracks'?: TracksFilterDefaults;
  'browse-playlists'?: PlaylistsFilterDefaults;
  'browse-users'?: ProfilesFilterDefaults;
}

export type FilterDefaultsPage = keyof FilterDefaults;

export interface SidebarAccordionState {
  library: boolean;
}

/** The Library accordion starts open. A saved close in the local-settings cookie (`sba`) stays closed. */
export const DEFAULT_SIDEBAR_ACCORDION_STATE: SidebarAccordionState = { library: true };

function isSidebarAccordionState(value: unknown): value is SidebarAccordionState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('library' in value)) {
    return false;
  }
  return typeof value.library === 'boolean';
}

/** A saved Library flag overrides the expanded default. A missing accordion stays expanded. */
function resolveSidebarAccordion(stored: unknown): SidebarAccordionState {
  return {
    library: isSidebarAccordionState(stored) ? stored.library : true,
  };
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
  metd?: string; // dismissal key of the last dismissed expiring-soon notice
  bfd?: BoostFormDefaultsByValueKey;
  cc?: CookieConsentState;
  pmt?: MediaTypePreference; // preferredMediaType (default media player enclosure preference)
  sp?: SortPrefStore; // sortPrefs (per-instance list preferences, MRU-ordered)
  bae?: boolean; // backgroundActivityExpanded
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

function isCookieConsentObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCookieConsentState(cc: unknown): CookieConsentState | undefined {
  if (!isCookieConsentObject(cc)) {
    return undefined;
  }
  return normalizeCookieConsentState({
    choice: cc.choice,
    at: cc.at,
    v: cc.v,
  });
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
    sba: { ...DEFAULT_SIDEBAR_ACCORDION_STATE },
    fd: {},
    bfd: {},
    pmt: DEFAULT_MEDIA_TYPE_PREFERENCE,
    sp: [],
    bae: false,
  };
}

function isValidMediaTypePreference(pmt: unknown): pmt is MediaTypePreference {
  return pmt === 'audio' || pmt === 'video';
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
        (sba.library === undefined || typeof sba.library === 'boolean'))) &&
    (s.fd === undefined || (typeof s.fd === 'object' && s.fd !== null)) &&
    (s.metd === undefined || typeof s.metd === 'string') &&
    (s.bfd === undefined || (typeof s.bfd === 'object' && s.bfd !== null)) &&
    (s.cc === undefined || isCookieConsentObject(s.cc)) &&
    (s.pmt === undefined || isValidMediaTypePreference(s.pmt)) &&
    (s.bae === undefined || typeof s.bae === 'boolean')
  );
}

export function setCookieConsent(choice: CookieConsentChoice): void {
  const settings = getParsedLocalSettings();
  handleLocalSettingsUpdate({
    ...settings,
    cc: { choice, at: new Date().toISOString(), v: COOKIE_CONSENT_MODEL_VERSION },
  });
}

export function setPreferredMediaType(pmt: MediaTypePreference): void {
  const settings = getParsedLocalSettings();
  handleLocalSettingsUpdate({
    ...settings,
    pmt,
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
      sba: resolveSidebarAccordion(parsed.sba),
      bfd: parsed.bfd !== undefined ? (parsed.bfd as BoostFormDefaultsByValueKey) : defaults.bfd,
      cc,
      // Sanitized rather than validated: a hand-edited or outdated entry should cost that one
      // screen its memory, not invalidate the cookie and reset the user's theme along with it.
      sp: parseSortPrefStore(parsed.sp),
    };
  } catch {
    if (!isServer) {
      clearCookie('local-settings');
      writeCookie('local-settings', encodeURIComponent(JSON.stringify(getDefaultLocalSettings())));
    }
    return { ...getDefaultLocalSettings() };
  }
}

export type FilterDefaultsForPage<T extends FilterDefaultsPage> = NonNullable<FilterDefaults[T]>;

/**
 * The `fd` bucket key for a global list, derived by the shared builder.
 *
 * A global list has exactly one instance, so its name is the whole scope. Routing it through the
 * builder rather than indexing `fd` directly is what keeps web and mobile deriving keys the same
 * way, and it rejects a name that could not make a usable key.
 */
function getFilterDefaultsKey<T extends FilterDefaultsPage>(page: T): T | null {
  return buildSortPrefScopeKey({ kind: 'list', name: page }) === page ? page : null;
}

export function getFilterDefaultsForPage<T extends FilterDefaultsPage>(
  settings: LocalSettingsState,
  page: T
): FilterDefaults[T] {
  const key = getFilterDefaultsKey(page);
  return key === null ? undefined : settings.fd?.[key];
}

/**
 * Persist a global list's filter and sort selections.
 *
 * Generic over the page so the stored value is checked against that page's own shape. Lists do
 * not share one control set, and a plain record here would let `albums` be written with a
 * `category` no reader ever looks for.
 */
export function updateFilterDefaults<T extends FilterDefaultsPage>(
  page: T,
  filters: FilterDefaults[T]
) {
  const key = getFilterDefaultsKey(page);
  if (key === null) {
    return;
  }

  const settings = getParsedLocalSettings();
  const fd: FilterDefaults = { ...settings.fd };
  fd[key] = filters;
  handleLocalSettingsUpdate({ ...settings, fd });
}

/**
 * What this instance remembers, or `null` when it has nothing stored.
 *
 * Takes the already-parsed settings so a server render reads the cookie once and answers for
 * whichever scopes the page needs.
 */
export function getStoredSortPref(
  settings: LocalSettingsState,
  scope: SortPrefScope
): SortPrefValue | null {
  return readSortPrefFromStore(settings.sp ?? [], scope);
}

function persistSortPrefStore(settings: LocalSettingsState, store: SortPrefStore): void {
  const trimmed = trimSortPrefStoreToFit(store, (candidate) =>
    encodeURIComponent(JSON.stringify({ ...settings, sp: candidate }))
  );
  handleLocalSettingsUpdate({ ...settings, sp: trimmed });
}

/** Remember a selection for one instance, promoting it to the front of the recency window. */
export function updateStoredSortPref(scope: SortPrefScope, patch: SortPrefValue): void {
  const settings = getParsedLocalSettings();
  persistSortPrefStore(settings, writeSortPrefIntoStore(settings.sp ?? [], scope, patch));
}

/**
 * Mark an instance as recently used, so revisiting a screen keeps it in the window.
 *
 * A no-op when nothing is stored for the scope, which keeps screens the user has never customised
 * from taking a slot away from ones they have.
 */
export function touchStoredSortPref(scope: SortPrefScope): void {
  const settings = getParsedLocalSettings();
  const store = settings.sp ?? [];
  const touched = touchSortPrefInStore(store, scope);
  if (touched === store) {
    return;
  }
  persistSortPrefStore(settings, touched);
}

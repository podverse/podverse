import type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
import {
  buildSortPrefScopeKey,
  mergeSortPrefValue,
  sanitizeSortPrefValue,
} from '@podverse/helpers';

/**
 * Per-instance list preferences, held in the `local-settings` cookie under `sp`.
 *
 * A cookie rather than `localStorage` because list and detail pages fetch with a sort parameter
 * while rendering on the server, and `localStorage` is invisible there. Storing the preference
 * somewhere the server cannot read means the first paint is sorted one way and the client re-sorts
 * it another, which costs a visible reshuffle and a duplicate request.
 *
 * The scope key comes from `@podverse/helpers` so web and mobile derive it the same way. Only the
 * storage differs between the two, which is the point of the split.
 */

/** MRU-first, so position 0 is the most recently used and the tail is what eviction takes. */
type SortPrefStoreEntry = [key: string, value: Record<string, string>];

export type SortPrefStore = SortPrefStoreEntry[];

/**
 * How many instances are remembered at once.
 *
 * Cookies cap at 4KB and ride on every same-origin request, so the store cannot grow with the
 * number of podcasts a user has ever opened. Past the window a page falls back to its documented
 * default, which is correct-but-forgetful rather than stale.
 */
export const SORT_PREF_MAX_ENTRIES = 30;

/**
 * The ceiling for the whole encoded cookie value, under the 4KB browsers enforce.
 *
 * The entry count alone cannot guarantee a writable cookie: `encodeURIComponent` roughly doubles
 * JSON, and the same cookie also carries theme, sidebar state, and the global-list defaults.
 * Trimming against the real serialized length is what makes the store safe regardless of how long
 * the keys and tokens turn out to be.
 */
const MAX_COOKIE_VALUE_LENGTH = 3800;

/**
 * Field names are abbreviated on the way in and expanded on the way out.
 *
 * The rest of this cookie is already abbreviated (`uit`, `vs`, `fd`) for the same reason: every byte
 * here is a byte on every request, and `mediaType` costs five times what `m` does across thirty
 * entries.
 */
const FIELD_SHORT_PAIRS: readonly (readonly [keyof SortPrefValue, string])[] = [
  ['category', 'c'],
  ['filter', 'f'],
  ['mediaType', 'm'],
  ['range', 'r'],
  ['sort', 's'],
  ['tab', 't'],
  ['type', 'y'],
  ['viewMode', 'v'],
];

const expandValue = (stored: unknown): SortPrefValue | null => {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    return null;
  }

  const source: Record<string, unknown> = { ...stored };
  const expanded: Record<string, unknown> = {};
  for (const [field, short] of FIELD_SHORT_PAIRS) {
    if (source[short] !== undefined) {
      expanded[field] = source[short];
    }
  }

  return sanitizeSortPrefValue(expanded);
};

const abbreviateValue = (value: SortPrefValue): Record<string, string> => {
  const abbreviated: Record<string, string> = {};
  for (const [field, short] of FIELD_SHORT_PAIRS) {
    const token = value[field];
    if (token !== undefined) {
      abbreviated[short] = token;
    }
  }
  return abbreviated;
};

/**
 * Read an untrusted stored payload as a store, dropping anything unrecognised.
 *
 * A cookie is user-editable and outlives the build that wrote it, so a malformed entry has to read
 * as "nothing remembered for that screen" rather than reach a data fetch. Order is preserved,
 * because order *is* the recency information.
 */
export const parseSortPrefStore = (raw: unknown): SortPrefStore => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const store: SortPrefStore = [];
  const seenKeys = new Set<string>();

  for (const entry of raw) {
    if (store.length >= SORT_PREF_MAX_ENTRIES) {
      break;
    }
    if (!Array.isArray(entry) || entry.length !== 2) {
      continue;
    }
    const [key, value] = entry;
    if (typeof key !== 'string' || key.length === 0 || seenKeys.has(key)) {
      continue;
    }
    const expanded = expandValue(value);
    if (expanded === null) {
      continue;
    }
    seenKeys.add(key);
    store.push([key, abbreviateValue(expanded)]);
  }

  return store;
};

export const readSortPrefFromStore = (
  store: SortPrefStore,
  scope: SortPrefScope
): SortPrefValue | null => {
  const key = buildSortPrefScopeKey(scope);
  if (key === null) {
    return null;
  }

  const entry = store.find(([storedKey]) => storedKey === key);
  return entry === undefined ? null : expandValue(entry[1]);
};

/**
 * Fold a change in and move the entry to the front.
 *
 * Writing is also what marks an instance as recently used, so the two are one operation — a store
 * that updated a value without promoting it would evict screens the user is actively working in.
 */
export const writeSortPrefIntoStore = (
  store: SortPrefStore,
  scope: SortPrefScope,
  patch: SortPrefValue
): SortPrefStore => {
  const key = buildSortPrefScopeKey(scope);
  if (key === null) {
    return store;
  }

  const existing = store.find(([storedKey]) => storedKey === key);
  const merged = mergeSortPrefValue(
    existing === undefined ? null : expandValue(existing[1]),
    patch
  );
  const withoutKey = store.filter(([storedKey]) => storedKey !== key);

  if (merged === null) {
    return withoutKey;
  }

  const promoted: SortPrefStore = [[key, abbreviateValue(merged)], ...withoutKey];
  return promoted.slice(0, SORT_PREF_MAX_ENTRIES);
};

/**
 * Mark an instance as recently used without changing what it remembers.
 *
 * Opening a screen is use, even when nothing is changed, so a podcast checked every morning must
 * not age out behind thirty one-off visits. Absent keys are left absent: a screen the user has never
 * customised has no preference worth a slot.
 */
export const touchSortPrefInStore = (store: SortPrefStore, scope: SortPrefScope): SortPrefStore => {
  const key = buildSortPrefScopeKey(scope);
  if (key === null || store[0]?.[0] === key) {
    return store;
  }

  const existing = store.find(([storedKey]) => storedKey === key);
  if (existing === undefined) {
    return store;
  }

  return [existing, ...store.filter(([storedKey]) => storedKey !== key)];
};

/**
 * Drop entries from the least recently used end until the finished cookie value fits.
 *
 * The caller serializes, because only it knows what else the cookie is carrying. Without this the
 * entry cap alone could still produce a value the browser refuses to store, which would silently
 * lose the theme and every other setting alongside the preferences.
 */
export const trimSortPrefStoreToFit = (
  store: SortPrefStore,
  serialize: (candidate: SortPrefStore) => string
): SortPrefStore => {
  let candidate = store;
  while (candidate.length > 0 && serialize(candidate).length > MAX_COOKIE_VALUE_LENGTH) {
    candidate = candidate.slice(0, candidate.length - 1);
  }
  return candidate;
};

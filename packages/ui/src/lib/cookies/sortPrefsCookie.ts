import { parseCookieJsonObject, serializeCookieJsonObject } from './cookieJson';

/** Default cookie name; callers may override when reading/writing `document.cookie`. */
export const SORT_PREFS_COOKIE_NAME_DEFAULT = 'podverse_table_sort_prefs';

export type SortDirection = 'asc' | 'desc';

export type SortPrefsEntry = {
  sortBy: string;
  sortOrder: SortDirection;
};

/** Map keyed by list id (path or feature key). */
export type SortPrefsMap = Record<string, SortPrefsEntry>;

function parseEntry(raw: unknown): SortPrefsEntry | null {
  if (raw === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.sortBy !== 'string' || o.sortBy === '') {
    return null;
  }
  if (o.sortOrder !== 'asc' && o.sortOrder !== 'desc') {
    return null;
  }
  return { sortBy: o.sortBy, sortOrder: o.sortOrder };
}

/**
 * Parse the full sort-prefs map from a raw cookie string (pure).
 */
export function readSortPrefsMap(cookieValue: string | undefined): SortPrefsMap {
  const root = parseCookieJsonObject(cookieValue);
  const out: SortPrefsMap = {};
  for (const [listKey, raw] of Object.entries(root)) {
    const entry = parseEntry(raw);
    if (entry !== null) {
      out[listKey] = entry;
    }
  }
  return out;
}

/**
 * Merge a patch for one list key and return a serialized cookie value (pure).
 * Pass `undefined` for cookieValue when no prior cookie exists.
 * Removing sort state: pass `patch.sortBy` as `''` to drop the list key.
 */
export function mergeSortPrefsCookie(
  cookieValue: string | undefined,
  listKey: string,
  patch: Partial<SortPrefsEntry>
): string {
  const map: SortPrefsMap = { ...readSortPrefsMap(cookieValue) };
  const prev = map[listKey];
  const merged: SortPrefsEntry = {
    sortBy: patch.sortBy !== undefined ? patch.sortBy : (prev?.sortBy ?? ''),
    sortOrder: patch.sortOrder !== undefined ? patch.sortOrder : (prev?.sortOrder ?? 'asc'),
  };
  if (merged.sortBy === '') {
    delete map[listKey];
  } else {
    map[listKey] = merged;
  }
  return serializeSortPrefsMap(map);
}

export function serializeSortPrefsMap(map: SortPrefsMap): string {
  return serializeCookieJsonObject(map as Record<string, unknown>);
}

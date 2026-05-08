import type { SortPrefsEntry } from './sortPrefsCookie';
import { mergeSortPrefsCookie } from './sortPrefsCookie';
import type { TableListStateEntry } from './tableListStateCookie';
import { mergeTableListStateCookie } from './tableListStateCookie';

/** Matches table list state cookie max-age in useTableFilterState. */
export const TABLE_LIST_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function readBrowserCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)')
  );
  if (match?.[1] === undefined) {
    return undefined;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
}

export function writeBrowserCookie(name: string, serialized: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(serialized)};path=/;max-age=${TABLE_LIST_COOKIE_MAX_AGE_SECONDS};SameSite=Lax`;
}

/**
 * Reads the named cookie, merges sort prefs for `listKey`, writes back (browser only).
 */
export function mergeSortPrefsInBrowserCookie(
  cookieName: string,
  listKey: string,
  patch: Partial<SortPrefsEntry>
): void {
  const prev = readBrowserCookie(cookieName);
  const serialized = mergeSortPrefsCookie(prev, listKey, patch);
  writeBrowserCookie(cookieName, serialized);
}

/**
 * Reads the named cookie, merges table list state for `listKey`, writes back (browser only).
 */
export function mergeTableListStateInBrowserCookie(
  cookieName: string,
  listKey: string,
  patch: Partial<TableListStateEntry>
): void {
  const prev = readBrowserCookie(cookieName);
  const serialized = mergeTableListStateCookie(prev, listKey, patch);
  writeBrowserCookie(cookieName, serialized);
}

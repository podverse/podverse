import {
  buildAlbumPath,
  buildArtistPath,
  buildEpisodePath,
  buildPodcastPath,
  buildTrackPath,
} from '@podverse/helpers/appRoutes';
import { getChannelRouteKind } from '@podverse/helpers/medium';
import { buildSortPrefScopeKey } from '@podverse/helpers/sortPrefs';

import { carrySortPrefStore, parseSortPrefStore } from '../localSettings/sortPrefs';

export const MERGE_REDIRECT_CHECKED_HEADER = 'x-podverse-merge-checked';

export type MergeChannelRouteKind = 'podcast' | 'album' | 'artist';
export type MergeItemRouteKind = 'episode' | 'track';

export type MergeRedirectRoute =
  | { kind: 'channel'; routeKind: MergeChannelRouteKind; id: string }
  | { kind: 'item'; routeKind: MergeItemRouteKind; id: string }
  | { kind: 'podcast_index'; id: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodePathId(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

export function mergeRedirectRouteFromPath(pathname: string): MergeRedirectRoute | null {
  const detail = /^\/(podcast|album|artist|episode|track)\/([^/]+)$/.exec(pathname);
  const prefix = detail?.[1];
  const rawId = detail?.[2];
  if (prefix && rawId) {
    const id = decodePathId(rawId);
    if (id === null) {
      return null;
    }
    if (prefix === 'episode' || prefix === 'track') {
      return { kind: 'item', routeKind: prefix, id };
    }
    if (prefix === 'podcast' || prefix === 'album' || prefix === 'artist') {
      return { kind: 'channel', routeKind: prefix, id };
    }
  }

  const podcastIndex = /^\/podcast-index\/feed\/([1-9]\d*)$/.exec(pathname);
  const podcastIndexId = podcastIndex?.[1];
  if (podcastIndexId) {
    return { kind: 'podcast_index', id: podcastIndexId };
  }
  return null;
}

export function channelPathForMedium(mediumId: number | null, idText: string): string {
  const kind = getChannelRouteKind(mediumId);
  if (kind === 'album') {
    return buildAlbumPath(idText);
  }
  if (kind === 'artist') {
    return buildArtistPath(idText);
  }
  return buildPodcastPath(idText);
}

export function channelPathForRoute(routeKind: MergeChannelRouteKind, idText: string): string {
  if (routeKind === 'album') {
    return buildAlbumPath(idText);
  }
  if (routeKind === 'artist') {
    return buildArtistPath(idText);
  }
  return buildPodcastPath(idText);
}

export function itemPathForRoute(routeKind: MergeItemRouteKind, idText: string): string {
  return routeKind === 'track' ? buildTrackPath(idText) : buildEpisodePath(idText);
}

export function mediumIdFromChannelBody(body: unknown): number | null {
  if (!isRecord(body)) {
    return null;
  }
  const value = body.medium_id;
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

export function withSearch(path: string, search: string): string {
  if (search.length === 0) {
    return path;
  }
  return `${path}${search.startsWith('?') ? search : `?${search}`}`;
}

export function searchFromParams(searchParams: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      params.append(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') {
          params.append(key, entry);
        }
      }
    }
  }
  const query = params.toString();
  return query.length === 0 ? '' : `?${query}`;
}

function parseSettingsCookie(raw: string): Record<string, unknown> | null {
  const spellings = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) {
      spellings.unshift(decoded);
    }
  } catch {
    // The cookie value is already a JSON object.
  }
  for (const spelling of spellings) {
    try {
      const parsed: unknown = JSON.parse(spelling);
      if (isRecord(parsed)) {
        return parsed;
      }
    } catch {
      // Try the next spelling of the cookie.
    }
  }
  return null;
}

/**
 * Copy the sort entry for the old id onto the survivor id and drop the old key.
 * Returns the JSON to store, or null when the cookie has nothing to move.
 */
export function rewrittenLocalSettingsCookie(
  raw: string | undefined,
  kind: 'channel' | 'item',
  fromIdText: string,
  toIdText: string
): string | null {
  if (raw === undefined || raw.length === 0) {
    return null;
  }
  const fromKey = buildSortPrefScopeKey({ kind, idText: fromIdText });
  const toKey = buildSortPrefScopeKey({ kind, idText: toIdText });
  if (fromKey === null || toKey === null) {
    return null;
  }
  const settings = parseSettingsCookie(raw);
  if (settings === null) {
    return null;
  }
  const store = parseSortPrefStore(settings.sp);
  const next = carrySortPrefStore(store, fromKey, toKey);
  if (next === store) {
    return null;
  }
  settings.sp = next;
  return JSON.stringify(settings);
}

import type { PlaylistsPagePublicOpening, QueryParamsQueueMedium } from '@podverse/helpers';
import { normalizePlaylistTagName } from '@podverse/helpers';
import type {
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';

import type { PlaylistsFilterDefaults } from '../../utils/localSettings/localSettings';
import type { PlaylistsPageDropdownConfigCurrentParams } from './PlaylistsPageDropdownConfig';
import {
  DEFAULT_PLAYLISTS_PAGE_MEDIUM,
  getPlaylistsPageFilterParams,
} from './PlaylistsPageDropdownConfig';

/**
 * Opening filters for /playlists.
 * An explicit URL wins, then a saved choice, then the configured opening.
 * A missing tag is no saved choice. A saved null or blank tag stays cleared.
 */
export type ResolvedPlaylistsPageFilters = PlaylistsPageDropdownConfigCurrentParams & {
  tag: string | null;
};

export function resolvePlaylistsPageFilters(input: {
  isAuthenticated: boolean;
  useEnvTag: boolean;
  url: {
    page: number;
    type: QueryParamsPlaylistsType | null;
    sort: QueryParamsSubscribedFullSort | null;
    range: QueryParamsStatsRange | null;
    medium: QueryParamsQueueMedium | null;
    /** Absent means the param is missing. An empty string means it is present and blank. */
    tag: string | undefined;
  };
  cookie: PlaylistsFilterDefaults | undefined;
  opening: PlaylistsPagePublicOpening;
}): ResolvedPlaylistsPageFilters {
  const type =
    input.url.type ?? input.cookie?.type ?? typeFromOpening(input.opening, input.isAuthenticated);
  const usePublicSort = type === 'public' || !input.isAuthenticated;
  const sort = input.url.sort ?? input.cookie?.sort ?? (usePublicSort ? input.opening.sort : 'a_z');
  const range =
    input.url.range ?? input.cookie?.range ?? (usePublicSort ? input.opening.range : null);
  const medium =
    input.url.medium ??
    input.cookie?.medium ??
    input.opening.medium ??
    DEFAULT_PLAYLISTS_PAGE_MEDIUM;

  return {
    ...getPlaylistsPageFilterParams(
      {
        type,
        sort,
        range,
        medium,
        page: input.url.page,
      },
      input.isAuthenticated
    ),
    tag: resolveTag(input),
  };
}

/**
 * Folded tag sent on a public list.
 * Private and subscribed lists, and an empty or too-long tag, omit the property.
 */
export function playlistQueryTag(
  type: QueryParamsPlaylistsType,
  tag: string | null
): string | undefined {
  if (type !== 'public' || tag === null || tag === '') {
    return undefined;
  }
  const normalized = normalizePlaylistTagName(tag);
  if (!normalized.ok) {
    return undefined;
  }
  return normalized.name;
}

function resolveTag(input: {
  useEnvTag: boolean;
  url: { tag: string | undefined };
  cookie: PlaylistsFilterDefaults | undefined;
  opening: PlaylistsPagePublicOpening;
}): string | null {
  const urlTag = input.url.tag;
  if (urlTag !== undefined) {
    if (urlTag.trim() === '') {
      return null;
    }
    const normalized = normalizePlaylistTagName(urlTag);
    if (normalized.ok) {
      return normalized.name;
    }
    if (normalized.reason === 'empty') {
      return null;
    }
  }

  const cookie = input.cookie;
  if (cookie !== undefined && 'tag' in cookie) {
    const stored = cookie.tag;
    if (stored === null || stored === '') {
      return null;
    }
    if (typeof stored === 'string') {
      const normalized = normalizePlaylistTagName(stored);
      if (normalized.ok) {
        return normalized.name;
      }
    }
  }

  if (input.useEnvTag) {
    return input.opening.tag;
  }
  return null;
}

function typeFromOpening(
  opening: PlaylistsPagePublicOpening,
  isAuthenticated: boolean
): QueryParamsPlaylistsType {
  if (opening.type === 'public') {
    return 'public';
  }
  if (isAuthenticated && (opening.type === 'private' || opening.type === 'private_followed')) {
    return opening.type;
  }
  return isAuthenticated ? 'private' : 'public';
}

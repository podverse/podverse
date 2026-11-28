import type { QueryParamsQueueMedium } from './medium.js';
import { QUERY_PARAMS_QUEUE_MEDIUMS } from './medium.js';
import { normalizePlaylistTagName } from './playlistTag.js';

/**
 * Opening type, medium, sort, range, and tag for /playlists.
 *
 * A blank value is unset. An unknown value is reported and treated as unset.
 * Recent is the opening sort. A range applies only when the sort is top, and a blank range is week.
 * A tag longer than the name limit is reported and treated as unset.
 * A foldable name is stored folded.
 */

export const PLAYLISTS_PAGE_PUBLIC_SORTS = ['recent', 'top'] as const;

export type PlaylistsPagePublicSort = (typeof PLAYLISTS_PAGE_PUBLIC_SORTS)[number];

export const PLAYLISTS_PAGE_RANGES = ['day', 'week', 'month', 'all-time'] as const;

export type PlaylistsPageRange = (typeof PLAYLISTS_PAGE_RANGES)[number];

export const DEFAULT_PLAYLISTS_PAGE_PUBLIC_SORT: PlaylistsPagePublicSort = 'recent';

export const DEFAULT_PLAYLISTS_PAGE_PUBLIC_RANGE: PlaylistsPageRange = 'week';

export const PLAYLISTS_PAGE_TYPES = ['private', 'private_followed', 'public'] as const;

export type PlaylistsPageType = (typeof PLAYLISTS_PAGE_TYPES)[number];

export type PlaylistsPageDefaultField =
  'playlistsSort' | 'playlistsRange' | 'playlistsType' | 'playlistsMedium' | 'playlistsTag';

export type PlaylistsPageDefaultIssue = {
  field: PlaylistsPageDefaultField;
  raw: string;
};

export type PlaylistsPageDefaults = {
  sort: PlaylistsPagePublicSort | null;
  range: PlaylistsPageRange | null;
  type: PlaylistsPageType | null;
  medium: QueryParamsQueueMedium | null;
  tag: string | null;
};

export type PlaylistsPageDefaultEnv = {
  sort?: string;
  range?: string;
  type?: string;
  medium?: string;
  tag?: string;
};

export type PlaylistsPagePublicOpening = {
  sort: PlaylistsPagePublicSort;
  range: PlaylistsPageRange | null;
  type: PlaylistsPageType | null;
  medium: QueryParamsQueueMedium | null;
  tag: string | null;
};

const parseToken = <T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  field: PlaylistsPageDefaultField,
  issues: PlaylistsPageDefaultIssue[]
): T | null => {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') {
    return null;
  }
  const match = allowed.find((value) => value === trimmed);
  if (match === undefined) {
    issues.push({ field, raw: trimmed });
    return null;
  }
  return match;
};

/** Blank stays null. A foldable name is stored folded. A name past the length limit is reported. */
const parseTag = (raw: string | undefined, issues: PlaylistsPageDefaultIssue[]): string | null => {
  const trimmed = raw?.trim() ?? '';
  if (trimmed === '') {
    return null;
  }
  const normalized = normalizePlaylistTagName(trimmed);
  if (normalized.ok) {
    return normalized.name;
  }
  if (normalized.reason === 'too_long') {
    issues.push({ field: 'playlistsTag', raw: trimmed });
  }
  return null;
};

/** Blank fields stay null. Unknown tokens are listed in `issues` and stay null. */
export const parsePlaylistsPageDefaults = (
  env: PlaylistsPageDefaultEnv
): { defaults: PlaylistsPageDefaults; issues: PlaylistsPageDefaultIssue[] } => {
  const issues: PlaylistsPageDefaultIssue[] = [];
  return {
    defaults: {
      sort: parseToken(env.sort, PLAYLISTS_PAGE_PUBLIC_SORTS, 'playlistsSort', issues),
      range: parseToken(env.range, PLAYLISTS_PAGE_RANGES, 'playlistsRange', issues),
      type: parseToken(env.type, PLAYLISTS_PAGE_TYPES, 'playlistsType', issues),
      medium: parseToken(env.medium, QUERY_PARAMS_QUEUE_MEDIUMS, 'playlistsMedium', issues),
      tag: parseTag(env.tag, issues),
    },
    issues,
  };
};

/** Values /playlists opens on. A range is set only for Top. Type, medium, and tag copy through. */
export const playlistsPublicOpening = (
  defaults: PlaylistsPageDefaults
): PlaylistsPagePublicOpening => {
  const sort = defaults.sort ?? DEFAULT_PLAYLISTS_PAGE_PUBLIC_SORT;
  const type = defaults.type;
  const medium = defaults.medium;
  const tag = defaults.tag;
  if (sort !== 'top') {
    return { sort, range: null, type, medium, tag };
  }
  return {
    sort,
    range: defaults.range ?? DEFAULT_PLAYLISTS_PAGE_PUBLIC_RANGE,
    type,
    medium,
    tag,
  };
};

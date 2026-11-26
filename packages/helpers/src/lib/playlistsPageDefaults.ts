/**
 * Opening sort and range for the public playlists page.
 *
 * A blank value is unset. An unknown value is reported and treated as unset.
 * Recent is the opening sort. A range applies only when the sort is top, and a blank range is week.
 */

export const PLAYLISTS_PAGE_PUBLIC_SORTS = ['recent', 'top'] as const;

export type PlaylistsPagePublicSort = (typeof PLAYLISTS_PAGE_PUBLIC_SORTS)[number];

export const PLAYLISTS_PAGE_RANGES = ['day', 'week', 'month', 'all-time'] as const;

export type PlaylistsPageRange = (typeof PLAYLISTS_PAGE_RANGES)[number];

export const DEFAULT_PLAYLISTS_PAGE_PUBLIC_SORT: PlaylistsPagePublicSort = 'recent';

export const DEFAULT_PLAYLISTS_PAGE_PUBLIC_RANGE: PlaylistsPageRange = 'week';

export type PlaylistsPageDefaultField = 'playlistsSort' | 'playlistsRange';

export type PlaylistsPageDefaultIssue = {
  field: PlaylistsPageDefaultField;
  raw: string;
};

export type PlaylistsPageDefaults = {
  sort: PlaylistsPagePublicSort | null;
  range: PlaylistsPageRange | null;
};

export type PlaylistsPageDefaultEnv = {
  sort?: string;
  range?: string;
};

export type PlaylistsPagePublicOpening = {
  sort: PlaylistsPagePublicSort;
  range: PlaylistsPageRange | null;
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

/** Blank fields stay null. Unknown tokens are listed in `issues` and stay null. */
export const parsePlaylistsPageDefaults = (
  env: PlaylistsPageDefaultEnv
): { defaults: PlaylistsPageDefaults; issues: PlaylistsPageDefaultIssue[] } => {
  const issues: PlaylistsPageDefaultIssue[] = [];
  return {
    defaults: {
      sort: parseToken(env.sort, PLAYLISTS_PAGE_PUBLIC_SORTS, 'playlistsSort', issues),
      range: parseToken(env.range, PLAYLISTS_PAGE_RANGES, 'playlistsRange', issues),
    },
    issues,
  };
};

/** Sort and range the public playlists page opens on. A range is set only for Top. */
export const playlistsPublicOpening = (
  defaults: PlaylistsPageDefaults
): PlaylistsPagePublicOpening => {
  const sort = defaults.sort ?? DEFAULT_PLAYLISTS_PAGE_PUBLIC_SORT;
  if (sort !== 'top') {
    return { sort, range: null };
  }
  return {
    sort,
    range: defaults.range ?? DEFAULT_PLAYLISTS_PAGE_PUBLIC_RANGE,
  };
};

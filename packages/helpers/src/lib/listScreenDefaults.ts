/**
 * Opening chip, sort, and view for Home (Subscribed) and Browse.
 *
 * A blank value is unset. An unknown value is reported and treated as unset. Callers apply the
 * screen's own opening choice when a value is unset or names something that screen does not offer.
 */

export const LIST_SCREEN_SORTS = ['a_z', 'recent', 'top'] as const;

export type ListScreenSort = (typeof LIST_SCREEN_SORTS)[number];

export const LIST_SCREEN_VIEWS = ['grid', 'list'] as const;

export type ListScreenView = (typeof LIST_SCREEN_VIEWS)[number];

export const HOME_LIST_SCREEN_CHIPS = [
  'podcasts',
  'episodes',
  'clips',
  'artists',
  'albums',
  'tracks',
  'livestreams',
] as const;

export type HomeListScreenChip = (typeof HOME_LIST_SCREEN_CHIPS)[number];

export const BROWSE_LIST_SCREEN_CHIPS = [...HOME_LIST_SCREEN_CHIPS, 'playlists', 'users'] as const;

export type BrowseListScreenChip = (typeof BROWSE_LIST_SCREEN_CHIPS)[number];

export type ListScreenDefaultField =
  'browseChip' | 'browseSort' | 'browseView' | 'homeChip' | 'homeSort' | 'homeView';

export type ListScreenDefaultIssue = {
  field: ListScreenDefaultField;
  raw: string;
};

export type ListScreenDefaults = {
  browse: {
    chip: BrowseListScreenChip | null;
    sort: ListScreenSort | null;
    view: ListScreenView | null;
  };
  home: {
    chip: HomeListScreenChip | null;
    sort: ListScreenSort | null;
    view: ListScreenView | null;
  };
};

export type ListScreenDefaultEnv = {
  browseChip?: string;
  browseSort?: string;
  browseView?: string;
  homeChip?: string;
  homeSort?: string;
  homeView?: string;
};

const parseToken = <T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  field: ListScreenDefaultField,
  issues: ListScreenDefaultIssue[]
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
export const parseListScreenDefaults = (
  env: ListScreenDefaultEnv
): { defaults: ListScreenDefaults; issues: ListScreenDefaultIssue[] } => {
  const issues: ListScreenDefaultIssue[] = [];
  return {
    defaults: {
      browse: {
        chip: parseToken(env.browseChip, BROWSE_LIST_SCREEN_CHIPS, 'browseChip', issues),
        sort: parseToken(env.browseSort, LIST_SCREEN_SORTS, 'browseSort', issues),
        view: parseToken(env.browseView, LIST_SCREEN_VIEWS, 'browseView', issues),
      },
      home: {
        chip: parseToken(env.homeChip, HOME_LIST_SCREEN_CHIPS, 'homeChip', issues),
        sort: parseToken(env.homeSort, LIST_SCREEN_SORTS, 'homeSort', issues),
        view: parseToken(env.homeView, LIST_SCREEN_VIEWS, 'homeView', issues),
      },
    },
    issues,
  };
};

/**
 * The sort a screen opens on.
 *
 * Browse with nothing set opens on Recent when that chip offers it. Home with nothing set uses
 * `chipDefault`, which is that chip's own opening sort. A configured sort the chip does not offer
 * uses `chipDefault` as well.
 */
export const listScreenSortForOffered = <T extends string>(
  sort: ListScreenSort | null,
  screen: 'browse' | 'home',
  offered: readonly T[],
  chipDefault: T
): T => {
  const desired = sort ?? (screen === 'browse' ? 'recent' : null);
  if (desired === null) {
    return chipDefault;
  }
  return offered.find((option) => option === desired) ?? chipDefault;
};

/** Web layout token. Browse with nothing set opens on the grid. Home with nothing set opens on rows. */
export const listScreenViewToWebRows = (
  view: ListScreenView | null,
  screen: 'browse' | 'home'
): 'grid' | 'rows' => {
  if (view === 'grid') {
    return 'grid';
  }
  if (view === 'list') {
    return 'rows';
  }
  return screen === 'browse' ? 'grid' : 'rows';
};

/** Home's stored sort tokens. `top` is the listen-count order Home calls popularity. */
export const listScreenSortToMobileHomeSort = (
  sort: ListScreenSort
): 'alphabetical' | 'popularity' | 'recent' => {
  if (sort === 'a_z') {
    return 'alphabetical';
  }
  if (sort === 'top') {
    return 'popularity';
  }
  return 'recent';
};

/** Configured chip when this page offers it. Otherwise `fallback`. */
export const resolveListScreenChip = <T extends string>(
  configured: string | null,
  allowed: readonly T[],
  fallback: T
): T => {
  if (configured === null) {
    return fallback;
  }
  return allowed.find((chip) => chip === configured) ?? fallback;
};

import type { QueryParamsQueueMedium } from '@podverse/helpers';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

import {
  getAlbumsPageFilterParams,
  getAlbumsPageSortOptions,
} from '../../app/_media-lists/albums/AlbumsPageDropdownConfig';
import {
  getArtistsPageFilterParams,
  getArtistsPageSortOptions,
} from '../../app/_media-lists/artists/ArtistsPageDropdownConfig';
import {
  getEpisodesPageFilterParams,
  getEpisodesPageSortOptions,
} from '../../app/_media-lists/episodes/EpisodesPageDropdownConfig';
import {
  getPodcastsPageFilterParams,
  getPodcastsPageSortOptions,
} from '../../app/_media-lists/podcasts/PodcastsPageDropdownConfig';
import {
  getTracksPageFilterParams,
  getTracksPageSortOptions,
} from '../../app/_media-lists/tracks/TracksPageDropdownConfig';
import {
  DEFAULT_PLAYLISTS_PAGE_MEDIUM,
  getPlaylistsPageFilterParams,
  getPlaylistsPageSortOptions,
} from '../../app/playlists/PlaylistsPageDropdownConfig';
import {
  getProfilesPageFilterParams,
  getProfilesPageSortOptions,
} from '../../app/profiles/ProfilesPageDropdownConfig';
import type { FilterDefaultsPage } from '../../utils/localSettings/localSettings';
import {
  getFilterDefaultsForPage,
  getParsedLocalSettings,
  updateFilterDefaults,
} from '../../utils/localSettings/localSettings';
import type {
  MediaListChip,
  MediaListChipChrome,
  MediaListChipsPage,
} from '../../utils/mediaListChips';

export type PendingMediaListSort = {
  options: readonly { label: string; value: string }[];
  value: string;
  range: QueryParamsStatsRange | null;
  rangeSort: string | undefined;
  write: (sort: string, range: QueryParamsStatsRange | null) => void;
};

export type PendingMediaListMedium = {
  value: QueryParamsQueueMedium;
  write: (medium: QueryParamsQueueMedium) => void;
};

export type PendingMediaListChrome = {
  category: string | null;
  sort: PendingMediaListSort | null;
  medium: PendingMediaListMedium | null;
};

type ResolveArgs = {
  page: MediaListChipsPage;
  chip: MediaListChip;
  chrome: MediaListChipChrome;
  isValidAuthSession: boolean;
  tFilters: (key: string) => string;
};

type PodcastsFilterPage = 'podcasts' | 'subscribed-podcasts';
type EpisodesFilterPage = 'episodes' | 'subscribed-episodes' | 'clips' | 'subscribed-clips';
type ArtistsFilterPage = 'artists' | 'subscribed-artists';
type AlbumsFilterPage = 'albums' | 'subscribed-albums';
type TracksFilterPage = 'tracks' | 'subscribed-tracks';

function readDefaults<T extends FilterDefaultsPage>(filterPage: T) {
  return getFilterDefaultsForPage(getParsedLocalSettings(), filterPage);
}

function withTopRange(
  sort: string,
  range: QueryParamsStatsRange | null
): QueryParamsStatsRange | null {
  return sort === 'top' ? range : null;
}

function rangeSortOf(options: readonly { value: string }[]): string | undefined {
  return options.find((option) => option.value === 'top')?.value;
}

function isFullSort(sort: string): sort is 'a_z' | 'recent' | 'oldest' | 'top' {
  return sort === 'a_z' || sort === 'recent' || sort === 'oldest' || sort === 'top';
}

function isPartialSort(sort: string): sort is 'recent' | 'oldest' | 'top' {
  return sort === 'recent' || sort === 'oldest' || sort === 'top';
}

function isPodcastsFilterPage(page: FilterDefaultsPage): page is PodcastsFilterPage {
  return page === 'podcasts' || page === 'subscribed-podcasts';
}

function isEpisodesFilterPage(page: FilterDefaultsPage): page is EpisodesFilterPage {
  return (
    page === 'episodes' ||
    page === 'subscribed-episodes' ||
    page === 'clips' ||
    page === 'subscribed-clips'
  );
}

function isArtistsFilterPage(page: FilterDefaultsPage): page is ArtistsFilterPage {
  return page === 'artists' || page === 'subscribed-artists';
}

function isAlbumsFilterPage(page: FilterDefaultsPage): page is AlbumsFilterPage {
  return page === 'albums' || page === 'subscribed-albums';
}

function isTracksFilterPage(page: FilterDefaultsPage): page is TracksFilterPage {
  return page === 'tracks' || page === 'subscribed-tracks';
}

/** Remembered Sort, Categories, and medium for a chip whose list has not arrived. */
export function resolvePendingMediaListChrome({
  page,
  chip,
  chrome,
  isValidAuthSession,
  tFilters,
}: ResolveArgs): PendingMediaListChrome {
  if (!chrome.showSort && !chrome.showPlaylistsMedium) {
    return { category: null, sort: null, medium: null };
  }

  if (page === 'add-by-rss') {
    return {
      category: null,
      medium: null,
      sort: {
        options: [
          { label: tFilters('sort.recent'), value: 'recent' },
          { label: tFilters('sort.oldest'), value: 'oldest' },
        ],
        value: 'recent',
        range: null,
        rangeSort: undefined,
        write: () => undefined,
      },
    };
  }

  const filterPage = chrome.filterDefaultsPage;
  if (filterPage === null) {
    return { category: null, sort: null, medium: null };
  }

  const scope = page === 'browse' ? 'browse' : 'subscribed';

  if (filterPage === 'browse-playlists') {
    const stored = readDefaults(filterPage);
    const resolved = getPlaylistsPageFilterParams(
      {
        type: stored?.type ?? null,
        sort: stored?.sort ?? null,
        range: stored?.range ?? null,
        medium: stored?.medium ?? DEFAULT_PLAYLISTS_PAGE_MEDIUM,
        page: 1,
      },
      isValidAuthSession
    );
    const options = getPlaylistsPageSortOptions({ type: resolved.currentType, tFilters });
    const medium: QueryParamsQueueMedium =
      resolved.currentMedium === 'av' || resolved.currentMedium === 'music'
        ? resolved.currentMedium
        : 'all';
    return {
      category: null,
      medium: {
        value: medium,
        write: (nextMedium) => {
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort: resolved.currentSort,
            range: resolved.currentRange,
            medium: nextMedium,
          });
        },
      },
      sort: {
        options,
        value: resolved.currentSort,
        range: withTopRange(resolved.currentSort, resolved.currentRange),
        rangeSort: rangeSortOf(options),
        write: (sort, range) => {
          if (!isFullSort(sort)) {
            return;
          }
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort,
            range,
            medium: resolved.currentMedium,
          });
        },
      },
    };
  }

  if (filterPage === 'browse-users') {
    const stored = readDefaults(filterPage);
    const resolved = getProfilesPageFilterParams(
      {
        type: stored?.type ?? null,
        sort: stored?.sort ?? null,
        range: stored?.range ?? null,
        page: 1,
      },
      isValidAuthSession,
      'browse'
    );
    const options = getProfilesPageSortOptions({ type: resolved.currentType, tFilters });
    return {
      category: null,
      medium: null,
      sort: {
        options,
        value: resolved.currentSort,
        range: withTopRange(resolved.currentSort, resolved.currentRange),
        rangeSort: rangeSortOf(options),
        write: (sort, range) => {
          if (!isFullSort(sort)) {
            return;
          }
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort,
            range,
          });
        },
      },
    };
  }

  if (chip === 'podcasts' && isPodcastsFilterPage(filterPage)) {
    const stored = readDefaults(filterPage);
    const resolved = getPodcastsPageFilterParams(
      {
        type: stored?.type ?? null,
        sort: stored?.sort ?? null,
        range: stored?.range ?? null,
        category: stored?.category ?? null,
        page: 1,
      },
      isValidAuthSession,
      scope
    );
    const options = getPodcastsPageSortOptions({ type: resolved.currentType, tFilters });
    return {
      category: resolved.currentCategory,
      medium: null,
      sort: {
        options,
        value: resolved.currentSort,
        range: withTopRange(resolved.currentSort, resolved.currentRange),
        rangeSort: rangeSortOf(options),
        write: (sort, range) => {
          if (!isFullSort(sort)) {
            return;
          }
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort,
            range,
            category: resolved.currentCategory,
          });
        },
      },
    };
  }

  if ((chip === 'episodes' || chip === 'clips') && isEpisodesFilterPage(filterPage)) {
    const stored = readDefaults(filterPage);
    const resolved = getEpisodesPageFilterParams(
      {
        type: stored?.type ?? null,
        sort: stored?.sort ?? null,
        range: stored?.range ?? null,
        category: stored?.category ?? null,
        page: 1,
      },
      isValidAuthSession,
      scope
    );
    const options = getEpisodesPageSortOptions(tFilters);
    return {
      category: resolved.currentCategory,
      medium: null,
      sort: {
        options,
        value: resolved.currentSort,
        range: withTopRange(resolved.currentSort, resolved.currentRange),
        rangeSort: rangeSortOf(options),
        write: (sort, range) => {
          if (!isPartialSort(sort)) {
            return;
          }
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort,
            range,
            category: resolved.currentCategory,
          });
        },
      },
    };
  }

  if (chip === 'artists' && isArtistsFilterPage(filterPage)) {
    const stored = readDefaults(filterPage);
    const resolved = getArtistsPageFilterParams(
      {
        type: stored?.type ?? null,
        sort: stored?.sort ?? null,
        range: stored?.range ?? null,
        page: 1,
      },
      isValidAuthSession,
      scope
    );
    const options = getArtistsPageSortOptions({ type: resolved.currentType, tFilters });
    return {
      category: null,
      medium: null,
      sort: {
        options,
        value: resolved.currentSort,
        range: withTopRange(resolved.currentSort, resolved.currentRange),
        rangeSort: rangeSortOf(options),
        write: (sort, range) => {
          if (!isFullSort(sort)) {
            return;
          }
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort,
            range,
          });
        },
      },
    };
  }

  if (chip === 'albums' && isAlbumsFilterPage(filterPage)) {
    const stored = readDefaults(filterPage);
    const resolved = getAlbumsPageFilterParams(
      {
        type: stored?.type ?? null,
        sort: stored?.sort ?? null,
        range: stored?.range ?? null,
        page: 1,
      },
      isValidAuthSession,
      scope
    );
    const options = getAlbumsPageSortOptions({ type: resolved.currentType, tFilters });
    return {
      category: null,
      medium: null,
      sort: {
        options,
        value: resolved.currentSort,
        range: withTopRange(resolved.currentSort, resolved.currentRange),
        rangeSort: rangeSortOf(options),
        write: (sort, range) => {
          if (!isFullSort(sort)) {
            return;
          }
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort,
            range,
          });
        },
      },
    };
  }

  if (chip === 'tracks' && isTracksFilterPage(filterPage)) {
    const stored = readDefaults(filterPage);
    const resolved = getTracksPageFilterParams(
      {
        type: stored?.type ?? null,
        sort: stored?.sort ?? null,
        range: stored?.range ?? null,
        page: 1,
      },
      isValidAuthSession,
      scope
    );
    const options = getTracksPageSortOptions(tFilters);
    return {
      category: null,
      medium: null,
      sort: {
        options,
        value: resolved.currentSort,
        range: withTopRange(resolved.currentSort, resolved.currentRange),
        rangeSort: rangeSortOf(options),
        write: (sort, range) => {
          if (!isPartialSort(sort)) {
            return;
          }
          updateFilterDefaults(filterPage, {
            type: resolved.currentType,
            sort,
            range,
          });
        },
      },
    };
  }

  return { category: null, sort: null, medium: null };
}

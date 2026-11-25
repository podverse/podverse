import { z } from 'zod';

import type { DTOPlaylist, QueryParamsQueueMedium } from '@podverse/helpers';
import { getTotalPages, QUERY_PARAMS_QUEUE_MEDIUMS } from '@podverse/helpers';
import type { ApiListResponse, QueryParamsPlaylists } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_PLAYLISTS_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
} from '@podverse/helpers-requests';

import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';
import { configuredSort } from '../../lib/listScreenDefaults';
import { safeSsrListRequest } from '../../utils/filters/ssrFilterGuards';
import type { PlaylistsFilterDefaults } from '../../utils/localSettings/localSettings';
import { getFilterDefaultsForPage } from '../../utils/localSettings/localSettings';
import type { MediaListSearchParams, MediaListSsr } from '../_media-lists/mediaListSsr';
import { firstMediaListSearchParam } from '../_media-lists/mediaListSsr';
import type { PlaylistsListProps } from './PlaylistsPageClient';
import {
  DEFAULT_PLAYLISTS_PAGE_MEDIUM,
  getPlaylistsPageFilterParams,
} from './PlaylistsPageDropdownConfig';

export const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_PLAYLISTS_TYPE_VALUES).optional().nullable().default(null),
  sort: z.enum(QUERY_PARAMS_SUBSCRIBED_FULL_SORT).optional().nullable().default(null),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
  medium: z.enum(QUERY_PARAMS_QUEUE_MEDIUMS).optional().nullable().default(null),
});

export type PlaylistsPageSearchParams = z.infer<typeof searchParamsSchema>;

type FetchPlaylists = (params: QueryParamsPlaylists) => Promise<ApiListResponse<DTOPlaylist>>;

export type LoadedPlaylistList = {
  playlists: DTOPlaylist[];
  totalPages: number;
  page: number;
  medium: QueryParamsQueueMedium;
  musicFilterVisible: boolean;
  /** Visitor medium kept in the cookie when an empty Music list opened All. */
  rememberedMedium?: QueryParamsQueueMedium;
};

/**
 * One playlist page for the visitor's type, sort, range, and medium.
 * With Music off, an empty Music page loads All at page 1 and keeps the remembered medium.
 * All and Podcasts also check page 1 of Music so the filter can include Music when that page has a row.
 */
export async function loadPlaylistsList(
  fetchPlaylists: FetchPlaylists,
  params: QueryParamsPlaylists
): Promise<LoadedPlaylistList> {
  const musicEnabled = getCatalogConfig().musicEnabled;
  const requestPage = (medium: QueryParamsQueueMedium, page: number) =>
    safeSsrListRequest<DTOPlaylist>(
      () =>
        fetchPlaylists({
          page,
          type: params.type,
          sort: params.sort,
          range: params.range,
          medium,
        }),
      page
    );

  if (musicEnabled) {
    const response = await requestPage(params.medium, params.page);
    return toLoadedPlaylistList(response, params.page, params.medium, true);
  }

  if (params.medium === 'music') {
    const response = await requestPage('music', params.page);
    if (response.data.length > 0) {
      return toLoadedPlaylistList(response, params.page, 'music', true);
    }
    const allResponse = await requestPage('all', 1);
    return toLoadedPlaylistList(allResponse, 1, 'all', false, 'music');
  }

  const [response, musicProbe] = await Promise.all([
    requestPage(params.medium, params.page),
    requestPage('music', 1),
  ]);
  return toLoadedPlaylistList(response, params.page, params.medium, musicProbe.data.length > 0);
}

/** Public playlists for the Browse chip. Type stays public; sort, range, and medium are remembered. */
export async function loadPlaylistsBrowseProps(
  searchParams: MediaListSearchParams,
  ssr: MediaListSsr
): Promise<PlaylistsListProps> {
  const cookieDefaults = getFilterDefaultsForPage(ssr.localSettings, 'browse-playlists');
  const { page, sort, range, medium } = resolveBrowseParams(searchParams, cookieDefaults);
  const { currentPage, currentSort, currentRange, currentMedium } = getPlaylistsPageFilterParams(
    {
      page,
      type: 'public',
      sort,
      range,
      medium,
    },
    ssr.canLoadPrivateSsrData
  );
  const loaded = await loadPlaylistsList(
    (request) => ssr.ssrApiRequestService.reqPlaylistGetMany(request),
    {
      page: currentPage,
      type: 'public',
      sort: currentSort,
      range: currentRange,
      medium: currentMedium,
    }
  );

  return {
    listScope: 'browse',
    initialQueryParams: {
      page: loaded.page,
      type: 'public',
      sort: currentSort,
      range: currentRange,
      medium: loaded.medium,
    },
    musicFilterVisible: loaded.musicFilterVisible,
    rememberedMedium: loaded.rememberedMedium,
    ssrPlaylists: loaded.playlists,
    ssrTotalPages: loaded.totalPages,
  };
}

function toLoadedPlaylistList(
  response: ApiListResponse<DTOPlaylist>,
  page: number,
  medium: QueryParamsQueueMedium,
  musicFilterVisible: boolean,
  rememberedMedium?: QueryParamsQueueMedium
): LoadedPlaylistList {
  return {
    playlists: response.data,
    totalPages: getTotalPages(response.meta.count, response.meta.limit, response.data.length, page),
    page,
    medium,
    musicFilterVisible,
    rememberedMedium,
  };
}

function resolveBrowseParams(
  searchParams: MediaListSearchParams,
  cookieDefaults: PlaylistsFilterDefaults | undefined
) {
  const parsed = searchParamsSchema.safeParse({
    page: firstMediaListSearchParam(searchParams, 'page'),
    sort: firstMediaListSearchParam(searchParams, 'sort'),
    range: firstMediaListSearchParam(searchParams, 'range'),
    medium: firstMediaListSearchParam(searchParams, 'medium'),
  });

  const sort =
    (parsed.success ? parsed.data.sort : null) ??
    cookieDefaults?.sort ??
    configuredSort('browse', QUERY_PARAMS_SUBSCRIBED_FULL_SORT, 'recent');
  const range =
    (parsed.success ? parsed.data.range : null) ??
    cookieDefaults?.range ??
    (sort === 'top' ? 'week' : null);

  return {
    page: parsed.success ? parsed.data.page : 1,
    sort,
    range,
    medium:
      (parsed.success ? parsed.data.medium : null) ??
      cookieDefaults?.medium ??
      DEFAULT_PLAYLISTS_PAGE_MEDIUM,
  };
}

import { cookies } from 'next/headers';

import type { QueryParamsQueueMedium } from '@podverse/helpers';
import type {
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';

import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { guardSubscribedSsrFilter } from '../../utils/filters/ssrFilterGuards';
import type { PlaylistsFilterDefaults } from '../../utils/localSettings/localSettings';
import {
  getFilterDefaultsForPage,
  getParsedLocalSettings,
} from '../../utils/localSettings/localSettings';
import type { PlaylistsPageSearchParams } from './playlistsListSsr';
import { loadPlaylistsList, searchParamsSchema } from './playlistsListSsr';
import { PlaylistsPageClient } from './PlaylistsPageClient';
import {
  DEFAULT_PLAYLISTS_PAGE_MEDIUM,
  getPlaylistsPageFilterParams,
} from './PlaylistsPageDropdownConfig';

export type PlaylistsPageProps = {
  searchParams: Promise<PlaylistsPageSearchParams>;
};

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('playlists');
}

export default async function PlaylistsPage({ searchParams }: PlaylistsPageProps) {
  const { isValidAuthSession, termsAcceptanceRequired, ssrApiRequestService } =
    await getSSRAuthService();
  const canLoadPrivateSsrData = isValidAuthSession && !termsAcceptanceRequired;

  const cookieStore = await cookies();
  const ssrLocalSettings = getParsedLocalSettings(cookieStore);
  const ssrFilterDefaults = getFilterDefaultsForPage(ssrLocalSettings, 'playlists');

  const queryParams = await searchParams;
  const { currentType, currentSort, currentRange, currentMedium, currentPage } =
    await parseSearchParams(queryParams, canLoadPrivateSsrData, ssrFilterDefaults);

  const loaded = await loadPlaylistsList(
    (request) => ssrApiRequestService.reqPlaylistGetMany(request),
    {
      page: currentPage,
      type: currentType,
      sort: currentSort,
      range: currentRange,
      medium: currentMedium,
    }
  );

  return (
    <PlaylistsPageClient
      initialQueryParams={{
        page: loaded.page,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        medium: loaded.medium,
      }}
      musicFilterVisible={loaded.musicFilterVisible}
      rememberedMedium={loaded.rememberedMedium}
      ssrPlaylists={loaded.playlists}
      ssrTotalPages={loaded.totalPages}
    />
  );
}

type ParseSearchParams = {
  currentPage: number;
  currentType: QueryParamsPlaylistsType;
  currentSort: QueryParamsSubscribedFullSort;
  currentRange: QueryParamsStatsRange | null;
  currentMedium: QueryParamsQueueMedium;
};

function parseSearchParams(
  queryParams: PlaylistsPageSearchParams,
  isAuthenticated: boolean,
  cookieDefaults?: PlaylistsFilterDefaults
): ParseSearchParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    const guarded = guardSubscribedSsrFilter({
      isAuthenticated,
      type: cookieDefaults?.type ?? (isAuthenticated ? 'private' : 'public'),
      sort: cookieDefaults?.sort ?? (isAuthenticated ? 'a_z' : 'top'),
      range: cookieDefaults?.range ?? (isAuthenticated ? null : 'week'),
      page: 1,
      fallback: {
        type: 'public',
        sort: 'top',
        range: 'week',
        page: 1,
      },
    });

    return {
      currentPage: guarded.page,
      currentType: guarded.type ?? 'public',
      currentSort: guarded.sort ?? 'top',
      currentRange: guarded.range,
      currentMedium: cookieDefaults?.medium ?? DEFAULT_PLAYLISTS_PAGE_MEDIUM,
    };
  }

  const data = parsed.data;

  const guarded = guardSubscribedSsrFilter({
    isAuthenticated,
    type: data.type ?? cookieDefaults?.type ?? (isAuthenticated ? 'private' : 'public'),
    sort: data.sort ?? cookieDefaults?.sort ?? (isAuthenticated ? 'a_z' : 'top'),
    range: data.range ?? cookieDefaults?.range ?? (isAuthenticated ? null : 'week'),
    page: data.page,
    fallback: {
      type: 'public',
      sort: 'top',
      range: 'week',
      page: 1,
    },
  });

  return getPlaylistsPageFilterParams(
    {
      page: guarded.page,
      type: guarded.type ?? 'public',
      sort: guarded.sort ?? 'top',
      range: guarded.range,
      medium: data.medium ?? cookieDefaults?.medium ?? DEFAULT_PLAYLISTS_PAGE_MEDIUM,
    },
    isAuthenticated
  );
}

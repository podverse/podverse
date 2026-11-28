import { cookies } from 'next/headers';

import type { QueryParamsQueueMedium } from '@podverse/helpers';
import type {
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';

import { getConfig } from '../../config';
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
import { resolvePlaylistsPageFilters } from './resolvePlaylistsPageFilters';

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
  const { currentType, currentSort, currentRange, currentMedium, currentPage, currentTag } =
    await parseSearchParams(queryParams, canLoadPrivateSsrData, ssrFilterDefaults);

  const loaded = await loadPlaylistsList(
    (request) => ssrApiRequestService.reqPlaylistGetMany(request),
    {
      page: currentPage,
      type: currentType,
      sort: currentSort,
      range: currentRange,
      medium: currentMedium,
      tag: currentTag,
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
        tag: currentTag,
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
  currentTag: string | null;
};

function parseSearchParams(
  queryParams: PlaylistsPageSearchParams,
  isAuthenticated: boolean,
  cookieDefaults?: PlaylistsFilterDefaults
): ParseSearchParams {
  const publicOpening = getConfig().public.playlistsPage;
  const parsed = searchParamsSchema.safeParse(queryParams);
  const resolved = resolvePlaylistsPageFilters({
    isAuthenticated,
    useEnvTag: true,
    url: parsed.success
      ? {
          page: parsed.data.page,
          type: parsed.data.type,
          sort: parsed.data.sort,
          range: parsed.data.range,
          medium: parsed.data.medium,
          tag: parsed.data.tag,
        }
      : { page: 1, type: null, sort: null, range: null, medium: null, tag: undefined },
    cookie: cookieDefaults,
    opening: publicOpening,
  });
  const guarded = guardSubscribedSsrFilter({
    isAuthenticated,
    type: resolved.currentType,
    sort: resolved.currentSort,
    range: resolved.currentRange,
    page: resolved.currentPage,
    fallback: {
      type: 'public',
      sort: publicOpening.sort,
      range: publicOpening.range,
      page: 1,
    },
  });

  return {
    currentPage: guarded.page,
    currentType: guarded.type ?? 'public',
    currentSort: guarded.sort ?? publicOpening.sort,
    currentRange: guarded.range,
    currentMedium: resolved.currentMedium,
    currentTag: resolved.tag,
  };
}

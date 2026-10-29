import { z } from 'zod';

import type { DTOItem, QueryParamsMedium } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
} from '@podverse/helpers-requests';

import {
  guardSubscribedSsrFilter,
  safeSsrListRequest,
} from '../../../utils/filters/ssrFilterGuards';
import type { TracksFilterDefaults } from '../../../utils/localSettings/localSettings';
import { getFilterDefaultsForPage } from '../../../utils/localSettings/localSettings';
import type { MediaListScope } from '../../../utils/mediaListChips';
import type { MediaListSearchParams, MediaListSsr } from '../mediaListSsr';
import { firstMediaListSearchParam } from '../mediaListSsr';
import type { TracksListProps } from './TracksPageClient';
import type { TracksPageDropdownConfigCurrentParams } from './TracksPageDropdownConfig';
import { getTracksPageFilterParams } from './TracksPageDropdownConfig';

const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE).optional().nullable().default(null),
  sort: z.enum(QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT).optional().nullable().default(null),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export async function loadTracksListProps(
  scope: MediaListScope,
  searchParams: MediaListSearchParams,
  ssr: MediaListSsr
): Promise<TracksListProps> {
  const cookieDefaults = getFilterDefaultsForPage(
    ssr.localSettings,
    scope === 'subscribed' ? 'subscribed-tracks' : 'tracks'
  );
  const { currentType, currentSort, currentRange, currentPage } = parseSearchParams(
    scope,
    searchParams,
    ssr.canLoadPrivateSsrData,
    cookieDefaults
  );

  const medium: QueryParamsMedium = 'music';
  let ssrItems: DTOItem[] = [];
  let ssrTotalPages = 1;

  // A signed-out subscribed list is account data, so the page shows the sign-in message
  // without asking the server.
  if (scope === 'browse' || ssr.canLoadPrivateSsrData) {
    const response: ApiListResponse<DTOItem> = await safeSsrListRequest(
      () =>
        ssr.ssrApiRequestService.reqItemGetMany({
          page: currentPage,
          medium,
          type: currentType,
          sort: currentSort,
          range: currentRange,
          category: null,
        }),
      currentPage
    );
    ssrItems = response.data;
    ssrTotalPages = getTotalPages(
      response.meta.count,
      response.meta.limit,
      response.data.length,
      currentPage
    );
  }

  return {
    scope,
    initialQueryParams: {
      page: currentPage,
      type: currentType,
      sort: currentSort,
      range: currentRange,
      medium,
    },
    ssrItems,
    ssrTotalPages,
  };
}

function parseSearchParams(
  scope: MediaListScope,
  searchParams: MediaListSearchParams,
  isAuthenticated: boolean,
  cookieDefaults?: TracksFilterDefaults
): TracksPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse({
    page: firstMediaListSearchParam(searchParams, 'page'),
    type: firstMediaListSearchParam(searchParams, 'type'),
    sort: firstMediaListSearchParam(searchParams, 'sort'),
    range: firstMediaListSearchParam(searchParams, 'range'),
  });

  if (scope === 'subscribed') {
    const data = parsed.success ? parsed.data : null;
    return getTracksPageFilterParams(
      {
        page: parsed.success ? parsed.data.page : 1,
        type: data?.type ?? cookieDefaults?.type ?? (isAuthenticated ? 'subscribed' : 'global'),
        sort: data?.sort ?? cookieDefaults?.sort ?? 'recent',
        range: data?.range ?? cookieDefaults?.range ?? null,
      },
      isAuthenticated,
      'subscribed'
    );
  }

  if (!parsed.success) {
    const guarded = guardSubscribedSsrFilter({
      isAuthenticated,
      type: cookieDefaults?.type ?? (isAuthenticated ? 'subscribed' : 'global'),
      sort: cookieDefaults?.sort ?? null,
      range: cookieDefaults?.range ?? null,
      page: 1,
      fallback: {
        type: 'global',
        sort: null,
        range: null,
        page: 1,
      },
    });

    return getTracksPageFilterParams(
      {
        page: guarded.page,
        type: guarded.type ?? 'global',
        sort: guarded.sort,
        range: guarded.range,
      },
      isAuthenticated,
      'browse'
    );
  }

  return getTracksPageFilterParams(
    guardedTracksParams(parsed.data, isAuthenticated, cookieDefaults),
    isAuthenticated,
    'browse'
  );
}

function guardedTracksParams(
  data: SearchParams,
  isAuthenticated: boolean,
  cookieDefaults?: TracksFilterDefaults
) {
  const guarded = guardSubscribedSsrFilter({
    isAuthenticated,
    type: data.type ?? cookieDefaults?.type ?? (isAuthenticated ? 'subscribed' : 'global'),
    sort: data.sort ?? cookieDefaults?.sort ?? null,
    range: data.range ?? cookieDefaults?.range ?? null,
    page: data.page,
    fallback: {
      type: 'global',
      sort: null,
      range: null,
      page: 1,
    },
  });

  return {
    page: guarded.page,
    type: guarded.type ?? 'global',
    sort: guarded.sort,
    range: guarded.range,
  };
}

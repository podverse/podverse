import type { QueryParamsMedium, DTOChannel } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
  QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE,
} from '@podverse/helpers-requests';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { AlbumsPageClient } from './AlbumsPageClient';
import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { guardSubscribedSsrFilter, safeSsrListRequest } from '../../utils/filters/ssrFilterGuards';
import type { AlbumsPageDropdownConfigCurrentParams } from './AlbumsPageDropdownConfig';
import { getAlbumsPageFilterParams } from './AlbumsPageDropdownConfig';
import type { AlbumsFilterDefaults } from '../../utils/localSettings/localSettings';
import { getParsedLocalSettings } from '../../utils/localSettings/localSettings';

const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE).optional().nullable().default(null),
  sort: z.enum(QUERY_PARAMS_SUBSCRIBED_FULL_SORT).optional().nullable().default(null),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type AlbumsPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function AlbumsPage({ searchParams }: AlbumsPageProps) {
  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  const cookieStore = await cookies();
  const ssrLocalSettings = getParsedLocalSettings(cookieStore);
  const ssrFilterDefaults = ssrLocalSettings.fd?.albums;

  const queryParams = await searchParams;
  const { currentType, currentSort, currentRange, currentPage } = await parseSearchParams(
    queryParams,
    isValidAuthSession,
    ssrFilterDefaults
  );

  const medium: QueryParamsMedium = 'music';
  const response: ApiListResponse<DTOChannel> = await safeSsrListRequest(
    () =>
      ssrApiRequestService.reqChannelGetMany({
        page: currentPage,
        medium,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        category: null,
      }),
    currentPage
  );

  const ssrChannels = response.data;
  const ssrTotalPages = getTotalPages(
    response.meta.count,
    response.meta.limit,
    response.data.length,
    currentPage
  );

  return (
    <AlbumsPageClient
      initialQueryParams={{
        page: currentPage,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        medium,
      }}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    />
  );
}

function parseSearchParams(
  queryParams: SearchParams,
  isAuthenticated: boolean,
  cookieDefaults?: AlbumsFilterDefaults
): AlbumsPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    const guarded = guardSubscribedSsrFilter({
      isAuthenticated,
      type: cookieDefaults?.type ?? (isAuthenticated ? 'subscribed' : 'global'),
      sort: cookieDefaults?.sort ?? 'recent',
      range: cookieDefaults?.range ?? null,
      page: 1,
      fallback: {
        type: 'global',
        sort: 'recent',
        range: null,
        page: 1,
      },
    });

    return {
      currentType: guarded.type ?? 'global',
      currentSort: guarded.sort ?? 'recent',
      currentRange: guarded.range,
      currentPage: guarded.page,
    };
  }

  const data = parsed.data;

  const guarded = guardSubscribedSsrFilter({
    isAuthenticated,
    type: data.type ?? cookieDefaults?.type ?? (isAuthenticated ? 'subscribed' : 'global'),
    sort: data.sort ?? cookieDefaults?.sort ?? 'recent',
    range: data.range ?? cookieDefaults?.range ?? null,
    page: data.page,
    fallback: {
      type: 'global',
      sort: 'recent',
      range: null,
      page: 1,
    },
  });

  return getAlbumsPageFilterParams(
    {
      page: guarded.page,
      type: guarded.type ?? 'global',
      sort: guarded.sort ?? 'recent',
      range: guarded.range,
    },
    isAuthenticated
  );
}

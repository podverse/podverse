import { cookies } from 'next/headers';
import z from 'zod';

import type { DTOItem, QueryParamsMedium } from '@podverse/helpers';
import { CATEGORY_MAPPING_KEYS, getTotalPages } from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT,
  QUERY_PARAMS_SUBSCRIBED_TYPE,
} from '@podverse/helpers-requests';

import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { guardSubscribedSsrFilter, safeSsrListRequest } from '../../utils/filters/ssrFilterGuards';
import type { EpisodesFilterDefaults } from '../../utils/localSettings/localSettings';
import {
  getFilterDefaultsForPage,
  getParsedLocalSettings,
} from '../../utils/localSettings/localSettings';
import { EpisodesPageClient } from './EpisodesPageClient';
import type { EpisodesPageDropdownConfigCurrentParams } from './EpisodesPageDropdownConfig';
import { getEpisodesPageFilterParams } from './EpisodesPageDropdownConfig';

const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_SUBSCRIBED_TYPE).optional().nullable().default(null),
  sort: z.enum(QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT).optional().nullable().default(null),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
  category: z
    .enum(CATEGORY_MAPPING_KEYS as [string, ...string[]])
    .optional()
    .nullable()
    .default(null),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type EpisodesPageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('episodes');
}

export default async function EpisodesPage({ searchParams }: EpisodesPageProps) {
  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  const cookieStore = await cookies();
  const ssrLocalSettings = getParsedLocalSettings(cookieStore);
  const ssrFilterDefaults = getFilterDefaultsForPage(ssrLocalSettings, 'episodes');

  const queryParams = await searchParams;
  const { currentType, currentSort, currentRange, currentCategory, currentPage } =
    await parseSearchParams(queryParams, isValidAuthSession, ssrFilterDefaults);

  const medium: QueryParamsMedium = 'av';
  const response: ApiListResponse<DTOItem> = await safeSsrListRequest(
    () =>
      ssrApiRequestService.reqItemGetMany({
        page: currentPage,
        medium,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        category: currentCategory,
      }),
    currentPage
  );

  const ssrItems = response.data;
  const ssrTotalPages = getTotalPages(
    response.meta.count,
    response.meta.limit,
    response.data.length,
    currentPage
  );

  return (
    <EpisodesPageClient
      initialQueryParams={{
        page: currentPage,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        category: currentCategory,
        medium,
      }}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
    />
  );
}

function parseSearchParams(
  queryParams: SearchParams,
  isAuthenticated: boolean,
  cookieDefaults?: EpisodesFilterDefaults
): EpisodesPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    const guarded = guardSubscribedSsrFilter({
      isAuthenticated,
      type: cookieDefaults?.type ?? (isAuthenticated ? 'subscribed' : 'global'),
      sort: cookieDefaults?.sort ?? 'recent',
      range: cookieDefaults?.range ?? null,
      category: cookieDefaults?.category ?? null,
      page: 1,
      fallback: {
        type: 'global',
        sort: 'recent',
        range: null,
        category: null,
        page: 1,
      },
    });

    return {
      currentType: guarded.type ?? 'global',
      currentSort: guarded.sort ?? 'recent',
      currentRange: guarded.range,
      currentCategory: guarded.category,
      currentPage: guarded.page,
    };
  }

  const data = parsed.data;

  const guarded = guardSubscribedSsrFilter({
    isAuthenticated,
    type: data.type ?? cookieDefaults?.type ?? (isAuthenticated ? 'subscribed' : 'global'),
    sort: data.sort ?? cookieDefaults?.sort ?? 'recent',
    range: data.range ?? cookieDefaults?.range ?? null,
    category: data.category ?? cookieDefaults?.category ?? null,
    page: data.page,
    fallback: {
      type: 'global',
      sort: 'recent',
      range: null,
      category: null,
      page: 1,
    },
  });

  return getEpisodesPageFilterParams(
    {
      page: guarded.page,
      type: guarded.type ?? 'global',
      sort: guarded.sort ?? 'recent',
      range: guarded.range,
      category: guarded.category,
    },
    isAuthenticated
  );
}

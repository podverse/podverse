import { z } from 'zod';

import type { DTOAccount } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
  QUERY_PARAMS_SUBSCRIBED_TYPE,
} from '@podverse/helpers-requests';

import { safeSsrListRequest } from '../../utils/filters/ssrFilterGuards';
import type { ProfilesFilterDefaults } from '../../utils/localSettings/localSettings';
import { getFilterDefaultsForPage } from '../../utils/localSettings/localSettings';
import type { MediaListSearchParams, MediaListSsr } from '../_media-lists/mediaListSsr';
import { firstMediaListSearchParam } from '../_media-lists/mediaListSsr';
import type { ProfilesListProps } from './ProfilesPageClient';
import { getProfilesPageFilterParams } from './ProfilesPageDropdownConfig';

export const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_SUBSCRIBED_TYPE).optional().nullable().default(null),
  sort: z.enum(QUERY_PARAMS_SUBSCRIBED_FULL_SORT).optional().nullable().default(null),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
});

export type ProfilesPageSearchParams = z.infer<typeof searchParamsSchema>;

/** Global profiles for the Browse chip. Type stays global; sort and range are remembered. */
export async function loadProfilesBrowseProps(
  searchParams: MediaListSearchParams,
  ssr: MediaListSsr
): Promise<ProfilesListProps> {
  const cookieDefaults = getFilterDefaultsForPage(ssr.localSettings, 'browse-users');
  const { page, sort, range } = resolveBrowseParams(searchParams, cookieDefaults);
  const { currentPage, currentSort, currentRange, currentType } = getProfilesPageFilterParams(
    {
      type: 'global',
      sort,
      range,
      page,
    },
    ssr.canLoadPrivateSsrData,
    'browse'
  );

  const response = await safeSsrListRequest<DTOAccount>(
    () =>
      ssr.ssrApiRequestService.reqAccountGetMany({
        type: 'global',
        sort: currentSort,
        range: currentRange,
        page: currentPage,
      }),
    currentPage
  );

  return {
    listScope: 'browse',
    initialQueryParams: {
      page: currentPage,
      type: currentType,
      sort: currentSort,
      range: currentRange,
    },
    ssrAccounts: response.data,
    ssrTotalPages: getTotalPages(
      response.meta.count || response.data.length,
      response.meta.limit || 50,
      response.data.length,
      currentPage
    ),
  };
}

function resolveBrowseParams(
  searchParams: MediaListSearchParams,
  cookieDefaults: ProfilesFilterDefaults | undefined
) {
  const parsed = searchParamsSchema.safeParse({
    page: firstMediaListSearchParam(searchParams, 'page'),
    sort: firstMediaListSearchParam(searchParams, 'sort'),
    range: firstMediaListSearchParam(searchParams, 'range'),
  });

  if (!parsed.success) {
    return {
      page: 1,
      sort: cookieDefaults?.sort ?? null,
      range: cookieDefaults?.range ?? null,
    };
  }

  return {
    page: parsed.data.page,
    sort: parsed.data.sort ?? cookieDefaults?.sort ?? null,
    range: parsed.data.range ?? cookieDefaults?.range ?? null,
  };
}

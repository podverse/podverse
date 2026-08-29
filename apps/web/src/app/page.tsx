import { cookies } from 'next/headers';
import z from 'zod';

import type { DTOChannel } from '@podverse/helpers';
import { getTotalPages, QUERY_PARAMS_MEDIUMS } from '@podverse/helpers';
import { QUERY_PARAMS_HOME_SORT_VALUES } from '@podverse/helpers-requests';

import { getCuratedStaticPageMetadata } from '../lib/seo/curatedPageMetadata';
import { getSSRAuthService } from '../utils/auth/ssrAuth';
import type { HomeFilterDefaults } from '../utils/localSettings/localSettings';
import {
  getFilterDefaultsForPage,
  getParsedLocalSettings,
} from '../utils/localSettings/localSettings';
import { HomePageClient } from './HomePageClient';
import type { HomePageDropdownConfigCurrentParams } from './HomePageDropdownConfig';
import { getHomePageFilterParams } from './HomePageDropdownConfig';

/**
 * `medium` and `sort` carry no schema default, so an absent parameter stays `undefined` and the
 * stored preference below is reachable. A default applied here would win the `??` chain before the
 * cookie was ever consulted, which is how a remembered home sort gets written and never read.
 */
const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  medium: z.enum(QUERY_PARAMS_MEDIUMS).optional(),
  sort: z.enum(QUERY_PARAMS_HOME_SORT_VALUES).optional(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type HomePageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('home');
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  const cookieStore = await cookies();
  const ssrLocalSettings = getParsedLocalSettings(cookieStore);
  const ssrFilterDefaults = getFilterDefaultsForPage(ssrLocalSettings, 'home');

  const queryParams = await searchParams;
  const { currentPage, currentMedium, currentSort } = await parseSearchParams(
    queryParams,
    ssrFilterDefaults
  );

  let ssrChannels: DTOChannel[] = [];
  let ssrTotalPages = 1;

  if (isValidAuthSession) {
    const response = await ssrApiRequestService.reqChannelGetMany({
      page: currentPage,
      sort: currentSort,
      type: 'subscribed',
      medium: currentMedium,
      range: null,
      category: null,
    });
    ssrChannels = response.data;
    ssrTotalPages = getTotalPages(
      response.meta.count,
      response.meta.limit,
      response.data.length,
      currentPage
    );
  }

  return (
    <HomePageClient
      isValidAuthSession={isValidAuthSession}
      initialQueryParams={{
        page: currentPage,
        medium: currentMedium,
        sort: currentSort,
      }}
      ssrChannels={ssrChannels}
      ssrTotalPages={ssrTotalPages}
    />
  );
}

function parseSearchParams(
  queryParams: SearchParams,
  cookieDefaults?: HomeFilterDefaults
): HomePageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    return {
      currentPage: 1,
      currentMedium: cookieDefaults?.medium ?? 'all',
      currentSort: cookieDefaults?.sort ?? 'recent',
    };
  }

  const data = parsed.data;

  return getHomePageFilterParams({
    page: data.page ?? 1,
    medium: data.medium ?? cookieDefaults?.medium ?? 'all',
    sort: data.sort ?? cookieDefaults?.sort ?? 'recent',
  });
}

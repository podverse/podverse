import { z } from 'zod';

import type { DTOQueue, QueryParamsQueueMedium } from '@podverse/helpers';
import { QUERY_PARAMS_QUEUE_MEDIUMS, resolveQueueListMedium } from '@podverse/helpers';

import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { HistoryPageClient } from './HistoryPageClient';

const searchParamsSchema = z.object({
  medium: z.enum(QUERY_PARAMS_QUEUE_MEDIUMS).optional(),
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type HistoryPageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  const queryParams = await searchParams;
  const { queryMedium, currentPage } = parseSearchParams(queryParams);

  let ssrQueues: DTOQueue[] = [];

  if (isValidAuthSession) {
    const response = await ssrApiRequestService.reqQueueGetAllForAccountPrivate();
    ssrQueues = response;
  }

  const currentMedium = resolveQueueListMedium({ queryMedium, queues: ssrQueues });

  return (
    <HistoryPageClient
      initialQueryParams={{ medium: currentMedium, page: currentPage }}
      ssrQueues={ssrQueues}
    />
  );
}

type ParseSearchParams = {
  queryMedium: QueryParamsQueueMedium | undefined;
  currentPage: number;
};

function parseSearchParams(queryParams: SearchParams): ParseSearchParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    return {
      queryMedium: undefined,
      currentPage: 1,
    };
  }

  const data = parsed.data;

  return { queryMedium: data.medium, currentPage: data.page };
}

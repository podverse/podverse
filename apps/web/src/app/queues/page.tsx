import { z } from 'zod';

import type { DTOQueue, QueryParamsQueueMedium } from '@podverse/helpers';
import { QUERY_PARAMS_QUEUE_MEDIUMS, resolveQueueListMedium } from '@podverse/helpers';

import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { getSSRAuthService } from '../../utils/auth/ssrAuth';
import { QueuesPageClient } from './QueuesPageClient';

const searchParamsSchema = z.object({
  medium: z.enum(QUERY_PARAMS_QUEUE_MEDIUMS).optional(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type QueuePageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function QueuesPage({ searchParams }: QueuePageProps) {
  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  const queryParams = await searchParams;
  const queryMedium = parseQueryMedium(queryParams);

  let ssrQueues: DTOQueue[] = [];

  if (isValidAuthSession) {
    const response = await ssrApiRequestService.reqQueueGetAllForAccountPrivate();
    ssrQueues = response;
  }

  const currentMedium = resolveQueueListMedium({ queryMedium, queues: ssrQueues });

  return <QueuesPageClient initialQueryParams={{ medium: currentMedium }} ssrQueues={ssrQueues} />;
}

function parseQueryMedium(queryParams: SearchParams): QueryParamsQueueMedium | undefined {
  const parsed = searchParamsSchema.safeParse(queryParams);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data.medium;
}

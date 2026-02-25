import type { DTOQueue, QueryParamsQueueMedium } from '@podverse/helpers';
import { QUERY_PARAMS_QUEUE_MEDIUMS } from '@podverse/helpers';
import { z } from 'zod';
import { QueuesPageClient } from './QueuesPageClient';
import { getSSRAuthService } from '../../utils/auth/ssrAuth';

const searchParamsSchema = z.object({
  medium: z.enum(QUERY_PARAMS_QUEUE_MEDIUMS).optional().default('av'),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type QueuePageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function QueuesPage({ searchParams }: QueuePageProps) {
  const { isValidAuthSession, ssrApiRequestService } = await getSSRAuthService();

  const queryParams = await searchParams;
  const { currentMedium } = await parseSearchParams(queryParams);

  let ssrQueues: DTOQueue[] = [];

  if (isValidAuthSession) {
    const response = await ssrApiRequestService.reqQueueGetAllForAccountPrivate();
    ssrQueues = response;
  }

  return <QueuesPageClient initialQueryParams={{ medium: currentMedium }} ssrQueues={ssrQueues} />;
}

type ParseSearchParams = {
  currentMedium: QueryParamsQueueMedium;
};

function parseSearchParams(queryParams: SearchParams): ParseSearchParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    return {
      currentMedium: 'av',
    };
  }

  const data = parsed.data;

  return { currentMedium: data.medium };
}

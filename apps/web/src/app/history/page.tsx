import { z } from 'zod';

import type { DTOQueue, QueryParamsQueueMedium } from '@podverse/helpers';
import {
  getQueueMediumIdFromType,
  QUERY_PARAMS_QUEUE_MEDIUMS,
  resolveQueueListMedium,
} from '@podverse/helpers';

import {
  libraryMediumTabsVisible,
  musicHistoryHasRows,
  queueListMediumForCatalog,
} from '../../lib/catalog/catalogListMedium';
import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';
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
  const { isValidAuthSession, termsAcceptanceRequired, ssrApiRequestService } =
    await getSSRAuthService();
  const canLoadPrivateSsrData = isValidAuthSession && !termsAcceptanceRequired;
  const musicEnabled = getCatalogConfig().musicEnabled;

  const queryParams = await searchParams;
  const { queryMedium, currentPage } = parseSearchParams(queryParams);

  let ssrQueues: DTOQueue[] = [];

  if (canLoadPrivateSsrData) {
    const response = await ssrApiRequestService.reqQueueGetAllForAccountPrivate();
    ssrQueues = response;
  }

  const resolvedMedium = resolveQueueListMedium({ queryMedium, queues: ssrQueues });
  const musicLibraryPresent =
    musicEnabled || !canLoadPrivateSsrData
      ? false
      : await musicHistoryLibraryPresent(ssrApiRequestService, ssrQueues);
  const mediumTabsVisible = libraryMediumTabsVisible({ musicEnabled, musicLibraryPresent });
  const currentMedium = queueListMediumForCatalog(resolvedMedium, mediumTabsVisible);

  return (
    <HistoryPageClient
      initialQueryParams={{ medium: currentMedium, page: currentPage }}
      mediumTabsVisible={mediumTabsVisible}
      ssrQueues={ssrQueues}
    />
  );
}

type QueueRequestService = Awaited<ReturnType<typeof getSSRAuthService>>['ssrApiRequestService'];

async function musicHistoryLibraryPresent(
  ssrApiRequestService: QueueRequestService,
  ssrQueues: readonly DTOQueue[]
): Promise<boolean> {
  const musicMediumId = getQueueMediumIdFromType('music');
  const musicQueue =
    musicMediumId === null
      ? undefined
      : ssrQueues.find((queue) => queue.medium_id === musicMediumId);
  if (musicQueue === undefined) {
    return false;
  }

  const response = await ssrApiRequestService.reqQueueResourcesGetHistoryByQueueIdTextPaginated(
    musicQueue.id_text,
    1
  );
  return musicHistoryHasRows({
    rowCount: response.data.length,
    totalCount: response.meta.count,
  });
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

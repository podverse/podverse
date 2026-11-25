import { z } from 'zod';

import type { DTOQueue, QueryParamsQueueMedium } from '@podverse/helpers';
import {
  getQueueListMediumFromActiveQueues,
  getQueueMediumIdFromType,
  QUERY_PARAMS_QUEUE_MEDIUMS,
  resolveQueueListMedium,
} from '@podverse/helpers';

import {
  libraryMediumTabsVisible,
  musicQueueHasRows,
  queueListMediumForCatalog,
} from '../../lib/catalog/catalogListMedium';
import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';
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
  const { isValidAuthSession, termsAcceptanceRequired, ssrApiRequestService } =
    await getSSRAuthService();
  const canLoadPrivateSsrData = isValidAuthSession && !termsAcceptanceRequired;
  const musicEnabled = getCatalogConfig().musicEnabled;

  const queryParams = await searchParams;
  const queryMedium = parseQueryMedium(queryParams);

  let ssrQueues: DTOQueue[] = [];

  if (canLoadPrivateSsrData) {
    const response = await ssrApiRequestService.reqQueueGetAllForAccountPrivate();
    ssrQueues = response;
  }

  const resolvedMedium = resolveQueueListMedium({ queryMedium, queues: ssrQueues });
  const musicLibraryPresent =
    musicEnabled || !canLoadPrivateSsrData
      ? false
      : await musicQueueLibraryPresent(ssrApiRequestService, ssrQueues);
  const mediumTabsVisible = libraryMediumTabsVisible({ musicEnabled, musicLibraryPresent });
  const currentMedium = queueListMediumForCatalog(resolvedMedium, mediumTabsVisible);

  return (
    <QueuesPageClient
      initialQueryParams={{ medium: currentMedium }}
      mediumTabsVisible={mediumTabsVisible}
      ssrQueues={ssrQueues}
    />
  );
}

type QueueRequestService = Awaited<ReturnType<typeof getSSRAuthService>>['ssrApiRequestService'];

async function musicQueueLibraryPresent(
  ssrApiRequestService: QueueRequestService,
  ssrQueues: readonly DTOQueue[]
): Promise<boolean> {
  const activeQueueIsMusic = getQueueListMediumFromActiveQueues(ssrQueues) === 'music';
  const musicMediumId = getQueueMediumIdFromType('music');
  const musicQueue =
    musicMediumId === null
      ? undefined
      : ssrQueues.find((queue) => queue.medium_id === musicMediumId);
  if (musicQueue === undefined) {
    return activeQueueIsMusic;
  }

  const nowPlaying: unknown =
    await ssrApiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(musicQueue.id_text);
  const upcoming = await ssrApiRequestService.reqQueueResourcesGetAllUpcomingByQueueIdText(
    musicQueue.id_text
  );
  return activeQueueIsMusic || musicQueueHasRows(nowPlaying, upcoming);
}

function parseQueryMedium(queryParams: SearchParams): QueryParamsQueueMedium | undefined {
  const parsed = searchParamsSchema.safeParse(queryParams);
  if (!parsed.success) {
    return undefined;
  }
  return parsed.data.medium;
}

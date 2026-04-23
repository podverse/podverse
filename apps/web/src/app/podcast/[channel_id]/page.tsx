import { z } from 'zod';

import type { DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_CHANNEL_SORT_VALUES,
  QUERY_PARAMS_CHANNEL_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { PodcastPageClient } from './PodcastPageClient';
import type { PodcastPageDropdownConfigCurrentParams } from './PodcastPageDropdownConfig';
import { getPodcastPageFilterParams } from './PodcastPageDropdownConfig';

const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_CHANNEL_TYPE_VALUES).optional().default('episodes'),
  sort: z.enum(QUERY_PARAMS_CHANNEL_SORT_VALUES).optional().default('recent'),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type PodcastPageProps = {
  searchParams: Promise<SearchParams>;
  params: Promise<{ channel_id: string }>;
};

export default async function PodcastPage({ params, searchParams }: PodcastPageProps) {
  const { channel_id } = await params;
  const queryParams = await searchParams;

  const { ssrApiRequestService } = await getSSRAuthService();

  const { currentPage, currentType, currentSort, currentRange } =
    await parseSearchParams(queryParams);

  const ssrChannel = await ssrApiRequestService.reqChannelGetByIdOrIdText(channel_id);

  let ssrItems: DTOItem[] = [];
  let ssrClips: DTOClip[] = [];
  let ssrTotalPages = 1;

  const responseItemSoundbites = await ssrApiRequestService.reqItemSoundbiteGetManyByChannelIdText(
    ssrChannel.id_text,
    {
      page: currentPage,
      sort: currentSort !== 'top' ? currentSort : 'recent',
    }
  );
  const ssrItemSoundbites = responseItemSoundbites.data;
  const ssrHasItemSoundbites = responseItemSoundbites.data.length > 0;

  const ssrItemsWithLiveItem = await ssrApiRequestService.reqLiveItemGetManyByChannel(
    ssrChannel.id_text
  );

  if (currentType === 'clips') {
    ssrClips = [];
  } else if (currentType === 'boosts') {
    ssrTotalPages = 1;
  } else if (currentType === 'soundbites' && currentSort !== 'top') {
    ssrTotalPages = getCurrentTotalPages({ currentType, responseItemSoundbites, currentPage });
  } else {
    const responseItems = await ssrApiRequestService.reqItemGetManyByChannel({
      idOrIdText: ssrChannel.id_text,
      page: currentPage,
      sort: currentSort,
      range: currentRange,
    });

    ssrItems = [...ssrItemsWithLiveItem, ...responseItems.data];
    ssrTotalPages = getCurrentTotalPages({ currentType, responseItems, currentPage });
  }

  let ssrPodroll = null;
  if ((ssrChannel?.channel_podroll?.channel_podroll_remote_items?.length ?? 0) > 0) {
    ssrPodroll = await ssrApiRequestService.reqPodrollGetForChannel(ssrChannel.id_text);
  }

  return (
    <PodcastPageClient
      initialQueryParams={{
        page: currentPage,
        type: currentType,
        sort: currentSort,
        range: currentRange,
      }}
      ssrChannel={ssrChannel}
      ssrItemsWithLiveItem={ssrItemsWithLiveItem}
      ssrItems={ssrItems}
      ssrClips={ssrClips}
      ssrItemSoundbites={ssrItemSoundbites}
      ssrHasItemSoundbites={ssrHasItemSoundbites}
      ssrTotalPages={ssrTotalPages}
      ssrPodroll={ssrPodroll}
    />
  );
}

type GetPodcastCurrentTotalPages = {
  currentType?: string;
  responseItems?: ApiListResponse<DTOItem>;
  responseItemSoundbites?: ApiListResponse<DTOItemSoundbite>;
  responseClips?: ApiListResponse<DTOClip>;
  currentPage: number;
};

const getCurrentTotalPages = ({
  currentType,
  responseItems,
  responseItemSoundbites,
  responseClips,
  currentPage,
}: GetPodcastCurrentTotalPages) => {
  if (currentType === 'soundbites' && responseItemSoundbites) {
    return getTotalPages(
      responseItemSoundbites.meta.count,
      responseItemSoundbites.meta.limit,
      responseItemSoundbites.data.length,
      currentPage
    );
  } else if (currentType === 'clips' && responseClips) {
    return getTotalPages(
      responseClips.meta.count,
      responseClips.meta.limit,
      responseClips.data.length,
      currentPage
    );
  } else if (currentType === 'episodes' && responseItems) {
    return getTotalPages(
      responseItems.meta.count,
      responseItems.meta.limit,
      responseItems.data.length,
      currentPage
    );
  }

  return 1;
};

function parseSearchParams(queryParams: SearchParams): PodcastPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    return {
      currentType: 'episodes',
      currentSort: 'recent',
      currentRange: null,
      currentPage: 1,
    };
  }

  const data = parsed.data;

  return getPodcastPageFilterParams(data);
}

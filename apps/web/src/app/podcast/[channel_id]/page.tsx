import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import type {
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  SortPrefScope,
  SortPrefValue,
} from '@podverse/helpers';
import { buildPodcastPath, getTotalPages } from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_CHANNEL_SORT_VALUES,
  QUERY_PARAMS_CHANNEL_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { getChannelForSeoPage, getChannelHeroImageUrl } from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import {
  hasExplicitControlParams,
  resolveStoredRange,
  resolveStoredToken,
} from '../../../utils/localSettings/detailSortPrefs';
import {
  getParsedLocalSettings,
  getStoredSortPref,
} from '../../../utils/localSettings/localSettings';
import { enforceCanonicalChannelRoute } from '../../../utils/redirect/enforceCanonicalMediumRoute';
import { PodcastPageClient } from './PodcastPageClient';
import type { PodcastPageDropdownConfigCurrentParams } from './PodcastPageDropdownConfig';
import { getPodcastPageFilterParams } from './PodcastPageDropdownConfig';

/**
 * The control fields carry no schema default, so an absent parameter stays `undefined` and this
 * channel's remembered selection is reachable. A default applied here would win before the stored
 * preference was ever consulted.
 */
const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_CHANNEL_TYPE_VALUES).optional(),
  sort: z.enum(QUERY_PARAMS_CHANNEL_SORT_VALUES).optional(),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type PodcastPageProps = {
  searchParams: Promise<SearchParams>;
  params: Promise<{ channel_id: string }>;
};

export async function generateMetadata({ params }: PodcastPageProps): Promise<Metadata> {
  try {
    const { channel_id } = await params;
    const channel = await getChannelForSeoPage(channel_id);
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(channel.channel_description?.value || channel.title)
    );

    if (channel?.feed?.podcast_index_id && channel.feed.feed_policy?.public_visible === false) {
      // When this URL redirects, prefer metadata that matches the target path.
      return buildContentMetadata({
        title: channel.title,
        descriptionPlain,
        pathname: `/podcast-index/feed/${channel.feed.podcast_index_id}`,
        imageUrl: getChannelHeroImageUrl(channel.channel_images),
      });
    }

    return buildContentMetadata({
      title: channel.title,
      descriptionPlain,
      pathname: buildPodcastPath(channel.id_text),
      imageUrl: getChannelHeroImageUrl(channel.channel_images),
    });
  } catch {
    return buildNoindexMetadata();
  }
}

export default async function PodcastPage({ params, searchParams }: PodcastPageProps) {
  const { channel_id } = await params;
  const queryParams = await searchParams;

  const { ssrApiRequestService } = await getSSRAuthService();

  const ssrChannel = await getChannelForSeoPage(channel_id);
  if (ssrChannel?.feed?.podcast_index_id && ssrChannel.feed.feed_policy?.public_visible === false) {
    redirect(`/podcast-index/feed/${ssrChannel.feed.podcast_index_id}`);
  }
  enforceCanonicalChannelRoute(ssrChannel, 'podcast');

  // Keyed on the resolved `id_text` rather than the route segment, so a channel reached by numeric
  // id and one reached by its slug are the same instance to the store.
  const sortPrefScope: SortPrefScope = { idText: ssrChannel.id_text, kind: 'channel' };
  const storedSortPref = getStoredSortPref(getParsedLocalSettings(await cookies()), sortPrefScope);

  const { currentPage, currentType, currentSort, currentRange, hasExplicitUrlParams } =
    parseSearchParams(queryParams, storedSortPref);

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
      hasExplicitUrlParams={hasExplicitUrlParams}
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

type PodcastPageResolvedParams = PodcastPageDropdownConfigCurrentParams & {
  hasExplicitUrlParams: boolean;
};

function parseSearchParams(
  queryParams: SearchParams,
  storedSortPref: SortPrefValue | null
): PodcastPageResolvedParams {
  const parsed = searchParamsSchema.safeParse(queryParams);
  const data = parsed.success ? parsed.data : null;

  const filterParams = getPodcastPageFilterParams({
    page: data?.page ?? 1,
    range: resolveStoredRange(data?.range, storedSortPref?.range),
    sort: resolveStoredToken(
      data?.sort,
      storedSortPref?.sort,
      QUERY_PARAMS_CHANNEL_SORT_VALUES,
      'recent'
    ),
    type: resolveStoredToken(
      data?.type,
      storedSortPref?.tab,
      QUERY_PARAMS_CHANNEL_TYPE_VALUES,
      'episodes'
    ),
  });

  return {
    ...filterParams,
    hasExplicitUrlParams: hasExplicitControlParams([data?.type, data?.sort, data?.range]),
  };
}

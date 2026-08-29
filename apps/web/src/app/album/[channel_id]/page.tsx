import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import type { DTOItem } from '@podverse/helpers';
import { buildAlbumPath, getTotalPages } from '@podverse/helpers';
import type { ApiListResponse } from '@podverse/helpers-requests';
import {
  QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES,
  QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import { getChannelForSeoPage, getChannelHeroImageUrl } from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { enforceCanonicalChannelRoute } from '../../../utils/redirect/enforceCanonicalMediumRoute';
import { AlbumPageClient } from './AlbumPageClient';
import type { AlbumPageDropdownConfigCurrentParams } from './AlbumPageDropdownConfig';
import { getAlbumPageFilterParams } from './AlbumPageDropdownConfig';

const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_TYPE_VALUES).optional().default('tracks'),
  sort: z.enum(QUERY_PARAMS_CHANNEL_MUSIC_ALBUM_SORT_VALUES).optional().default('forward'),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type AlbumPageProps = {
  searchParams: Promise<SearchParams>;
  params: Promise<{ channel_id: string }>;
};

export async function generateMetadata({ params }: AlbumPageProps): Promise<Metadata> {
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
      pathname: buildAlbumPath(channel.id_text),
      imageUrl: getChannelHeroImageUrl(channel.channel_images),
    });
  } catch {
    return {};
  }
}

export default async function AlbumPage({ params, searchParams }: AlbumPageProps) {
  const { channel_id } = await params;
  const queryParams = await searchParams;

  const { ssrApiRequestService } = await getSSRAuthService();

  const { currentPage, currentType, currentSort, currentRange } =
    await parseSearchParams(queryParams);

  const ssrChannel = await getChannelForSeoPage(channel_id);
  if (ssrChannel?.feed?.podcast_index_id && ssrChannel.feed.feed_policy?.public_visible === false) {
    redirect(`/podcast-index/feed/${ssrChannel.feed.podcast_index_id}`);
  }
  enforceCanonicalChannelRoute(ssrChannel, 'album');

  const ssrItemsWithLiveItem = await ssrApiRequestService.reqLiveItemGetManyByChannel(
    ssrChannel.id_text
  );

  const responseItems = await ssrApiRequestService.reqItemGetManyByChannelBySeason({
    idOrIdText: ssrChannel.id_text,
    page: currentPage,
    sort: currentSort,
    range: currentRange,
  });

  const ssrItems = [...ssrItemsWithLiveItem, ...responseItems.data];
  const ssrTotalPages = getCurrentTotalPages({ currentType, responseItems, currentPage });

  let ssrPodroll = null;
  if ((ssrChannel?.channel_podroll?.channel_podroll_remote_items?.length ?? 0) > 0) {
    ssrPodroll = await ssrApiRequestService.reqPodrollGetForChannel(ssrChannel.id_text);
  }

  return (
    <AlbumPageClient
      initialQueryParams={{
        page: currentPage,
        type: currentType,
        sort: currentSort,
        range: currentRange,
      }}
      ssrChannel={ssrChannel}
      ssrItemsWithLiveItem={ssrItemsWithLiveItem}
      ssrItems={ssrItems}
      ssrTotalPages={ssrTotalPages}
      ssrPodroll={ssrPodroll}
    />
  );
}

type GetAlbumCurrentTotalPages = {
  currentType?: string;
  responseItems?: ApiListResponse<DTOItem>;
  currentPage: number;
};

const getCurrentTotalPages = ({
  currentType,
  responseItems,
  currentPage,
}: GetAlbumCurrentTotalPages) => {
  if (currentType === 'tracks' && responseItems) {
    return getTotalPages(
      responseItems.meta.count,
      responseItems.meta.limit,
      responseItems.data.length,
      currentPage
    );
  }

  return 1;
};

function parseSearchParams(queryParams: SearchParams): AlbumPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    return {
      currentType: 'tracks',
      currentSort: 'forward',
      currentRange: null,
      currentPage: 1,
    };
  }

  const data = parsed.data;

  return getAlbumPageFilterParams(data);
}

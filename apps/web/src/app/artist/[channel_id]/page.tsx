import type { Metadata } from 'next';
import { z } from 'zod';

import { buildArtistPath } from '@podverse/helpers';
import { QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES } from '@podverse/helpers-requests';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import {
  getChannelHeroImageUrl,
  getPublisherRemoteItemsForChannelSeoPage,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { enforceCanonicalChannelRoute } from '../../../utils/redirect/enforceCanonicalMediumRoute';
import { ArtistPageClient } from './ArtistPageClient';
import type { ArtistPageDropdownConfigCurrentParams } from './ArtistPageDropdownConfig';
import { getArtistPageFilterParams } from './ArtistPageDropdownConfig';

const searchParamsSchema = z.object({
  type: z.enum(QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES).optional().default('albums'),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type ArtistPageProps = {
  searchParams: Promise<SearchParams>;
  params: Promise<{ channel_id: string }>;
};

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  try {
    const { channel_id } = await params;
    const response = await getPublisherRemoteItemsForChannelSeoPage(channel_id);
    const channel = response.channel;
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(channel.channel_description?.value || channel.title)
    );

    return buildContentMetadata({
      title: channel.title,
      descriptionPlain,
      pathname: buildArtistPath(channel.id_text),
      imageUrl: getChannelHeroImageUrl(channel.channel_images),
    });
  } catch {
    return {};
  }
}

export default async function ArtistPage({ params, searchParams }: ArtistPageProps) {
  const { channel_id } = await params;
  const queryParams = await searchParams;

  const { ssrApiRequestService } = await getSSRAuthService();

  const { currentType } = await parseSearchParams(queryParams);

  const response = await getPublisherRemoteItemsForChannelSeoPage(channel_id);
  enforceCanonicalChannelRoute(response.channel, 'artist');

  let ssrPodroll = null;
  if ((response.channel?.channel_podroll?.channel_podroll_remote_items?.length ?? 0) > 0) {
    ssrPodroll = await ssrApiRequestService.reqPodrollGetForChannel(response.channel.id_text);
  }

  return (
    <ArtistPageClient
      initialQueryParams={{
        type: currentType,
      }}
      ssrChannel={response.channel}
      ssrChannelsAdded={response.channelsAdded}
      ssrChannelsUnadded={response.channelsUnadded}
      ssrItemsAdded={response.itemsAdded}
      ssrItemsUnadded={response.itemsUnadded}
      ssrPodroll={ssrPodroll}
    />
  );
}

function parseSearchParams(queryParams: SearchParams): ArtistPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(queryParams);

  if (!parsed.success) {
    return {
      currentType: 'albums',
    };
  }

  const data = parsed.data;

  return getArtistPageFilterParams(data);
}

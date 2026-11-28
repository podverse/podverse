import type { Metadata } from 'next';
import { z } from 'zod';

import { buildArtistPath } from '@podverse/helpers';
import { QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES } from '@podverse/helpers-requests';

import { getConfigResolved } from '../../../config/loadPublicClientConfig.server';
import { loadChannelItemList } from '../../../lib/channel/loadChannelItemList';
import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import {
  getChannelHeroImageUrl,
  getPublisherRemoteItemsForChannelSeoPage,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { resolveStoredToken } from '../../../utils/localSettings/detailSortPrefs';
import { enforceCanonicalChannelRoute } from '../../../utils/redirect/enforceCanonicalMediumRoute';
import { permanentRedirectIfMerged } from '../../../utils/redirect/permanentRedirectIfMerged';
import { ArtistPageClient } from './ArtistPageClient';
import type { ArtistPageDropdownConfigCurrentParams } from './ArtistPageDropdownConfig';
import { getArtistPageFilterParams } from './ArtistPageDropdownConfig';

/**
 * `type` carries no schema default so an absent parameter stays `undefined` and the page opens on
 * Albums. An explicit `?type=` still selects that chip for this request only.
 */
const searchParamsSchema = z.object({
  type: z.enum(QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES).optional(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type ArtistPageProps = {
  searchParams: Promise<SearchParams>;
  params: Promise<{ channel_id: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ArtistPageProps): Promise<Metadata> {
  const { channel_id } = await params;
  await permanentRedirectIfMerged({
    kind: 'channel',
    id: channel_id,
    routeKind: 'artist',
    searchParams: await searchParams,
  });
  try {
    const response = await getPublisherRemoteItemsForChannelSeoPage(channel_id);
    const channel = response.channel;
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(channel.channel_description?.value || channel.title)
    );

    const brandName = (await getConfigResolved()).public.brand.name;
    return buildContentMetadata({
      title: channel.title,
      descriptionPlain,
      pathname: buildArtistPath(channel.id_text),
      imageUrl: getChannelHeroImageUrl(channel.channel_images),
      brandName,
    });
  } catch {
    return {};
  }
}

export default async function ArtistPage({ params, searchParams }: ArtistPageProps) {
  const { channel_id } = await params;
  const queryParams = await searchParams;
  await permanentRedirectIfMerged({
    kind: 'channel',
    id: channel_id,
    routeKind: 'artist',
    searchParams: queryParams,
  });

  const { ssrApiRequestService } = await getSSRAuthService();

  const response = await getPublisherRemoteItemsForChannelSeoPage(channel_id);
  enforceCanonicalChannelRoute(response.channel, 'artist');

  const { currentType } = parseSearchParams(queryParams);

  let ssrPodroll = null;
  if ((response.channel?.channel_podroll?.channel_podroll_remote_items?.length ?? 0) > 0) {
    ssrPodroll = await ssrApiRequestService.reqPodrollGetForChannel(response.channel.id_text);
  }

  const itemList = await loadChannelItemList(() =>
    ssrApiRequestService.reqItemGetManyByChannel({
      idOrIdText: response.channel.id_text,
      page: 1,
      sort: 'recent',
      range: null,
    })
  );
  const directoryRemoved = itemList.kind === 'archived';

  return (
    <ArtistPageClient
      initialQueryParams={{
        type: currentType,
      }}
      ssrChannel={response.channel}
      ssrChannelsAdded={response.channelsAdded}
      ssrChannelsUnadded={response.channelsUnadded}
      ssrItemsAdded={response.itemsAdded}
      ssrPodroll={ssrPodroll}
      directoryRemoved={directoryRemoved}
    />
  );
}

function parseSearchParams(queryParams: SearchParams): ArtistPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(queryParams);
  const data = parsed.success ? parsed.data : null;

  return getArtistPageFilterParams({
    type: resolveStoredToken(
      data?.type,
      undefined,
      QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES,
      'albums'
    ),
  });
}

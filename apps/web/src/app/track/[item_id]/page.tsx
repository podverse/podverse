import type { Metadata } from 'next';
import { z } from 'zod';

import { buildTrackPath } from '@podverse/helpers';
import { QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES } from '@podverse/helpers-requests';

import { getConfigResolved } from '../../../config/loadPublicClientConfig.server';
import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import {
  getChannelForItemPage,
  getItemForSeoPage,
  getItemThenChannelHeroImageUrl,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { enforceCanonicalItemRoute } from '../../../utils/redirect/enforceCanonicalMediumRoute';
import { permanentRedirectIfMerged } from '../../../utils/redirect/permanentRedirectIfMerged';
import { TrackPageClient } from './TrackPageClient';
import type { TrackPageDropdownConfigCurrentParams } from './TrackPageDropdownConfig';
import { getTrackPageFilterParams } from './TrackPageDropdownConfig';

const searchParamsSchema = z.object({
  type: z.enum(QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES).optional().default('summary'),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type TrackPageProps = {
  searchParams: Promise<SearchParams>;
  params: Promise<{ item_id: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: TrackPageProps): Promise<Metadata> {
  const { item_id } = await params;
  await permanentRedirectIfMerged({
    kind: 'item',
    id: item_id,
    routeKind: 'track',
    searchParams: await searchParams,
  });
  try {
    const item = await getItemForSeoPage(item_id);
    const channel = await getChannelForItemPage(item);
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(item.item_description?.value || item.title)
    );

    const brandName = (await getConfigResolved()).public.brand.name;
    return buildContentMetadata({
      title: item.title,
      descriptionPlain,
      pathname: buildTrackPath(item.id_text),
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
      brandName,
    });
  } catch {
    return buildNoindexMetadata();
  }
}

export default async function TrackPage({ params, searchParams }: TrackPageProps) {
  const { item_id } = await params;
  const queryParams = await searchParams;
  await permanentRedirectIfMerged({
    kind: 'item',
    id: item_id,
    routeKind: 'track',
    searchParams: queryParams,
  });

  const { currentType } = parseSearchParams(queryParams);

  const ssrItem = await getItemForSeoPage(item_id);
  const ssrChannel = await getChannelForItemPage(ssrItem);
  enforceCanonicalItemRoute(ssrChannel.medium_id, ssrItem.id_text, 'track');

  const ssrHasTranscripts = ssrItem.item_transcripts && ssrItem.item_transcripts.length > 0;

  return (
    <TrackPageClient
      initialQueryParams={{
        type: currentType,
      }}
      ssrChannel={ssrChannel}
      ssrItem={ssrItem}
      ssrHasTranscripts={ssrHasTranscripts}
    />
  );
}

function parseSearchParams(searchParams: SearchParams): TrackPageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(searchParams);

  if (!parsed.success) {
    return {
      currentType: 'summary',
    };
  }

  const data = parsed.data;

  return getTrackPageFilterParams(data);
}

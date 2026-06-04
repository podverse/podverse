import type { Metadata } from 'next';
import { z } from 'zod';

import { QUERY_PARAMS_ITEM_MUSIC_TYPE_VALUES } from '@podverse/helpers-requests';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import {
  getChannelForSeoPage,
  getItemForSeoPage,
  getItemThenChannelHeroImageUrl,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
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

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  try {
    const { item_id } = await params;
    const item = await getItemForSeoPage(item_id);
    const channel = await getChannelForSeoPage(item.channel_id);
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(item.item_description?.value || item.title)
    );

    return buildContentMetadata({
      title: item.title,
      descriptionPlain,
      pathname: `/track/${item.id_text}`,
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
    });
  } catch {
    return {};
  }
}

export default async function TrackPage({ params, searchParams }: TrackPageProps) {
  const { item_id } = await params;
  const queryParams = await searchParams;

  const { currentType } = parseSearchParams(queryParams);

  const ssrItem = await getItemForSeoPage(item_id);
  const ssrChannel = await getChannelForSeoPage(ssrItem.channel_id);

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

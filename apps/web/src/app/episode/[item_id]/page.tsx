import type { Metadata } from 'next';
import { z } from 'zod';

import {
  QUERY_PARAMS_ITEM_SORT_VALUES,
  QUERY_PARAMS_ITEM_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import {
  getChannelForSeoPage,
  getItemForSeoPage,
  getItemThenChannelHeroImageUrl,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { EpisodePageClient } from './EpisodePageClient';
import type { EpisodePageDropdownConfigCurrentParams } from './EpisodePageDropdownConfig';
import { getEpisodePageFilterParams } from './EpisodePageDropdownConfig';

const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_ITEM_TYPE_VALUES).optional().default('summary'),
  sort: z.enum(QUERY_PARAMS_ITEM_SORT_VALUES).optional().default('recent'),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable().default(null),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type EpisodePageProps = {
  searchParams: Promise<SearchParams>;
  params: Promise<{ item_id: string }>;
};

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
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
      pathname: `/episode/${item.id_text}`,
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
    });
  } catch {
    return {};
  }
}

export default async function EpisodePage({ params, searchParams }: EpisodePageProps) {
  const { item_id } = await params;
  const queryParams = await searchParams;

  const { ssrApiRequestService } = await getSSRAuthService();

  const { currentPage, currentType, currentSort, currentRange } = parseSearchParams(queryParams);

  const ssrItem = await getItemForSeoPage(item_id);
  const ssrChannel = await getChannelForSeoPage(ssrItem.channel_id);

  const ssrHasChapters = !!ssrItem.item_chapters_feed;
  const ssrHasSoundbites = !!ssrItem.item_soundbites && ssrItem.item_soundbites.length > 0;
  const ssrHasTranscripts = ssrItem.item_transcripts && ssrItem.item_transcripts.length > 0;

  return (
    <EpisodePageClient
      initialQueryParams={{
        page: currentPage,
        type: currentType,
        sort: currentSort,
        range: currentRange,
      }}
      ssrChannel={ssrChannel}
      ssrItem={ssrItem}
      ssrHasChapters={ssrHasChapters}
      ssrHasSoundbites={ssrHasSoundbites}
      ssrHasTranscripts={ssrHasTranscripts}
    />
  );
}

function parseSearchParams(searchParams: SearchParams): EpisodePageDropdownConfigCurrentParams {
  const parsed = searchParamsSchema.safeParse(searchParams);

  if (!parsed.success) {
    return {
      currentType: 'summary',
      currentSort: 'recent',
      currentRange: null,
      currentPage: 1,
    };
  }

  const data = parsed.data;

  return getEpisodePageFilterParams(data);
}

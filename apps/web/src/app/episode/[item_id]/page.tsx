import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { z } from 'zod';

import type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
import { buildEpisodePath } from '@podverse/helpers';
import {
  QUERY_PARAMS_ITEM_SORT_VALUES,
  QUERY_PARAMS_ITEM_TYPE_VALUES,
  QUERY_PARAMS_STATS_RANGE_VALUES,
} from '@podverse/helpers-requests';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import {
  getChannelForSeoPage,
  getItemForSeoPage,
  getItemThenChannelHeroImageUrl,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import {
  hasExplicitControlParams,
  resolveStoredRange,
  resolveStoredToken,
} from '../../../utils/localSettings/detailSortPrefs';
import {
  getParsedLocalSettings,
  getStoredSortPref,
} from '../../../utils/localSettings/localSettings';
import { enforceCanonicalItemRoute } from '../../../utils/redirect/enforceCanonicalMediumRoute';
import { EpisodePageClient } from './EpisodePageClient';
import type { EpisodePageDropdownConfigCurrentParams } from './EpisodePageDropdownConfig';
import { getEpisodePageFilterParams } from './EpisodePageDropdownConfig';

/**
 * The control fields carry no schema default, so an absent parameter stays `undefined` and this
 * episode's remembered selection is reachable. A default applied here would win before the stored
 * preference was ever consulted.
 */
const searchParamsSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .optional()
    .default(1),
  type: z.enum(QUERY_PARAMS_ITEM_TYPE_VALUES).optional(),
  sort: z.enum(QUERY_PARAMS_ITEM_SORT_VALUES).optional(),
  range: z.enum(QUERY_PARAMS_STATS_RANGE_VALUES).optional().nullable(),
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
      pathname: buildEpisodePath(item.id_text),
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
    });
  } catch {
    return buildNoindexMetadata();
  }
}

export default async function EpisodePage({ params, searchParams }: EpisodePageProps) {
  const { item_id } = await params;
  const queryParams = await searchParams;

  const ssrItem = await getItemForSeoPage(item_id);
  const ssrChannel = await getChannelForSeoPage(ssrItem.channel_id);
  enforceCanonicalItemRoute(ssrChannel.medium_id, ssrItem.id_text, 'episode');

  // Keyed on the resolved `id_text` rather than the route segment, so an episode reached by numeric
  // id and one reached by its slug are the same instance to the store.
  const sortPrefScope: SortPrefScope = { idText: ssrItem.id_text, kind: 'item' };
  const storedSortPref = getStoredSortPref(getParsedLocalSettings(await cookies()), sortPrefScope);

  const { currentPage, currentType, currentSort, currentRange, hasExplicitUrlParams } =
    parseSearchParams(queryParams, storedSortPref);

  const ssrHasChapters = !!ssrItem.item_chapters_feed;
  const ssrHasSoundbites = !!ssrItem.item_soundbites && ssrItem.item_soundbites.length > 0;
  const ssrHasTranscripts = ssrItem.item_transcripts && ssrItem.item_transcripts.length > 0;

  return (
    <EpisodePageClient
      hasExplicitUrlParams={hasExplicitUrlParams}
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

type EpisodePageResolvedParams = EpisodePageDropdownConfigCurrentParams & {
  hasExplicitUrlParams: boolean;
};

function parseSearchParams(
  searchParams: SearchParams,
  storedSortPref: SortPrefValue | null
): EpisodePageResolvedParams {
  const parsed = searchParamsSchema.safeParse(searchParams);
  const data = parsed.success ? parsed.data : null;

  const filterParams = getEpisodePageFilterParams({
    page: data?.page ?? 1,
    range: resolveStoredRange(data?.range, storedSortPref?.range),
    sort: resolveStoredToken(
      data?.sort,
      storedSortPref?.sort,
      QUERY_PARAMS_ITEM_SORT_VALUES,
      'recent'
    ),
    type: resolveStoredToken(
      data?.type,
      storedSortPref?.tab,
      QUERY_PARAMS_ITEM_TYPE_VALUES,
      'summary'
    ),
  });

  return {
    ...filterParams,
    hasExplicitUrlParams: hasExplicitControlParams([data?.type, data?.sort, data?.range]),
  };
}

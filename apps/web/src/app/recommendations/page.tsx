import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';
import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import {
  DEFAULT_MEDIA_LIST_CHIP,
  MEDIA_LIST_CHIP_QUERY_PARAM,
  mediaListChipsForCatalog,
  readStoredMediaListChip,
  RECOMMENDATION_CHIPS,
  resolveMediaListChip,
} from '../../utils/mediaListChips';
import type { MediaListSearchParams } from '../_media-lists/mediaListSsr';
import { getMediaListSsr } from '../_media-lists/mediaListSsr';
import { RecommendationsPageClient } from './RecommendationsPageClient';

type RecommendationsPageProps = { searchParams: Promise<MediaListSearchParams> };

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const params = await searchParams;
  const ssr = await getMediaListSsr();
  const chips = mediaListChipsForCatalog(RECOMMENDATION_CHIPS, getCatalogConfig().musicEnabled);
  const { chip, urlChip } = resolveMediaListChip({
    chips,
    defaultChip: DEFAULT_MEDIA_LIST_CHIP,
    storedValue: readStoredMediaListChip(ssr.localSettings, 'recommendations'),
    urlValue: params[MEDIA_LIST_CHIP_QUERY_PARAM],
  });

  return <RecommendationsPageClient chip={chip} urlChip={urlChip} chips={chips} />;
}

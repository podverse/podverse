import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { primaryBlockReasonForUi } from '@podverse/helpers';

import { getConfigResolved } from '../../../../config/loadPublicClientConfig.server';
import { buildContentMetadata } from '../../../../lib/seo/buildContentMetadata';
import {
  getChannelByPodcastIndexIdForSeoPage,
  getInternalFeedForSeoPage,
  getPodcastIndexFeedForSeoPage,
  getPodcastIndexFeedHeroImageUrl,
} from '../../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../../lib/seo/truncateMetaDescription';
import { permanentRedirectIfMerged } from '../../../../utils/redirect/permanentRedirectIfMerged';
import {
  getChannelPathByMedium,
  redirectToChannelPageByMediumServer,
} from '../../../../utils/redirect/redirectToChannelPageByMedium';
import { PodcastIndexFeedClient } from './PodcastIndexFeedClient';

type PodcastIndexFeedPageProps = {
  params: Promise<{ podcast_index_id: string }>;
};

export async function generateMetadata({ params }: PodcastIndexFeedPageProps): Promise<Metadata> {
  const { podcast_index_id } = await params;
  await permanentRedirectIfMerged({ kind: 'podcast_index', id: podcast_index_id });
  try {
    const podcastIndexResponse = await getPodcastIndexFeedForSeoPage(podcast_index_id);
    const ssrInternalFeed = await getInternalFeedForSeoPage(podcast_index_id);
    const ssrFeed = podcastIndexResponse.feed;

    if (!ssrFeed) {
      return {};
    }

    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(ssrFeed.description || ssrFeed.title)
    );
    const isBlockedByPolicy =
      ssrInternalFeed?.feed_policy?.add_allowed === false ||
      ssrInternalFeed?.feed_policy?.public_visible === false;
    const ssrChannel = await getChannelByPodcastIndexIdForSeoPage(podcast_index_id);
    const redirectPath =
      ssrChannel?.medium_id && !isBlockedByPolicy
        ? getChannelPathByMedium(ssrChannel.medium_id, ssrChannel.id_text)
        : null;

    const brandName = (await getConfigResolved()).public.brand.name;
    return buildContentMetadata({
      title: ssrFeed.title,
      descriptionPlain,
      pathname: redirectPath || `/podcast-index/feed/${podcast_index_id}`,
      imageUrl: getPodcastIndexFeedHeroImageUrl(ssrFeed),
      brandName,
    });
  } catch {
    return {};
  }
}

export default async function PodcastIndexFeedPage(props: PodcastIndexFeedPageProps) {
  const { podcast_index_id } = await props.params;
  await permanentRedirectIfMerged({ kind: 'podcast_index', id: podcast_index_id });
  const podcastIndexResponse = await getPodcastIndexFeedForSeoPage(podcast_index_id);
  const ssrInternalFeed = await getInternalFeedForSeoPage(podcast_index_id);

  const ssrFeed = podcastIndexResponse.feed;
  const blockedReasonForUi = primaryBlockReasonForUi(
    ssrInternalFeed?.feed_policy?.primary_block_reason ?? null
  );
  const isBlockedByPolicy =
    ssrInternalFeed?.feed_policy?.add_allowed === false ||
    ssrInternalFeed?.feed_policy?.public_visible === false;

  if (!ssrFeed) {
    return notFound();
  }

  // Always returns 200, even if not found, to avoid NEXT SSR error log
  const ssrChannel = await getChannelByPodcastIndexIdForSeoPage(podcast_index_id);

  if (ssrChannel?.medium_id && !isBlockedByPolicy) {
    redirectToChannelPageByMediumServer(ssrChannel.medium_id, ssrChannel.id_text);
  }

  return <PodcastIndexFeedClient ssrFeed={ssrFeed} blockedReasonForUi={blockedReasonForUi} />;
}

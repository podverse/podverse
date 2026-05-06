import { notFound } from 'next/navigation';

import { primaryBlockReasonForUi } from '@podverse/helpers';

import { getSSRAuthService } from '../../../../utils/auth/ssrAuth';
import { redirectToChannelPageByMediumServer } from '../../../../utils/redirect/redirectToChannelPageByMedium';
import { PodcastIndexFeedClient } from './PodcastIndexFeedClient';

export default async function PodcastIndexFeedPage(props: {
  params: Promise<{ podcast_index_id: string }>;
}) {
  const { podcast_index_id } = await props.params;
  const { ssrApiRequestService } = await getSSRAuthService();
  const podcastIndexResponse = await ssrApiRequestService.reqPodcastIndexFeedById(podcast_index_id);
  const ssrInternalFeed = await ssrApiRequestService.reqFeedGetByPodcastIndexId(podcast_index_id);

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
  const ssrChannel = await ssrApiRequestService.reqChannelGetByPodcastIndexId(podcast_index_id);

  if (ssrChannel?.medium_id && !isBlockedByPolicy) {
    redirectToChannelPageByMediumServer(ssrChannel.medium_id, ssrChannel.id_text);
  }

  return <PodcastIndexFeedClient ssrFeed={ssrFeed} blockedReasonForUi={blockedReasonForUi} />;
}

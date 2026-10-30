import { useCallback } from 'react';

import type { ApiRequestService } from '@podverse/helpers-requests';

import type { PodcastSectionPaneProps } from './podcastSectionPane';
import { RemoteItemListPane } from './RemoteItemListPane';

/**
 * The podcasts and episodes this podcast recommends: parsed ones open their screen, and remote
 * stubs open the provider search detail for their feed. References the index provider does not
 * know are left out by the API. The whole podroll arrives in one response, so there is no second
 * page. The chip only appears when the feed declared a podroll, which makes an empty list here a
 * declared podroll none of whose entries the API returned.
 */
export function PodcastPodrollSection({
  channelIdText,
  listHeader,
  onRefreshChannel,
}: PodcastSectionPaneProps) {
  const fetchPodroll = useCallback(
    (api: ApiRequestService) => api.reqPodrollGetForChannel(channelIdText),
    [channelIdText]
  );

  return (
    <RemoteItemListPane
      accessibilityLabelKey="info.podroll"
      emptyMessageKey="info.no_podroll_found"
      fetchResponse={fetchPodroll}
      listHeader={listHeader}
      onRefreshChannel={onRefreshChannel}
      rowTestIDPrefix="podcast-podroll-row"
      testID="podcast-detail-podroll-list"
    />
  );
}

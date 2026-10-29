import { useCallback } from 'react';

import type { ApiRequestService } from '@podverse/helpers-requests';

import type { PodcastSectionPaneProps } from './podcastSectionPane';
import { RemoteItemListPane } from './RemoteItemListPane';

/**
 * The items and feeds this channel's own feed points at with `podcast:remoteItem`: parsed ones
 * open their screen, and remote stubs open the provider search detail for their feed. References
 * the index provider does not know are left out by the API.
 */
export function PodcastRemoteItemsSection({
  channelIdText,
  listHeader,
  onRefreshChannel,
}: PodcastSectionPaneProps) {
  const fetchRemoteItems = useCallback(
    (api: ApiRequestService) => api.reqRemoteItemGetForChannel(channelIdText),
    [channelIdText]
  );

  return (
    <RemoteItemListPane
      accessibilityLabelKey="info.remote_items"
      emptyMessageKey="info.no_remote_items_found"
      fetchResponse={fetchRemoteItems}
      listHeader={listHeader}
      onRefreshChannel={onRefreshChannel}
      rowTestIDPrefix="podcast-remote-item-row"
      testID="podcast-detail-remote-items-list"
    />
  );
}

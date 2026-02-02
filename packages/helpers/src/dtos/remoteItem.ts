import type { DTOChannel } from './channel/channel.js';
import type { DTOItem } from './item/item.js';
import type { EpisodeByGuidResponse } from './podcast-index/episodeByGuid.js';
import type { PodcastBatchByFeedGuidResponse } from './podcast-index/podcastBatchByFeedGuid.js';

export interface RemoteItemsResponse {
  channelsAdded: DTOChannel[];
  channelsUnadded: PodcastBatchByFeedGuidResponse['feeds'];
  itemsAdded: DTOItem[];
  itemsUnadded: EpisodeByGuidResponse['episode'][];
}

export type RemoteItemGeneric = {
  feed_guid: string;
  feed_url: string | null;
  item_guid: string | null;
};

export interface PublisherRemoteItemsResponse {
  channel: DTOChannel;
  channelsAdded: DTOChannel[];
  channelsUnadded: PodcastBatchByFeedGuidResponse['feeds'];
  itemsAdded: DTOItem[];
  itemsUnadded: NonNullable<EpisodeByGuidResponse['episode']>[];
}

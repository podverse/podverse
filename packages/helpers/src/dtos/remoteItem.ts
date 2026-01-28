import { DTOChannel } from './channel/channel';
import { DTOItem } from './item/item';
import { EpisodeByGuidResponse } from './podcast-index/episodeByGuid';
import { PodcastBatchByFeedGuidResponse } from './podcast-index/podcastBatchByFeedGuid';

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

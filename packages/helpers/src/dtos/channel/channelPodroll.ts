import { DTOChannelPodrollRemoteItem } from './channelPodrollRemoteItem';

export interface DTOChannelPodroll {
  id: number;
  channel_id: number;
  channel_podroll_remote_items?: DTOChannelPodrollRemoteItem[];
}

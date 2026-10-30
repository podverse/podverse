import type { Channel } from '@podverse/orm';
import {
  ChannelPodrollRemoteItemService,
  ChannelPodrollService,
  ChannelPublisherRemoteItemService,
  ChannelPublisherService,
  ChannelRemoteItemService,
  ItemService,
} from '@podverse/orm';

export type RemoteItemRefSource =
  'podroll' | 'publisher' | 'channel_remote_item' | 'value_time_split';

export type CollectedRemoteItemRef = {
  source: RemoteItemRefSource;
  feedGuid: string;
  feedUrl: string | null;
  itemGuid: string | null;
};

type StoredRemoteItemRef = {
  feed_guid: string;
  feed_url?: string | null;
  item_guid?: string | null;
};

function toCollectedRef(
  source: RemoteItemRefSource,
  row: StoredRemoteItemRef
): CollectedRemoteItemRef {
  return {
    source,
    feedGuid: row.feed_guid,
    feedUrl: row.feed_url ?? null,
    itemGuid: row.item_guid ?? null,
  };
}

async function collectPodrollRefs(channel: Channel): Promise<CollectedRemoteItemRef[]> {
  const channelPodroll = await new ChannelPodrollService().get(channel);
  if (!channelPodroll) {
    return [];
  }
  const rows = await new ChannelPodrollRemoteItemService().getAll(channelPodroll);
  return rows.map((row) => toCollectedRef('podroll', row));
}

async function collectPublisherRefs(channel: Channel): Promise<CollectedRemoteItemRef[]> {
  const channelPublisher = await new ChannelPublisherService().get(channel);
  if (!channelPublisher) {
    return [];
  }
  const rows = await new ChannelPublisherRemoteItemService().getAll(channelPublisher);
  return rows.map((row) => toCollectedRef('publisher', row));
}

async function collectChannelRemoteItemRefs(channel: Channel): Promise<CollectedRemoteItemRef[]> {
  const rows = await new ChannelRemoteItemService().getAll(channel);
  return rows.map((row) => toCollectedRef('channel_remote_item', row));
}

async function collectValueTimeSplitRefs(channel: Channel): Promise<CollectedRemoteItemRef[]> {
  if (!channel.has_value_time_splits) {
    return [];
  }
  const items = await new ItemService().getManyByChannel(channel, {
    relations: {
      item_values: {
        item_value_time_splits: {
          item_value_time_split_recipients: true,
          item_value_time_split_remote_item: true,
        },
      },
    },
  });

  const refs: CollectedRemoteItemRef[] = [];
  for (const item of items) {
    for (const itemValue of item.item_values ?? []) {
      for (const timeSplit of itemValue.item_value_time_splits ?? []) {
        const remoteItem = timeSplit.item_value_time_split_remote_item;
        if (remoteItem) {
          refs.push(toCollectedRef('value_time_split', remoteItem));
        }
      }
    }
  }
  return refs;
}

/** Every stored remote item reference of the channel, in source order, duplicates kept. */
export async function collectRemoteItemRefs(channel: Channel): Promise<CollectedRemoteItemRef[]> {
  const podrollRefs = await collectPodrollRefs(channel);
  const publisherRefs = await collectPublisherRefs(channel);
  const channelRemoteItemRefs = await collectChannelRemoteItemRefs(channel);
  const valueTimeSplitRefs = await collectValueTimeSplitRefs(channel);
  return [...podrollRefs, ...publisherRefs, ...channelRemoteItemRefs, ...valueTimeSplitRefs];
}

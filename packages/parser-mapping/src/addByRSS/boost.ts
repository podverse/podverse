import type { DTOChannel, DTOChannelValue } from '@podverse/helpers';

import type { AddByRSSMappedFeed } from './types.js';

/** Feed record with mapped feed for boost channel building (parser-mapping shape). */
export type AddByRSSFeedRecordWithMapped = {
  id: number;
  idText: string;
  feedUrl: string;
  title: string | null;
  imageUrl: string | null;
  mappedFeed?: AddByRSSMappedFeed;
  [key: string]: unknown;
};

const mapChannelValues = (feed: AddByRSSFeedRecordWithMapped): DTOChannelValue[] => {
  const values = feed.mappedFeed?.channel?.value ?? [];
  return values.map((value, index) => ({
    id: index + 1,
    type: value.channel_value.type,
    method: value.channel_value.method,
    suggested: value.channel_value.suggested ?? null,
    meta_boost: value.channel_value_meta_boost ?? null,
    channel_value_recipients: value.channel_value_recipients.map((recipient, recipientIndex) => ({
      id: recipientIndex + 1,
      type: recipient.type,
      address: recipient.address,
      split: recipient.split,
      name: recipient.name ?? null,
      custom_key: recipient.custom_key ?? null,
      custom_value: recipient.custom_value ?? null,
      fee: recipient.fee ?? false,
    })),
  }));
};

const getHasValueTimeSplits = (feed: AddByRSSFeedRecordWithMapped): boolean => {
  const items = feed.mappedFeed?.items ?? [];
  return items.some((item) =>
    (item.value ?? []).some((value) => (value.item_value_time_splits?.length ?? 0) > 0)
  );
};

export const buildAddByRssBoostChannel = (
  feed: AddByRSSFeedRecordWithMapped
): DTOChannel | null => {
  const mappedChannel = feed.mappedFeed?.channel?.channel;
  if (!mappedChannel) {
    return null;
  }

  const channelValues = mapChannelValues(feed);

  return {
    id: feed.id,
    id_text: feed.idText,
    slug: null,
    feed_id: feed.id,
    podcast_guid: mappedChannel.podcast_guid ?? null,
    title: mappedChannel.title ?? null,
    sortable_title: mappedChannel.sortable_title ?? null,
    medium_id: mappedChannel.medium_id ?? 0,
    has_podcast_index_value: channelValues.length > 0,
    has_value_time_splits: getHasValueTimeSplits(feed),
    channel_values: channelValues,
  };
};

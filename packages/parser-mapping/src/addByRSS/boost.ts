import type {
  DTOChannel,
  DTOChannelValue,
  DTOItem,
  DTOItemImage,
  DTOItemValue,
} from '@podverse/helpers';

import { compatItemValueDtos } from '../compat/partytime/item.js';
import type {
  AddByRSSItemIndexItem,
  AddByRSSLivestreamIndexItem,
  AddByRSSMappedFeed,
} from './types.js';

type MappedChannelBundle = AddByRSSMappedFeed['channel'];

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

const mapChannelValues = (mapped: MappedChannelBundle | undefined): DTOChannelValue[] => {
  const values = mapped?.value ?? [];
  return values.map((value, index) => ({
    id: index + 1,
    type: value.channel_value.type,
    method: value.channel_value.method,
    suggested: value.channel_value.suggested ?? null,
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
  const mapped = feed.mappedFeed?.channel;
  const mappedChannel = mapped?.channel;
  if (!mappedChannel) {
    return null;
  }

  const channelValues = mapChannelValues(mapped);

  return {
    id: feed.id,
    id_text: feed.idText,
    slug: null,
    feed_id: feed.id,
    podcast_guid: mappedChannel.podcast_guid ?? null,
    title: mappedChannel.title ?? null,
    sortable_title: mappedChannel.sortable_title ?? null,
    medium_id: mappedChannel.medium_id ?? 0,
    has_value_time_splits: getHasValueTimeSplits(feed),
    channel_meta_boost: mapped.meta_boost ?? null,
    channel_values: channelValues,
  };
};

const mapItemImages = (
  images: ReadonlyArray<{ url: string; image_width_size: number | null }>
): DTOItemImage[] =>
  images.map((image, index) => ({
    id: index + 1,
    item_id: 0,
    url: image.url,
    image_width_size: image.image_width_size,
    is_resized: false,
  }));

const mapItemValues = (values: ReturnType<typeof compatItemValueDtos>): DTOItemValue[] =>
  values.map((value, index) => {
    const id = index + 1;
    return {
      id,
      item_id: 0,
      type: value.item_value.type,
      method: value.item_value.method,
      suggested: value.item_value.suggested,
      item_value_recipients: value.item_value_recipients.map((recipient, recipientIndex) => ({
        id: recipientIndex + 1,
        item_value_id: id,
        type: recipient.type,
        address: recipient.address,
        split: recipient.split,
        name: recipient.name,
        custom_key: recipient.custom_key,
        custom_value: recipient.custom_value,
        fee: recipient.fee,
      })),
    };
  });

const shellItem = (): Omit<
  DTOItem,
  'id_text' | 'guid' | 'title' | 'item_images' | 'item_values'
> => ({
  id: 0,
  channel_id: 0,
  item_flag_status_id: 0,
  item_about: { id: 0, item_id: 0 },
  item_chat: { id: 0, item_id: 0, server: '' },
  item_license: { id: 0, item_id: 0, identifier: '', url: null },
  item_location: { id: 0, item_id: 0, name: null },
  item_season: { id: 0, channel_season_id: 0, item_id: 0, title: null },
  item_content_links: [],
  item_enclosures: [],
  item_fundings: [],
  item_persons: [],
  item_social_interacts: [],
  item_soundbites: [],
  item_transcripts: [],
  item_txts: [],
});

export const buildAddByRssBoostItem = (
  indexItem: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem
): DTOItem => {
  if ('bundle' in indexItem) {
    return {
      ...shellItem(),
      id_text: indexItem.idText,
      guid: indexItem.itemGuid,
      title: indexItem.bundle.item.title ?? null,
      item_images: mapItemImages(indexItem.bundle.images),
      item_values: mapItemValues(indexItem.bundle.value),
    };
  }

  const liveImage = indexItem.item.image;
  return {
    ...shellItem(),
    id_text: indexItem.idText,
    guid: indexItem.itemGuid,
    title: indexItem.item.title ?? null,
    item_images:
      typeof liveImage === 'string' && liveImage !== ''
        ? mapItemImages([{ url: liveImage, image_width_size: null }])
        : [],
    item_values: mapItemValues(compatItemValueDtos(indexItem.item)),
  };
};

export type AddByRssBoostItem = {
  guid: string | null;
  id_text: string;
  item_images: DTOItemImage[];
  item_values: DTOItemValue[];
  title: string | null;
};

export type AddByRssBoostItemInput = {
  guid: string | null;
  idText: string;
  images: ReadonlyArray<{ url: string; image_width_size: number | null }>;
  title: string | null;
  values: AddByRSSMappedFeed['items'][number]['value'];
};

const mapSheetItemValues = (values: AddByRssBoostItemInput['values']): DTOItemValue[] =>
  values.map((value, index) => {
    const id = index + 1;
    return {
      id,
      item_id: 0,
      type: value.item_value.type,
      method: value.item_value.method,
      suggested: value.item_value.suggested,
      item_value_recipients: value.item_value_recipients.map((recipient, recipientIndex) => ({
        id: recipientIndex + 1,
        item_value_id: id,
        type: recipient.type,
        address: recipient.address,
        split: recipient.split,
        name: recipient.name ?? null,
        custom_key: recipient.custom_key ?? null,
        custom_value: recipient.custom_value ?? null,
        fee: recipient.fee ?? false,
      })),
    };
  });

/** Sheet item for an Add by RSS screen or playback target. Time splits stay off this object. */
export const buildAddByRssBoostSheetItem = (input: AddByRssBoostItemInput): AddByRssBoostItem => ({
  guid: input.guid !== null && input.guid.length > 0 ? input.guid : null,
  id_text: input.idText,
  item_images: mapItemImages(input.images),
  item_values: mapSheetItemValues(input.values),
  title: input.title,
});

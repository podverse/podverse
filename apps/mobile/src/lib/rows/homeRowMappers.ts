import type {
  DTOChannel,
  DTOClip,
  DTOItemImage,
  DTOItemSoundbite,
  DTOPlaylistResource,
  DTOQueueResource,
} from '@podverse/helpers';
import { primaryChannelListArtworkUrl } from '@podverse/helpers';
import { htmlToPlainText } from '@podverse/helpers/html';

import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import type { HomeFeedRowData } from '../../screens/home/homeFeedData';

export type ItemHomeRow = HomeFeedRowData & {
  mediaType: 'episodes' | 'tracks';
};

export type PlaylistResourceHomeRow = HomeFeedRowData & {
  mediaType: 'clips' | 'episodes' | 'tracks';
};

export type QueueResourceHomeRow = HomeFeedRowData & {
  mediaType: 'episodes' | 'tracks';
  queueResourceId: number;
};

/** Structural subset shared by `DTOItem` and `DTOItemQueueItem` for home-row mapping. */
type ItemHomeRowSource = {
  channel?: DTOChannel;
  id_text: string;
  item_about?: { duration?: string | null };
  item_description?: { value?: string | null };
  item_images: DTOItemImage[];
  pub_date?: string | null;
  title?: string | null;
};

const itemDescriptionPlain = (item: ItemHomeRowSource): string | null => {
  const plain = htmlToPlainText(item.item_description?.value ?? undefined);
  return plain.length > 0 ? plain : null;
};

const itemDuration = (item: ItemHomeRowSource): string | null => {
  const duration = item.item_about?.duration?.trim() ?? '';
  return duration.length > 0 ? duration : null;
};

export function channelToHomeRow(channel: DTOChannel): HomeFeedRowData {
  return {
    id: channel.id_text,
    imageUrl: primaryChannelListArtworkUrl(channel.channel_images),
    subtitle: null,
    title: channel.title ?? channel.id_text,
    updatedAt: channel.channel_about?.last_pub_date ?? null,
  };
}

export function clipToHomeRow(clip: DTOClip): HomeFeedRowData {
  return {
    description: itemDescriptionPlain(clip.item),
    duration: itemDuration(clip.item),
    id: clip.id_text,
    imageUrl: getItemPrimaryImageUrl(clip.item),
    subtitle: clip.item.channel?.title ?? null,
    title: clip.title ?? clip.item.title ?? clip.id_text,
    updatedAt: clip.item.pub_date ?? null,
  };
}

export function itemToHomeRow(item: ItemHomeRowSource): ItemHomeRow {
  const mediumId = item.channel?.medium_id ?? null;
  return {
    description: itemDescriptionPlain(item),
    duration: itemDuration(item),
    id: item.id_text,
    imageUrl: getItemPrimaryImageUrl(item),
    mediaType: mediumId === 4 ? 'tracks' : 'episodes',
    subtitle: item.channel?.title ?? null,
    title: item.title ?? item.id_text,
    updatedAt: item.pub_date ?? null,
  };
}

function itemSoundbiteToHomeRow(itemSoundbite: DTOItemSoundbite): PlaylistResourceHomeRow | null {
  const item = itemSoundbite.item;
  if (item === null || item === undefined) {
    return null;
  }

  return {
    description: itemDescriptionPlain(item),
    duration: itemSoundbite.duration?.trim() || itemDuration(item),
    id: `soundbite-${itemSoundbite.id_text}`,
    imageUrl: getItemPrimaryImageUrl(item),
    mediaType: 'clips',
    subtitle: item.channel?.title ?? null,
    title: itemSoundbite.title ?? itemSoundbite.id_text,
    updatedAt: item.pub_date ?? null,
  };
}

export function playlistResourceToHomeRow(
  resource: DTOPlaylistResource
): PlaylistResourceHomeRow | null {
  if (resource.clip) {
    return {
      description: itemDescriptionPlain(resource.clip.item),
      duration: itemDuration(resource.clip.item),
      id: `clip-${resource.clip.id_text}`,
      imageUrl: getItemPrimaryImageUrl(resource.clip.item),
      mediaType: 'clips',
      subtitle: resource.clip.item.channel?.title ?? null,
      title: resource.clip.title ?? resource.clip.item.title ?? resource.clip.id_text,
      updatedAt: resource.clip.item.pub_date ?? null,
    };
  }

  if (resource.item) {
    const itemRow = itemToHomeRow(resource.item);
    return {
      ...itemRow,
      id: `item-${itemRow.id}`,
    };
  }

  if (resource.item_soundbite?.item) {
    return itemSoundbiteToHomeRow(resource.item_soundbite);
  }

  return null;
}

export function queueResourceToHomeRow(
  resource: DTOQueueResource,
  idPrefix: 'history' | 'queue'
): QueueResourceHomeRow | null {
  // Clip / soundbite rows may arrive with `item: null` from the API; skip rather than throw so a
  // single incomplete resource cannot blank the whole Library Queue screen (errors.generic).
  if (resource.item === null || resource.item === undefined) {
    return null;
  }

  const itemRow = itemToHomeRow(resource.item);
  return {
    description: itemRow.description,
    duration: itemRow.duration,
    id: `${idPrefix}-${resource.id}`,
    imageUrl: itemRow.imageUrl,
    mediaType: itemRow.mediaType,
    queueResourceId: resource.id,
    subtitle: itemRow.subtitle,
    title: itemRow.title,
    updatedAt: itemRow.updatedAt,
  };
}

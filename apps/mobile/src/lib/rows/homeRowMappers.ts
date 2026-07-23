import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  DTOPlaylistResource,
  DTOQueueResource,
} from '@podverse/helpers';

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

export function channelToHomeRow(channel: DTOChannel): HomeFeedRowData {
  return {
    id: channel.id_text,
    imageUrl: channel.channel_images?.[0]?.url ?? null,
    subtitle: channel.channel_publisher?.name ?? null,
    title: channel.title ?? channel.id_text,
  };
}

export function clipToHomeRow(clip: DTOClip): HomeFeedRowData {
  return {
    id: clip.id_text,
    imageUrl: clip.item.item_images[0]?.url ?? clip.item.channel?.channel_images?.[0]?.url ?? null,
    subtitle: clip.item.channel?.title ?? null,
    title: clip.title ?? clip.item.title ?? clip.id_text,
  };
}

export function itemToHomeRow(item: DTOItem): ItemHomeRow {
  const mediumId = item.channel?.medium_id ?? null;
  return {
    id: item.id_text,
    imageUrl: item.item_images[0]?.url ?? item.channel?.channel_images?.[0]?.url ?? null,
    mediaType: mediumId === 4 ? 'tracks' : 'episodes',
    subtitle: item.channel?.title ?? null,
    title: item.title ?? item.id_text,
  };
}

function itemSoundbiteToHomeRow(itemSoundbite: DTOItemSoundbite): PlaylistResourceHomeRow {
  return {
    id: `soundbite-${itemSoundbite.id_text}`,
    imageUrl:
      itemSoundbite.item.item_images[0]?.url ??
      itemSoundbite.item.channel?.channel_images?.[0]?.url ??
      null,
    mediaType: 'clips',
    subtitle: itemSoundbite.item.channel?.title ?? null,
    title: itemSoundbite.title ?? itemSoundbite.id_text,
  };
}

export function playlistResourceToHomeRow(
  resource: DTOPlaylistResource
): PlaylistResourceHomeRow | null {
  if (resource.clip) {
    return {
      id: `clip-${resource.clip.id_text}`,
      imageUrl:
        resource.clip.item.item_images[0]?.url ??
        resource.clip.item.channel?.channel_images?.[0]?.url ??
        null,
      mediaType: 'clips',
      subtitle: resource.clip.item.channel?.title ?? null,
      title: resource.clip.title ?? resource.clip.item.title ?? resource.clip.id_text,
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
    id: `${idPrefix}-${resource.id}`,
    imageUrl: itemRow.imageUrl,
    mediaType: itemRow.mediaType,
    queueResourceId: resource.id,
    subtitle: itemRow.subtitle,
    title: itemRow.title,
  };
}

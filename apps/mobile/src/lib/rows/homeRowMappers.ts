import type {
  DTOChannel,
  DTOChannelImage,
  DTOItemImage,
  DTOItemSoundbite,
  DTOPlaylistResource,
  DTOQueueResource,
} from '@podverse/helpers';
import { primaryChannelListArtworkUrl, primaryListArtworkUrl } from '@podverse/helpers';
import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';
import { htmlToPlainText } from '@podverse/helpers/html';
import { formatHHMMSS } from '@podverse/helpers/time';

import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import type { HomeFeedRowData, HomeRowContentTarget } from '../../screens/home/homeFeedData';

export type ItemHomeRow = HomeFeedRowData & {
  mediaType: 'episodes' | 'tracks';
};

export type PlaylistResourceHomeRow = HomeFeedRowData & {
  mediaType: 'clips' | 'episodes' | 'tracks';
};

export type QueueResourceHomeRow = HomeFeedRowData & {
  mediaType: 'clips' | 'episodes' | 'tracks';
  queueResourceId: number;
};

type QueueResourceHomeRowOptions = {
  addByRssPrivateTitle?: string;
};

type PlaylistResourceHomeRowOptions = {
  addByRssPrivateTitle?: string;
};

/**
 * Structural subset shared by `DTOItem` and `DTOItemQueueItem` for home-row mapping. `channel` is
 * narrowed to the fields a row reads, so a row can be mapped without an entire channel graph.
 */
export type ItemHomeRowSource = {
  channel?: Pick<DTOChannel, 'channel_images' | 'medium_id' | 'title'>;
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

/**
 * Which parent titles a clip row may repeat. A screen that already names the podcast or the
 * episode leaves that flag off; a mixed list (Home, Browse, library, profile) sets both.
 */
export type ClipHomeRowOptions = {
  showChannelInfo?: boolean;
  showItemInfo?: boolean;
};

/** Home, Browse, My clips, profile, and playlists mix podcasts and episodes. */
export const MIXED_SOURCE_CLIP_ROW_OPTIONS: ClipHomeRowOptions = {
  showChannelInfo: true,
  showItemInfo: true,
};

/** Clip list rows can omit `item` when the API only returns the clip shell. */
export type ClipHomeRowSource = {
  end_time?: string | number | null;
  id_text: string;
  item?: ItemHomeRowSource | null;
  start_time?: string | number | null;
  title?: string | null;
};

const nonEmptyTitle = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const clipContextSubtitle = (
  channelTitle: string | null,
  itemTitle: string | null,
  options: ClipHomeRowOptions
): string | null => {
  const channel = options.showChannelInfo === true ? channelTitle : null;
  const item = options.showItemInfo === true ? itemTitle : null;
  if (channel !== null && item !== null) {
    return `${channel} • ${item}`;
  }
  return channel ?? item;
};

const clipTimeString = (value: string | number | null | undefined): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
};

/**
 * Clip start–end label. `formatRange` supplies the localized join (`info.time.start_end`) so this
 * stays free of catalog strings.
 */
export function clipListTimeRangeLabel(
  startTime: string | number | null | undefined,
  endTime: string | number | null | undefined,
  formatRange: (timeStart: string, timeEnd: string) => string
): string | null {
  const start = clipTimeString(startTime);
  if (start === null) {
    return null;
  }
  const timeStart = formatHHMMSS(start);
  const end = clipTimeString(endTime);
  if (end === null) {
    return timeStart;
  }
  return formatRange(timeStart, formatHHMMSS(end));
}

export function clipToHomeRow(
  clip: ClipHomeRowSource,
  options: ClipHomeRowOptions = {}
): HomeFeedRowData {
  const item = clip.item;
  const channelTitle = nonEmptyTitle(item?.channel?.title);
  const itemTitle = nonEmptyTitle(item?.title);
  const clipStartTime = clipTimeString(clip.start_time);
  const clipEndTime = clipTimeString(clip.end_time);

  if (item === null || item === undefined) {
    return {
      clipEndTime,
      clipStartTime,
      description: null,
      duration: null,
      id: clip.id_text,
      imageUrl: null,
      subtitle: null,
      title: nonEmptyTitle(clip.title) ?? clip.id_text,
      updatedAt: null,
    };
  }

  return {
    clipEndTime,
    clipStartTime,
    description: itemDescriptionPlain(item),
    duration: null,
    id: clip.id_text,
    imageUrl: getItemPrimaryImageUrl(item),
    subtitle: clipContextSubtitle(channelTitle, itemTitle, options),
    title: nonEmptyTitle(clip.title) ?? itemTitle ?? clip.id_text,
    updatedAt: item.pub_date ?? null,
  };
}

const readImageWidth = (value: unknown): number | null => {
  return typeof value === 'number' ? value : null;
};

const readItemImages = (value: unknown): DTOItemImage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const images: DTOItemImage[] = [];
  for (const maybeImage of value) {
    if (!isObjectLike(maybeImage)) {
      continue;
    }
    const url = getNonEmptyTrimmedStringProperty(maybeImage, 'url');
    if (url === null) {
      continue;
    }
    images.push({
      id: 0,
      image_width_size: readImageWidth(maybeImage.image_width_size),
      is_resized: maybeImage.is_resized === true,
      item_id: 0,
      url,
    });
  }
  return images;
};

const readChannelImages = (value: unknown): DTOChannelImage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const images: DTOChannelImage[] = [];
  for (const maybeImage of value) {
    if (!isObjectLike(maybeImage)) {
      continue;
    }
    const url = getNonEmptyTrimmedStringProperty(maybeImage, 'url');
    if (url === null) {
      continue;
    }
    images.push({
      channel_id: 0,
      id: 0,
      image_width_size: readImageWidth(maybeImage.image_width_size),
      is_resized: maybeImage.is_resized === true,
      url,
    });
  }
  return images;
};

const readClipItem = (value: unknown): ItemHomeRowSource | null => {
  if (!isObjectLike(value)) {
    return null;
  }
  const idText = getNonEmptyTrimmedStringProperty(value, 'id_text');
  if (idText === null) {
    return null;
  }

  const about = isObjectLike(value.item_about) ? value.item_about : null;
  const description = isObjectLike(value.item_description) ? value.item_description : null;
  const channelRecord = isObjectLike(value.channel) ? value.channel : null;
  const mediumId = channelRecord?.medium_id;

  return {
    channel:
      channelRecord === null
        ? undefined
        : {
            channel_images: readChannelImages(channelRecord.channel_images),
            medium_id: typeof mediumId === 'number' ? mediumId : 0,
            title: getNonEmptyTrimmedStringProperty(channelRecord, 'title'),
          },
    id_text: idText,
    item_about:
      about === null
        ? undefined
        : { duration: getNonEmptyTrimmedStringProperty(about, 'duration') },
    item_description:
      description === null
        ? undefined
        : { value: getNonEmptyTrimmedStringProperty(description, 'value') },
    item_images: readItemImages(value.item_images),
    pub_date: getNonEmptyTrimmedStringProperty(value, 'pub_date'),
    title: getNonEmptyTrimmedStringProperty(value, 'title'),
  };
};

/** Public clip list payloads are nested `DTOClip` objects, including rows cached for Home. */
export const clipHomeRowSourceFromUnknown = (value: unknown): ClipHomeRowSource | null => {
  if (!isObjectLike(value)) {
    return null;
  }
  const idText = getNonEmptyTrimmedStringProperty(value, 'id_text');
  if (idText === null) {
    return null;
  }

  const startTime = value.start_time;
  const endTime = value.end_time;

  return {
    end_time:
      typeof endTime === 'number' || typeof endTime === 'string' ? endTime : null,
    id_text: idText,
    item: readClipItem(value.item),
    start_time:
      typeof startTime === 'number' || typeof startTime === 'string' ? startTime : null,
    title: getNonEmptyTrimmedStringProperty(value, 'title'),
  };
};

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
  resource: DTOPlaylistResource,
  options?: PlaylistResourceHomeRowOptions
): PlaylistResourceHomeRow | null {
  if (resource.clip) {
    const clipRow = clipToHomeRow(resource.clip, MIXED_SOURCE_CLIP_ROW_OPTIONS);
    return {
      ...clipRow,
      id: `clip-${resource.clip.id_text}`,
      mediaType: 'clips',
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

  const addByRssHashId =
    typeof resource.add_by_rss_hash_id === 'string' && resource.add_by_rss_hash_id.length > 0
      ? resource.add_by_rss_hash_id
      : null;
  if (addByRssHashId === null) {
    return null;
  }

  const redactedTitle = options?.addByRssPrivateTitle ?? addByRssHashId;
  if (resource.is_add_by_rss_redacted === true) {
    return {
      description: null,
      duration: null,
      id: `add-by-rss-${resource.id}`,
      imageUrl: null,
      mediaType: 'episodes',
      subtitle: null,
      title: redactedTitle,
      updatedAt: null,
    };
  }

  const resourceData = resource.add_by_rss_resource_data;
  if (!isObjectLike(resourceData)) {
    return {
      description: null,
      duration: null,
      id: `add-by-rss-${resource.id}`,
      imageUrl: null,
      mediaType: 'episodes',
      subtitle: null,
      title: addByRssHashId,
      updatedAt: null,
    };
  }

  const descriptionRaw = getNonEmptyTrimmedStringProperty(resourceData, 'description');
  const title =
    getNonEmptyTrimmedStringProperty(resourceData, 'title') ??
    getNonEmptyTrimmedStringProperty(resourceData, 'id_text') ??
    addByRssHashId;
  const durationRaw = resourceData.duration;
  const pubDateRaw = resourceData.pub_date;
  const itemDescription = resourceData.item_description;

  const descriptionFromItem =
    isObjectLike(itemDescription) && typeof itemDescription.value === 'string'
      ? htmlToPlainText(itemDescription.value)
      : '';

  return {
    description: descriptionRaw ?? (descriptionFromItem.length > 0 ? descriptionFromItem : null),
    duration:
      typeof durationRaw === 'number'
        ? String(durationRaw)
        : typeof durationRaw === 'string' && durationRaw.trim().length > 0
          ? durationRaw.trim()
          : null,
    id: `add-by-rss-${resource.id}`,
    imageUrl: primaryListArtworkUrl(
      toAddByRssImages(resourceData.item_images),
      toAddByRssImages(resourceData.channel_images)
    ),
    mediaType: resolveAddByRssMediaType(resourceData),
    subtitle: getNonEmptyTrimmedStringProperty(resourceData, 'channel_title'),
    title,
    updatedAt:
      typeof pubDateRaw === 'string' && pubDateRaw.trim().length > 0 ? pubDateRaw.trim() : null,
  };
}

const toAddByRssImages = (value: unknown): DTOItemImage[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const images: DTOItemImage[] = [];
  for (const maybeImage of value) {
    if (!isObjectLike(maybeImage)) {
      continue;
    }
    const url = getNonEmptyTrimmedStringProperty(maybeImage, 'url');
    if (url === null) {
      continue;
    }
    const imageWidthSize = maybeImage.image_width_size;
    images.push({
      id: 0,
      item_id: 0,
      image_width_size: typeof imageWidthSize === 'number' ? imageWidthSize : null,
      is_resized: maybeImage.is_resized === true,
      url,
    });
  }

  return images;
};

const resolveAddByRssMediaType = (record: Record<string, unknown>): 'episodes' | 'tracks' => {
  const mediumIdRaw = record.medium_id;
  if (typeof mediumIdRaw === 'number') {
    return mediumIdRaw === 4 ? 'tracks' : 'episodes';
  }
  if (typeof mediumIdRaw === 'string') {
    const parsed = Number.parseInt(mediumIdRaw, 10);
    return Number.isNaN(parsed) ? 'episodes' : parsed === 4 ? 'tracks' : 'episodes';
  }

  return 'episodes';
};

const resolveQueueItem = (
  resource: DTOQueueResource,
  idPrefix: 'history' | 'queue'
): ItemHomeRowSource | null => {
  if (resource.item !== null && resource.item !== undefined) {
    return resource.item;
  }
  if (idPrefix === 'history') {
    return null;
  }

  if (resource.clip?.item !== null && resource.clip?.item !== undefined) {
    return resource.clip.item;
  }
  if (resource.item_soundbite?.item !== null && resource.item_soundbite?.item !== undefined) {
    return resource.item_soundbite.item;
  }

  return null;
};

/**
 * The playable resource behind a queue / history row. A soundbite has no content id these actions
 * can act on, so its row carries no target and its actions stay inert.
 */
const resolveQueueResourceContentTarget = (
  resource: DTOQueueResource,
  item: ItemHomeRowSource
): HomeRowContentTarget | undefined => {
  if (resource.clip) {
    return { idText: resource.clip.id_text, kind: 'clip' };
  }
  if (resource.item_soundbite) {
    return undefined;
  }
  return { idText: item.id_text, kind: 'item' };
};

const addByRssToHomeRow = (
  resource: DTOQueueResource,
  idPrefix: 'history' | 'queue',
  options?: QueueResourceHomeRowOptions
): QueueResourceHomeRow | null => {
  if (idPrefix === 'history') {
    return null;
  }

  const addByRssHashId =
    typeof resource.add_by_rss_hash_id === 'string' && resource.add_by_rss_hash_id.length > 0
      ? resource.add_by_rss_hash_id
      : null;
  if (addByRssHashId === null) {
    return null;
  }

  const redactedTitle = options?.addByRssPrivateTitle ?? addByRssHashId;
  if (resource.is_add_by_rss_redacted === true) {
    return {
      description: null,
      duration: null,
      id: `${idPrefix}-${resource.id}`,
      imageUrl: null,
      mediaType: 'episodes',
      queueResourceId: resource.id,
      subtitle: null,
      title: redactedTitle,
      updatedAt: null,
    };
  }

  const resourceData = resource.add_by_rss_resource_data;
  if (!isObjectLike(resourceData)) {
    return {
      description: null,
      duration: null,
      id: `${idPrefix}-${resource.id}`,
      imageUrl: null,
      mediaType: 'episodes',
      queueResourceId: resource.id,
      subtitle: null,
      title: addByRssHashId,
      updatedAt: null,
    };
  }

  const descriptionRaw = getNonEmptyTrimmedStringProperty(resourceData, 'description');
  const title =
    getNonEmptyTrimmedStringProperty(resourceData, 'title') ??
    getNonEmptyTrimmedStringProperty(resourceData, 'id_text') ??
    addByRssHashId;
  const durationRaw = resourceData.duration;
  const pubDateRaw = resourceData.pub_date;
  const itemDescription = resourceData.item_description;

  const descriptionFromItem =
    isObjectLike(itemDescription) && typeof itemDescription.value === 'string'
      ? htmlToPlainText(itemDescription.value)
      : '';

  return {
    description: descriptionRaw ?? (descriptionFromItem.length > 0 ? descriptionFromItem : null),
    duration:
      typeof durationRaw === 'number'
        ? String(durationRaw)
        : typeof durationRaw === 'string' && durationRaw.trim().length > 0
          ? durationRaw.trim()
          : null,
    id: `${idPrefix}-${resource.id}`,
    imageUrl: primaryListArtworkUrl(
      toAddByRssImages(resourceData.item_images),
      toAddByRssImages(resourceData.channel_images)
    ),
    mediaType: resolveAddByRssMediaType(resourceData),
    queueResourceId: resource.id,
    subtitle: getNonEmptyTrimmedStringProperty(resourceData, 'channel_title'),
    title,
    updatedAt:
      typeof pubDateRaw === 'string' && pubDateRaw.trim().length > 0 ? pubDateRaw.trim() : null,
  };
};

export function queueResourceToHomeRow(
  resource: DTOQueueResource,
  idPrefix: 'history' | 'queue',
  options?: QueueResourceHomeRowOptions
): QueueResourceHomeRow | null {
  const item = resolveQueueItem(resource, idPrefix);
  if (item !== null) {
    const itemRow = itemToHomeRow(item);
    const mediaType = resource.clip || resource.item_soundbite ? 'clips' : itemRow.mediaType;
    return {
      contentTarget: resolveQueueResourceContentTarget(resource, item),
      description: itemRow.description,
      duration: itemRow.duration,
      id: `${idPrefix}-${resource.id}`,
      imageUrl: itemRow.imageUrl,
      mediaType,
      queueResourceId: resource.id,
      subtitle: itemRow.subtitle,
      title: itemRow.title,
      updatedAt: itemRow.updatedAt,
    };
  }

  return addByRssToHomeRow(resource, idPrefix, options);
}

import type {
  DTOChannel,
  DTOChannelImage,
  DTOItemImage,
  DTOItemSoundbite,
  DTOPlaylistResource,
  DTOQueueResource,
  DTORemovedSource,
} from '@podverse/helpers';
import {
  getDescriptionPreviewText,
  isRemovedSource,
  primaryChannelListArtworkUrl,
  primaryListArtworkUrl,
} from '@podverse/helpers';
import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';
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
  /** Title when a removed entry has no snapshot episode or soundbite title. */
  playlistEntryRemovedLabel?: string;
};

/**
 * Structural subset shared by `DTOItem` and `DTOItemQueueItem` for home-row mapping. `channel` is
 * narrowed to the fields a row reads, so a row can be mapped without an entire channel graph.
 */
export type ItemHomeRowSource = {
  channel?: Pick<DTOChannel, 'channel_images' | 'medium_id' | 'title'>;
  id?: number;
  id_text: string;
  live_item?: unknown;
  item_about?: { duration?: string | null };
  item_description?: { value?: string | null; preview?: string | null; is_truncated?: boolean };
  item_images: DTOItemImage[];
  pub_date?: string | null;
  title?: string | null;
};

const itemDescriptionPlain = (item: ItemHomeRowSource): string | null => {
  const plain = getDescriptionPreviewText(item.item_description);
  return plain.length > 0 ? plain : null;
};

const itemDuration = (item: ItemHomeRowSource): string | null => {
  const duration = item.item_about?.duration?.trim() ?? '';
  return duration.length > 0 ? duration : null;
};

const itemPlayedCompletion = (item: ItemHomeRowSource): HomeFeedRowData['completion'] => {
  if (typeof item.id !== 'number') {
    return undefined;
  }
  if (item.live_item !== null && item.live_item !== undefined) {
    return undefined;
  }
  return { idText: item.id_text, kind: 'item', numericId: item.id };
};

const clipPlayedCompletion = (clip: {
  id?: number;
  id_text: string;
}): HomeFeedRowData['completion'] => {
  if (typeof clip.id !== 'number') {
    return undefined;
  }
  return { idText: clip.id_text, kind: 'clip', numericId: clip.id };
};

const recordIsLivestream = (record: Record<string, unknown>): boolean => {
  return (
    (record.liveItem !== undefined && record.liveItem !== null) ||
    (record.livestream_item !== undefined && record.livestream_item !== null)
  );
};

const addByRssPlayedCompletion = (
  hash: string,
  mediaType: 'episodes' | 'tracks',
  record: Record<string, unknown>
): HomeFeedRowData['completion'] => {
  if (mediaType === 'tracks' || recordIsLivestream(record)) {
    return undefined;
  }
  return { idText: hash, kind: 'add_by_rss', numericId: null };
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

/** Home, Browse, My Clips, profile, and playlists mix podcasts and episodes. */
export const MIXED_SOURCE_CLIP_ROW_OPTIONS: ClipHomeRowOptions = {
  showChannelInfo: true,
  showItemInfo: true,
};

/**
 * Clip list rows can omit `item` when the API only returns the clip shell.
 * `source_removed_at` is optional: a payload that omits it still plays.
 */
export type ClipHomeRowSource = {
  end_time?: string | number | null;
  id?: number;
  id_text: string;
  item?: ItemHomeRowSource | null;
  removed_source?: DTORemovedSource | null;
  source_removed_at?: string | null;
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
 * Clip start–end label. `formatRange` supplies the localized playback-range join so this stays
 * free of catalog strings.
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

const snapshotEpisodeAndShow = (source: DTORemovedSource | null | undefined): string | null => {
  const episode = nonEmptyTitle(source?.item_title);
  const show = nonEmptyTitle(source?.channel_title);
  if (episode !== null && show !== null) {
    return `${episode} • ${show}`;
  }
  return episode ?? show;
};

export function clipToHomeRow(
  clip: ClipHomeRowSource,
  options: ClipHomeRowOptions = {}
): HomeFeedRowData {
  const item = clip.item;
  const channelTitle = nonEmptyTitle(item?.channel?.title);
  const itemTitle = nonEmptyTitle(item?.title);
  const clipStartTime = clipTimeString(clip.start_time);
  const clipEndTime = clipTimeString(clip.end_time);

  if (isRemovedSource(clip)) {
    return {
      description: null,
      duration: null,
      id: clip.id_text,
      imageUrl: null,
      playable: false,
      removed: true,
      subtitle: snapshotEpisodeAndShow(clip.removed_source),
      title: nonEmptyTitle(clip.title) ?? clip.id_text,
      updatedAt: null,
    };
  }

  if (item === null || item === undefined) {
    const completion = clipPlayedCompletion(clip);
    return {
      clipEndTime,
      clipStartTime,
      ...(completion !== undefined ? { completion } : {}),
      description: null,
      duration: null,
      id: clip.id_text,
      imageUrl: null,
      subtitle: null,
      title: nonEmptyTitle(clip.title) ?? clip.id_text,
      updatedAt: null,
    };
  }

  const completion = clipPlayedCompletion(clip);
  return {
    clipEndTime,
    clipStartTime,
    ...(completion !== undefined ? { completion } : {}),
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
        : {
            preview: getNonEmptyTrimmedStringProperty(description, 'preview'),
            value: getNonEmptyTrimmedStringProperty(description, 'value'),
          },
    item_images: readItemImages(value.item_images),
    pub_date: getNonEmptyTrimmedStringProperty(value, 'pub_date'),
    title: getNonEmptyTrimmedStringProperty(value, 'title'),
  };
};

const readRemovedSource = (value: unknown): DTORemovedSource | null => {
  if (!isObjectLike(value)) {
    return null;
  }
  if (value.kind !== 'item' && value.kind !== 'soundbite') {
    return null;
  }
  return {
    channel_title: getNonEmptyTrimmedStringProperty(value, 'channel_title'),
    item_title: getNonEmptyTrimmedStringProperty(value, 'item_title'),
    kind: value.kind,
    pub_date: getNonEmptyTrimmedStringProperty(value, 'pub_date'),
    soundbite_title: getNonEmptyTrimmedStringProperty(value, 'soundbite_title'),
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
  const numericId = value.id;

  const sourceRemovedAt = value.source_removed_at;
  const removedSource = readRemovedSource(value.removed_source);

  return {
    end_time: typeof endTime === 'number' || typeof endTime === 'string' ? endTime : null,
    ...(typeof numericId === 'number' ? { id: numericId } : {}),
    id_text: idText,
    item: readClipItem(value.item),
    ...(removedSource !== null ? { removed_source: removedSource } : {}),
    ...(typeof sourceRemovedAt === 'string' && sourceRemovedAt.length > 0
      ? { source_removed_at: sourceRemovedAt }
      : {}),
    start_time: typeof startTime === 'number' || typeof startTime === 'string' ? startTime : null,
    title: getNonEmptyTrimmedStringProperty(value, 'title'),
  };
};

export function itemToHomeRow(item: ItemHomeRowSource): ItemHomeRow {
  const mediumId = item.channel?.medium_id ?? null;
  const completion = itemPlayedCompletion(item);
  return {
    ...(completion !== undefined ? { completion } : {}),
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
    completion: {
      idText: itemSoundbite.id_text,
      kind: 'soundbite',
      numericId: itemSoundbite.id,
    },
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
    const clipSource = isRemovedSource(resource)
      ? {
          ...resource.clip,
          removed_source: resource.clip.removed_source ?? resource.removed_source,
          source_removed_at: resource.clip.source_removed_at ?? resource.source_removed_at,
        }
      : resource.clip;
    const clipRow = clipToHomeRow(clipSource, MIXED_SOURCE_CLIP_ROW_OPTIONS);
    return {
      ...clipRow,
      id: `clip-${resource.clip.id_text}`,
      mediaType: 'clips',
    };
  }

  if (isRemovedSource(resource)) {
    const snapshot = resource.removed_source;
    const title =
      nonEmptyTitle(snapshot?.item_title) ??
      nonEmptyTitle(snapshot?.soundbite_title) ??
      options?.playlistEntryRemovedLabel ??
      String(resource.id);
    return {
      description: null,
      duration: null,
      id: `removed-${resource.id}`,
      imageUrl: null,
      mediaType: 'episodes',
      playable: false,
      removed: true,
      subtitle: nonEmptyTitle(snapshot?.channel_title),
      title,
      updatedAt: snapshot?.pub_date ?? null,
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

  const descriptionFromItem = isObjectLike(itemDescription)
    ? getDescriptionPreviewText({
        preview: getNonEmptyTrimmedStringProperty(itemDescription, 'preview'),
        value: getNonEmptyTrimmedStringProperty(itemDescription, 'value'),
      })
    : '';

  const mediaType = resolveAddByRssMediaType(resourceData);
  const completion = addByRssPlayedCompletion(addByRssHashId, mediaType, resourceData);

  return {
    ...(completion !== undefined ? { completion } : {}),
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
    mediaType,
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

  const descriptionFromItem = isObjectLike(itemDescription)
    ? getDescriptionPreviewText({
        preview: getNonEmptyTrimmedStringProperty(itemDescription, 'preview'),
        value: getNonEmptyTrimmedStringProperty(itemDescription, 'value'),
      })
    : '';

  const mediaType = resolveAddByRssMediaType(resourceData);
  const completion = addByRssPlayedCompletion(addByRssHashId, mediaType, resourceData);

  return {
    ...(completion !== undefined ? { completion } : {}),
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
    mediaType,
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
    const completion = resource.clip
      ? clipPlayedCompletion(resource.clip)
      : resource.item_soundbite
        ? {
            idText: resource.item_soundbite.id_text,
            kind: 'soundbite' as const,
            numericId: resource.item_soundbite.id,
          }
        : itemRow.completion;
    return {
      ...(completion !== undefined ? { completion } : {}),
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

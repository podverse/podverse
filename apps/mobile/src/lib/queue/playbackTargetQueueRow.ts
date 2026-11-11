import { getDescriptionPreviewText, primaryListArtworkUrl } from '@podverse/helpers';
import type { AddByRSSResourceData, DTOItemImage } from '@podverse/helpers/dto';
import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';
import { getQueueMediumIdFromMediumId, MediumEnum } from '@podverse/helpers/medium';
import type { PlaybackTarget } from '@podverse/playback-core';

import type { HomeFeedRowData } from '../../screens/home/homeFeedData';
import { addByRssPlaybackMediaId } from '../addByRss/resourceData';
import { isMusicPlaybackTarget } from '../playback/engineAudioProfile';
import { clipToHomeRow, type ItemHomeRow, itemToHomeRow } from '../rows/homeRowMappers';

export type PlaybackTargetQueueRow = HomeFeedRowData & {
  mediaType: 'clips' | 'episodes' | 'tracks';
};

/**
 * Queue chip medium for the item in the player. Music goes on the music queue; podcast and
 * video go on the AV queue.
 */
export function queueMediumIdForPlaybackTarget(target: PlaybackTarget): number | null {
  if (isMusicPlaybackTarget(target)) {
    return MediumEnum.Music;
  }
  if (target.kind === 'add-by-rss') {
    const mediumId = target.resourceData.medium_id;
    return typeof mediumId === 'number' ? getQueueMediumIdFromMediumId(mediumId) : null;
  }
  if (target.kind === 'livestream') {
    return getQueueMediumIdFromMediumId(target.channel.medium_id);
  }
  if ('channel' in target) {
    return getQueueMediumIdFromMediumId(target.channel.medium_id);
  }
  return null;
}

const toImages = (value: unknown): DTOItemImage[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is DTOItemImage => isObjectLike(entry));
};

const addByRssResourceToQueueRow = (resourceData: AddByRSSResourceData): PlaybackTargetQueueRow => {
  const mediaId = addByRssPlaybackMediaId(resourceData);
  const title =
    getNonEmptyTrimmedStringProperty(resourceData, 'title') ??
    getNonEmptyTrimmedStringProperty(resourceData, 'id_text') ??
    mediaId;
  const durationRaw = resourceData.duration;
  const pubDateRaw = resourceData.pub_date;
  const itemDescription = resourceData.item_description;
  const descriptionFromItem = isObjectLike(itemDescription)
    ? getDescriptionPreviewText({
        preview: getNonEmptyTrimmedStringProperty(itemDescription, 'preview'),
        value: getNonEmptyTrimmedStringProperty(itemDescription, 'value'),
      })
    : '';
  const descriptionRaw = getNonEmptyTrimmedStringProperty(resourceData, 'description');
  const mediaType: 'episodes' | 'tracks' =
    resourceData.medium_id === MediumEnum.Music ? 'tracks' : 'episodes';

  return {
    description: descriptionRaw ?? (descriptionFromItem.length > 0 ? descriptionFromItem : null),
    duration:
      typeof durationRaw === 'number'
        ? String(durationRaw)
        : typeof durationRaw === 'string' && durationRaw.trim().length > 0
          ? durationRaw.trim()
          : null,
    id: `player-now-playing-${mediaId}`,
    imageUrl: primaryListArtworkUrl(
      toImages(resourceData.item_images),
      toImages(resourceData.channel_images)
    ),
    mediaType,
    subtitle: getNonEmptyTrimmedStringProperty(resourceData, 'channel_title'),
    title,
    updatedAt:
      typeof pubDateRaw === 'string' && pubDateRaw.trim().length > 0 ? pubDateRaw.trim() : null,
  };
};

/**
 * A queue Now Playing row built from the player when that item is not a queue resource.
 */
export function playbackTargetToQueueHomeRow(
  target: PlaybackTarget
): PlaybackTargetQueueRow | null {
  if (target.kind === 'clip') {
    const row = clipToHomeRow(target.clip);
    return {
      ...row,
      id: `player-now-playing-${row.id}`,
      mediaType: 'clips',
    };
  }
  if (target.kind === 'soundbite') {
    const itemRow = itemToHomeRow(target.item);
    return {
      ...itemRow,
      id: `player-now-playing-soundbite-${target.soundbite.id_text}`,
      mediaType: 'clips',
      title: target.soundbite.title?.trim() || itemRow.title,
    };
  }
  if (
    target.kind === 'item-podcast' ||
    target.kind === 'item-video' ||
    target.kind === 'item-music'
  ) {
    const itemRow: ItemHomeRow = itemToHomeRow(target.item);
    return {
      ...itemRow,
      id: `player-now-playing-${itemRow.id}`,
    };
  }
  if (target.kind === 'chapter') {
    const itemRow = itemToHomeRow(target.item);
    return {
      ...itemRow,
      id: `player-now-playing-chapter-${target.chapter.id_text}`,
      mediaType: itemRow.mediaType,
      title: target.chapter.title?.trim() || itemRow.title,
    };
  }
  if (target.kind === 'add-by-rss') {
    return addByRssResourceToQueueRow(target.resourceData);
  }
  if (target.kind === 'livestream' && target.item) {
    const itemRow = itemToHomeRow(target.item);
    return {
      ...itemRow,
      id: `player-now-playing-${itemRow.id}`,
    };
  }
  return null;
}

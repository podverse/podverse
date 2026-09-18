import { MEDIA_JUMP_BACK_SECONDS, MEDIA_JUMP_FORWARD_SECONDS, MediumEnum } from '@podverse/helpers';
import type { AddByRSSResourceData } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';

import type { QueueMutationKind, QueueMutationMediaType } from '../../hooks/useQueueMutations';

export const FULL_PLAYER_JUMP_BACK_SECONDS = MEDIA_JUMP_BACK_SECONDS;
export const FULL_PLAYER_JUMP_FORWARD_SECONDS = MEDIA_JUMP_FORWARD_SECONDS;

export type FullPlayerQueueMutationTarget = {
  idText: string;
  kind: QueueMutationKind;
  mediaType: QueueMutationMediaType;
};

export type FullPlayerAddToPlaylistTarget = {
  medium: 'av' | 'music';
} & (
  | {
      idText: string;
      kind: 'clip' | 'item' | 'soundbite';
    }
  | { kind: 'add-by-rss'; resourceData: AddByRSSResourceData }
);

const addToPlaylistMediumFromChannel = (target: PlaybackTarget): 'av' | 'music' => {
  if (target.kind === 'add-by-rss') {
    return target.resourceData.medium_id === MediumEnum.Music ? 'music' : 'av';
  }
  return target.channel.medium_id === MediumEnum.Music ? 'music' : 'av';
};

const itemFromTarget = (target: PlaybackTarget | null): DTOItem | null => {
  if (target === null) {
    return null;
  }
  switch (target.kind) {
    case 'clip':
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return target.item;
    case 'livestream':
      return target.item;
    case 'add-by-rss':
      return null;
  }
};

export const hasNextQueueItem = (
  manualUpcomingCount: number,
  autoUpcomingCount: number
): boolean => {
  return manualUpcomingCount > 0 || autoUpcomingCount > 0;
};

export const shouldShowV4vAction = (
  target: PlaybackTarget | null,
  isV4vEnabled: boolean
): boolean => {
  if (!isV4vEnabled) {
    return false;
  }
  const item = itemFromTarget(target);
  return item !== null && item.item_values.length > 0;
};

export const resolveAddToPlaylistTarget = (
  target: PlaybackTarget | null
): FullPlayerAddToPlaylistTarget | null => {
  if (target === null) {
    return null;
  }
  const medium = addToPlaylistMediumFromChannel(target);
  switch (target.kind) {
    case 'clip':
      return { idText: target.clip.id_text, kind: 'clip', medium };
    case 'soundbite':
      return { idText: target.soundbite.id_text, kind: 'soundbite', medium };
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return { idText: target.item.id_text, kind: 'item', medium };
    case 'livestream':
      return target.item !== null ? { idText: target.item.id_text, kind: 'item', medium } : null;
    case 'add-by-rss':
      return { kind: 'add-by-rss', medium, resourceData: target.resourceData };
  }
};

export const resolveQueueMutationTarget = (
  target: PlaybackTarget | null
): FullPlayerQueueMutationTarget | null => {
  if (target === null) {
    return null;
  }
  switch (target.kind) {
    case 'clip':
      return { idText: target.clip.id_text, kind: 'clip', mediaType: 'clips' };
    case 'item-music':
      return { idText: target.item.id_text, kind: 'item', mediaType: 'tracks' };
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
      return { idText: target.item.id_text, kind: 'item', mediaType: 'episodes' };
    case 'livestream':
      return target.item !== null
        ? { idText: target.item.id_text, kind: 'item', mediaType: 'episodes' }
        : null;
    case 'add-by-rss':
      return null;
  }
};

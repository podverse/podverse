import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';
import type { MusicItemPlaybackIntent, PlaybackTarget } from '@podverse/playback-core';

import type { MoveNowPlayingToHistoryTarget, PlaybackStatsTargets } from '../../data';

/**
 * Build the `PlaybackTarget` for an item by medium (audio-first). Mirrors playback-core
 * `playbackTargetFromStandardLoad`, but reimplemented here so mobile imports `MediumEnum` from the
 * mobile-safe `@podverse/helpers/medium` subpath instead of the Node-heavy helpers barrel.
 */
export function buildItemPlaybackTarget(
  item: DTOItem,
  channel: DTOChannel,
  musicIntent: MusicItemPlaybackIntent
): PlaybackTarget {
  if (channel.medium_id === MediumEnum.Music) {
    return { channel, intent: musicIntent, item, kind: 'item-music' };
  }
  if (channel.medium_id === MediumEnum.Video) {
    return { channel, item, kind: 'item-video' };
  }
  return { channel, item, kind: 'item-podcast' };
}

export function buildClipPlaybackTarget(
  clip: DTOClip,
  item: DTOItem,
  channel: DTOChannel
): PlaybackTarget {
  return { channel, clip, item, kind: 'clip' };
}

export function buildSoundbitePlaybackTarget(
  soundbite: DTOItemSoundbite,
  item: DTOItem,
  channel: DTOChannel
): PlaybackTarget {
  return { channel, item, kind: 'soundbite', soundbite };
}

export function buildChapterPlaybackTarget(
  chapter: DTOItemChapter,
  item: DTOItem,
  channel: DTOChannel
): PlaybackTarget {
  return { channel, chapter, item, kind: 'chapter' };
}

/**
 * Map a playing target to the move-to-history target used on ended/skip. Chapters and item kinds
 * move the underlying item; add-by-RSS / livestream do not participate in the server queue lifecycle
 * (add-by-RSS uses its own history flow), so they return `null`.
 */
export function playbackTargetToHistoryTarget(
  target: PlaybackTarget,
  playbackPositionSeconds: number
): MoveNowPlayingToHistoryTarget | null {
  const playbackPosition = String(Math.max(0, Math.floor(playbackPositionSeconds)));
  switch (target.kind) {
    case 'clip':
      return { completed: true, idText: target.clip.id_text, kind: 'clip', playbackPosition };
    case 'soundbite':
      return {
        completed: true,
        idText: target.soundbite.id_text,
        kind: 'soundbite',
        playbackPosition,
      };
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return { completed: true, idText: target.item.id_text, kind: 'item', playbackPosition };
    case 'add-by-rss':
    case 'livestream':
      return null;
  }
}

/**
 * Listen-stats targets for a playback target (mirrors web NonLiveMediaOrchestrator: track the
 * channel, the clip when playing a clip, and the item). Add-by-RSS / livestream do not record stats.
 */
export function playbackTargetToStatsTargets(target: PlaybackTarget): PlaybackStatsTargets {
  switch (target.kind) {
    case 'clip':
      return {
        channelIdText: target.channel.id_text,
        clipIdText: target.clip.id_text,
        itemIdText: target.item.id_text,
      };
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return {
        channelIdText: target.channel.id_text,
        clipIdText: null,
        itemIdText: target.item.id_text,
      };
    case 'add-by-rss':
    case 'livestream':
      return { channelIdText: null, clipIdText: null, itemIdText: null };
  }
}

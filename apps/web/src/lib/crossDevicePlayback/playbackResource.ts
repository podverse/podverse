import type {
  AddByRSSResourceData,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOPlaybackResourceRef,
  DTOPlaybackResourceSummary,
  PlaybackSpeedValue,
  PlaybackStatePublishBody,
  PlaybackStatus,
} from '@podverse/helpers';
import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  PLAYBACK_IMAGE_URL_MAX_LENGTH,
  PLAYBACK_RATE_MAX,
  PLAYBACK_RATE_MIN,
  PLAYBACK_SPEED_VALUES,
  PLAYBACK_TEXT_FIELD_MAX_LENGTH,
  shouldUseChapterArtwork,
} from '@podverse/helpers';
import { toPlaybackMedium } from '@podverse/helpers/accountPlaybackStream';

import { IMAGES } from '../../constants/images';
import type { MediaPlayerAddByRSSState } from '../../contexts/MediaPlayer';
import { addByRSSPlaybackIdentity } from '../../hooks/playbackHandoffState';
import { getMediaPlayerInfoResolution } from '../../utils/mediaPlayer/mediaPlayerInfoResolution';
import { checkIsLiveItem } from '../../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import type { PlaybackTarget } from '../playback';
import { parsePlaybackSeconds } from '../playback';

export type PlayerResourceInput = {
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpChannel: DTOChannel | null;
  mpItem: DTOItem | null;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpItemChapter: DTOItemChapter | null;
  mpItemChapters: DTOItemChapter[] | null;
};

/** Distances closer than this count as a tie, so float noise cannot pick the higher speed. */
const PLAYBACK_SPEED_TIE_EPSILON = 1e-9;

function addByRSSResourceRef(resourceData: AddByRSSResourceData): DTOPlaybackResourceRef | null {
  const hashId = addByRSSPlaybackIdentity(resourceData);
  return hashId === null ? null : { kind: 'add_by_rss', add_by_rss_hash_id: hashId };
}

/** A chapter plays as its item. */
export function buildPlaybackResourceRefFromPlayer(
  player: PlayerResourceInput
): DTOPlaybackResourceRef | null {
  if (player.mpAddByRSS) {
    return addByRSSResourceRef(player.mpAddByRSS.resourceData);
  }
  if (player.mpClip) {
    return { kind: 'clip', clip_id_text: player.mpClip.id_text };
  }
  if (player.mpItemSoundbite) {
    return { kind: 'soundbite', item_soundbite_id_text: player.mpItemSoundbite.id_text };
  }
  if (player.mpItem) {
    return { kind: 'item', item_id_text: player.mpItem.id_text };
  }
  return null;
}

export function buildPlaybackResourceRefFromTarget(
  target: PlaybackTarget
): DTOPlaybackResourceRef | null {
  switch (target.kind) {
    case 'clip':
      return { kind: 'clip', clip_id_text: target.clip.id_text };
    case 'soundbite':
      return { kind: 'soundbite', item_soundbite_id_text: target.soundbite.id_text };
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return { kind: 'item', item_id_text: target.item.id_text };
    case 'livestream':
      return target.item === null ? null : { kind: 'item', item_id_text: target.item.id_text };
    case 'add-by-rss':
      return addByRSSResourceRef(target.resourceData);
  }
}

/** Start position a target asks for: an explicit value, else a chapter's start, else null. */
export function playbackStartSecondsFromTarget(
  target: PlaybackTarget,
  explicitSeconds: number | undefined
): number | null {
  const explicit = parsePlaybackSeconds(explicitSeconds);
  if (explicit !== undefined) {
    return explicit;
  }
  if (target.kind === 'chapter') {
    return parsePlaybackSeconds(target.chapter.start_time) ?? null;
  }
  return null;
}

export function isSamePlaybackResourceRef(
  a: DTOPlaybackResourceRef | null,
  b: DTOPlaybackResourceRef | null
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  switch (a.kind) {
    case 'item':
      return b.kind === 'item' && a.item_id_text === b.item_id_text;
    case 'clip':
      return b.kind === 'clip' && a.clip_id_text === b.clip_id_text;
    case 'soundbite':
      return b.kind === 'soundbite' && a.item_soundbite_id_text === b.item_soundbite_id_text;
    case 'add_by_rss':
      return b.kind === 'add_by_rss' && a.add_by_rss_hash_id === b.add_by_rss_hash_id;
  }
}

function truncatePlaybackText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  return value.length > PLAYBACK_TEXT_FIELD_MAX_LENGTH
    ? value.slice(0, PLAYBACK_TEXT_FIELD_MAX_LENGTH)
    : value;
}

/**
 * What other devices show for this player. The title is the episode or track title, never a
 * chapter, clip, or soundbite title. The image is the first player-bar artwork candidate.
 */
export function buildPlaybackResourceSummary(
  player: PlayerResourceInput,
  currentTimeSeconds: number
): DTOPlaybackResourceSummary | null {
  const ref = buildPlaybackResourceRefFromPlayer(player);
  if (ref === null) {
    return null;
  }

  const info = getMediaPlayerInfoResolution({
    mpChannel: player.mpChannel,
    mpItem: player.mpItem,
    mpAddByRSS: player.mpAddByRSS,
    mpClip: player.mpClip,
    mpItemSoundbite: player.mpItemSoundbite,
    mpItemChapter: player.mpItemChapter,
    mpItemChapters: player.mpItemChapters,
    currentTimeSeconds,
  });

  const { channelImages, itemImages } = getMediaPlayerArtworkSources({
    mpChannel: player.mpChannel,
    mpItem: player.mpItem,
    mpAddByRSSResourceData: player.mpAddByRSS?.resourceData,
  });
  const imageCandidates = buildMediaPlayerArtworkImageCandidates({
    channelImages,
    itemImages,
    chapterImageUrl: player.mpItemChapter?.img,
    includeChapterImage: shouldUseChapterArtwork({
      mpItemChapter: player.mpItemChapter,
      mpClip: player.mpClip,
      mpItemSoundbite: player.mpItemSoundbite,
    }),
    imageSizeTarget: IMAGES.MEDIA_PLAYER.DESKTOP.MINI.SIZE_FIND_TARGET,
    imageSizeComparison: 'lesser',
    artworkRole: 'list',
  });
  const imageUrl = imageCandidates[0] ?? null;

  return {
    ref,
    medium: player.mpAddByRSS
      ? toPlaybackMedium(player.mpAddByRSS.resourceData.medium_id)
      : toPlaybackMedium(player.mpChannel?.medium_id),
    title: truncatePlaybackText(info.itemTitle),
    channel_title: truncatePlaybackText(info.channelTitle),
    image_url:
      imageUrl !== null && imageUrl.length <= PLAYBACK_IMAGE_URL_MAX_LENGTH ? imageUrl : null,
  };
}

export function isPlayerResourceLive(
  player: Pick<PlayerResourceInput, 'mpItem' | 'mpAddByRSS'>
): boolean {
  if (checkIsLiveItem(player.mpItem)) {
    return true;
  }
  const liveItem = player.mpAddByRSS?.resourceData.liveItem;
  return typeof liveItem === 'object' && liveItem !== null;
}

function resolvePublishStatus(isPlaying: boolean, shouldPlay: boolean): PlaybackStatus {
  if (isPlaying) {
    return 'playing';
  }
  return shouldPlay ? 'loading' : 'paused';
}

function clampPlaybackRate(rate: number): number {
  if (!Number.isFinite(rate)) {
    return 1;
  }
  return Math.min(PLAYBACK_RATE_MAX, Math.max(PLAYBACK_RATE_MIN, rate));
}

/** A live item has no position or duration and always rate 1. Nothing loaded gives the release body. */
export function buildPlaybackStatePublishBody(params: {
  player: PlayerResourceInput;
  isPlaying: boolean;
  shouldPlay: boolean;
  currentTimeSeconds: number;
  durationSeconds: number;
  rate: number;
  claim: boolean;
}): PlaybackStatePublishBody {
  const resource = buildPlaybackResourceSummary(params.player, params.currentTimeSeconds);
  if (resource === null) {
    return {
      claim: false,
      resource: null,
      status: 'paused',
      is_live: false,
      position_seconds: null,
      duration_seconds: null,
      rate: 1,
    };
  }

  const status = resolvePublishStatus(params.isPlaying, params.shouldPlay);
  if (isPlayerResourceLive(params.player)) {
    return {
      claim: params.claim,
      resource,
      status,
      is_live: true,
      position_seconds: null,
      duration_seconds: null,
      rate: 1,
    };
  }

  return {
    claim: params.claim,
    resource,
    status,
    is_live: false,
    position_seconds: Number.isFinite(params.currentTimeSeconds)
      ? Math.max(0, params.currentTimeSeconds)
      : 0,
    duration_seconds:
      Number.isFinite(params.durationSeconds) && params.durationSeconds > 0
        ? params.durationSeconds
        : null,
    rate: clampPlaybackRate(params.rate),
  };
}

/** The web speed list value nearest `rate`; ties go to the lower value. */
export function nearestPlaybackSpeedValue(rate: number): PlaybackSpeedValue {
  if (!Number.isFinite(rate)) {
    return 1;
  }
  let nearest: PlaybackSpeedValue = 1;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const value of PLAYBACK_SPEED_VALUES) {
    const distance = Math.abs(value - rate);
    if (distance < nearestDistance - PLAYBACK_SPEED_TIE_EPSILON) {
      nearest = value;
      nearestDistance = distance;
    }
  }
  return nearest;
}

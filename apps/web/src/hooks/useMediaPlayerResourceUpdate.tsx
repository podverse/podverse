import { useEffect, useRef } from 'react';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { buildLabeledItemEnclosures } from '@podverse/helpers';

import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import type { AutoQueueConfig } from '../contexts/AutoQueue';
import { useAutoQueue } from '../contexts/AutoQueue';
import { useEmbedPlaybackGuardrails } from '../contexts/EmbedPlaybackMode';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueueResourcesAbridgedIndex } from '../contexts/QueueResourcesAbridgedIndex';
import { crossDevicePlaybackStore } from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import {
  buildPlaybackResourceRefFromTarget,
  playbackStartSecondsFromTarget,
} from '../lib/crossDevicePlayback/playbackResource';
import { resolveRemotePickCommand } from '../lib/crossDevicePlayback/remotePlaybackRouting';
import { sendPlaybackCommand } from '../lib/crossDevicePlayback/sendPlaybackCommand';
import type { PlaybackLoadDecision, PlaybackLoadRequest, PlaybackTarget } from '../lib/playback';
import { parsePlaybackSeconds } from '../lib/playback';
import { checkIsLiveItem } from '../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import { useQueueResourcesUpdateNowPlaying } from './useQueueResourceUpdateNowPlaying';

export type MediaPlayerPlaybackLoadInput = PlaybackLoadRequest & {
  shouldPlay?: boolean;
  isPlaying?: boolean;
  itemChapterShouldSeek: boolean;
  newAutoQueueConfig: AutoQueueConfig;
  autoQueueShouldClear: boolean;
  enclosureSelectedParams: EnclosureSelectedParams | 'use-active-item-or-default';
  skipMoveNowPlayingToHistory: boolean;
  /**
   * Empty-player queue hydration loads the row without a listen. A `play` write
   * would stamp `last_played_at` and move the zone by inventing one.
   */
  skipNowPlayingWrite?: boolean;
};

function isLiveTarget(target: PlaybackTarget): boolean {
  switch (target.kind) {
    case 'livestream':
      return checkIsLiveItem(target.item);
    case 'add-by-rss':
      return false;
    default:
      return checkIsLiveItem(target.item);
  }
}

function durationHintSecondsForTarget(
  target: PlaybackTarget,
  abridged: QueueResourcesAbridgedIndex
): number {
  switch (target.kind) {
    case 'clip':
      return parsePlaybackSeconds(abridged.clips[target.clip.id]?.d) ?? 0;
    case 'soundbite':
      return parsePlaybackSeconds(abridged.item_soundbites[target.soundbite.id]?.d) ?? 0;
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return parsePlaybackSeconds(abridged.items[target.item.id]?.d) ?? 0;
    case 'livestream':
      return 0;
    case 'add-by-rss':
      return 0;
  }
}

function itemForEnclosureCompare(target: PlaybackTarget): DTOItem | null {
  switch (target.kind) {
    case 'add-by-rss':
      return null;
    case 'livestream':
      return target.item;
    default:
      return target.item;
  }
}

function nowPlayingFieldsFromTarget(target: PlaybackTarget): {
  mpChannel: DTOChannel | null;
  mpClip: DTOClip | null;
  mpItem: DTOItem | null;
  mpItemSoundbite: DTOItemSoundbite | null;
} {
  switch (target.kind) {
    case 'clip':
      return {
        mpChannel: target.channel,
        mpClip: target.clip,
        mpItem: target.item,
        mpItemSoundbite: null,
      };
    case 'soundbite':
      return {
        mpChannel: target.channel,
        mpClip: null,
        mpItem: target.item,
        mpItemSoundbite: target.soundbite,
      };
    case 'chapter':
      return {
        mpChannel: target.channel,
        mpClip: null,
        mpItem: target.item,
        mpItemSoundbite: null,
      };
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return {
        mpChannel: target.channel,
        mpClip: null,
        mpItem: target.item,
        mpItemSoundbite: null,
      };
    case 'livestream':
      return {
        mpChannel: target.channel,
        mpClip: null,
        mpItem: target.item,
        mpItemSoundbite: null,
      };
    case 'add-by-rss':
      return {
        mpChannel: null,
        mpClip: null,
        mpItem: null,
        mpItemSoundbite: null,
      };
  }
}

function applyTargetToMediaPlayerState(
  target: PlaybackTarget,
  itemChapterShouldSeek: boolean,
  setters: {
    setMPChannel: (v: DTOChannel | null) => void;
    setMPClip: (v: DTOClip | null) => void;
    setMPItem: (v: DTOItem | null) => void;
    setMPItemChapter: (v: DTOItemChapter | null) => void;
    setMPItemChapterShouldSeek: (v: boolean) => void;
    setMPItemSoundbite: (v: DTOItemSoundbite | null) => void;
  }
): void {
  switch (target.kind) {
    case 'clip':
      setters.setMPChannel(target.channel);
      setters.setMPClip(target.clip);
      setters.setMPItem(target.item);
      setters.setMPItemChapter(null);
      setters.setMPItemChapterShouldSeek(false);
      setters.setMPItemSoundbite(null);
      return;
    case 'soundbite':
      setters.setMPChannel(target.channel);
      setters.setMPClip(null);
      setters.setMPItem(target.item);
      setters.setMPItemChapter(null);
      setters.setMPItemChapterShouldSeek(false);
      setters.setMPItemSoundbite(target.soundbite);
      return;
    case 'chapter':
      setters.setMPChannel(target.channel);
      setters.setMPClip(null);
      setters.setMPItem(target.item);
      setters.setMPItemChapter(target.chapter);
      setters.setMPItemChapterShouldSeek(itemChapterShouldSeek);
      setters.setMPItemSoundbite(null);
      return;
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      setters.setMPChannel(target.channel);
      setters.setMPClip(null);
      setters.setMPItem(target.item);
      setters.setMPItemChapter(null);
      setters.setMPItemChapterShouldSeek(false);
      setters.setMPItemSoundbite(null);
      return;
    case 'livestream':
      setters.setMPChannel(target.channel);
      setters.setMPClip(null);
      setters.setMPItem(target.item);
      setters.setMPItemChapter(null);
      setters.setMPItemChapterShouldSeek(false);
      setters.setMPItemSoundbite(null);
      return;
    case 'add-by-rss':
      return;
  }
}

export function useMediaPlayerResourceUpdate() {
  const {
    applyPlaybackLoad,
    setMPAddByRSS,
    setMPShouldPlay,
    setMPChannel,
    setMPClip,
    setMPItem,
    setMPItemChapter,
    setMPItemChapterShouldSeek,
    setMPItemSoundbite,
    setMPItemLabeledItemEnclosures,
    setMPEnclosureSelectedParams,
    setMPIsPlaying,
    setMPDuration,
    mpEnclosureSelectedParams,
    mpItem,
  } = useMediaPlayer();
  const { autoQueueConfig, setAutoQueueConfig, setAutoQueueResources, setAutoQueueActiveRow } =
    useAutoQueue();
  const { setAddByRSSListContext } = useAddByRSSListContext();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const updateNowPlaying = useQueueResourcesUpdateNowPlaying();
  const { queueResourcesAbridgedIndex } = useQueueResourcesAbridgedIndex();
  const embedGuardrails = useEmbedPlaybackGuardrails();

  const queueResourcesAbridgedIndexRef = useRef(queueResourcesAbridgedIndex);
  useEffect(() => {
    queueResourcesAbridgedIndexRef.current = queueResourcesAbridgedIndex;
  }, [queueResourcesAbridgedIndex]);

  const autoQueueConfigRef = useRef(autoQueueConfig);
  useEffect(() => {
    autoQueueConfigRef.current = autoQueueConfig;
  }, [autoQueueConfig]);

  const mpEnclosureSelectedParamsRef = useRef(mpEnclosureSelectedParams);
  useEffect(() => {
    mpEnclosureSelectedParamsRef.current = mpEnclosureSelectedParams;
  }, [mpEnclosureSelectedParams]);

  const mpItemRef = useRef(mpItem);
  useEffect(() => {
    mpItemRef.current = mpItem;
  }, [mpItem]);

  return (input: MediaPlayerPlaybackLoadInput): PlaybackLoadDecision | null => {
    if (crossDevicePlaybackStore.getSnapshot().role === 'remote') {
      const command = resolveRemotePickCommand({
        pickedRef: buildPlaybackResourceRefFromTarget(input.target),
        addByRSSResourceData: input.target.kind === 'add-by-rss' ? input.target.resourceData : null,
        startSeconds: playbackStartSecondsFromTarget(input.target, input.explicitPlaybackSeconds),
        loadsPaused: input.shouldPlay === false || input.skipNowPlayingWrite === true,
        remoteState: crossDevicePlaybackStore.getSnapshot().displayState,
      });
      if (command !== null) {
        void sendPlaybackCommand(command);
      }
      return null;
    }

    const {
      target,
      explicitPlaybackSeconds,
      mediaFileDurationHintSeconds,
      shouldPlay,
      isPlaying,
      itemChapterShouldSeek,
      newAutoQueueConfig,
      autoQueueShouldClear,
      enclosureSelectedParams,
      skipNowPlayingWrite,
    } = input;

    if (target.kind !== 'add-by-rss') {
      setMPAddByRSS(null);
      setAddByRSSListContext(null);
    }

    if (autoQueueShouldClear && !embedGuardrails.skipAutoQueueMutations) {
      setAutoQueueResources({});
      setAutoQueueActiveRow(0);
    }

    if (!embedGuardrails.skipAutoQueueMutations) {
      setAutoQueueConfig({
        ...autoQueueConfigRef.current,
        ...newAutoQueueConfig,
      });
    }

    if (shouldPlay !== undefined) {
      setMPShouldPlay(shouldPlay);
    }

    applyTargetToMediaPlayerState(target, itemChapterShouldSeek, {
      setMPChannel,
      setMPClip,
      setMPItem,
      setMPItemChapter,
      setMPItemChapterShouldSeek,
      setMPItemSoundbite,
    });

    if (enclosureSelectedParams === 'use-active-item-or-default' || !enclosureSelectedParams) {
      const nextItem = itemForEnclosureCompare(target);
      if (mpItemRef.current?.id && nextItem && nextItem.id === mpItemRef.current.id) {
        setMPEnclosureSelectedParams(mpEnclosureSelectedParamsRef.current);
      } else {
        setMPEnclosureSelectedParams({
          type: 'default',
          enclosureRowSelected: null,
          sourceRowSelected: null,
        });
        // Livestream playback uses the live player, not the non-live file list.
        setMPItemLabeledItemEnclosures(
          target.kind === 'livestream'
            ? []
            : buildLabeledItemEnclosures(nextItem?.item_enclosures ?? [])
        );
      }
    } else {
      setMPEnclosureSelectedParams(enclosureSelectedParams);
    }

    if (isPlaying !== undefined) {
      setMPIsPlaying(isPlaying);
    }

    const coreRequest: PlaybackLoadRequest = {
      target,
      explicitPlaybackSeconds,
      mediaFileDurationHintSeconds,
    };
    const decision = applyPlaybackLoad(coreRequest);

    const isLiveLoad = isLiveTarget(target);
    const rowDuration = durationHintSecondsForTarget(
      target,
      queueResourcesAbridgedIndexRef.current
    );
    const hintedDuration = parsePlaybackSeconds(mediaFileDurationHintSeconds);
    const finalDuration = hintedDuration !== undefined ? hintedDuration : rowDuration;
    const loadedDuration = isLiveLoad ? 0 : finalDuration;
    const loadedPosition = isLiveLoad ? 0 : decision.initialSeekSeconds;
    setMPCurrentTime(loadedPosition);
    setMPDuration(loadedDuration);
    if (!embedGuardrails.skipAutoQueueMutations && skipNowPlayingWrite !== true) {
      const np = nowPlayingFieldsFromTarget(target);
      void updateNowPlaying({
        ...np,
        mpDuration: loadedDuration,
        mpCurrentTime: loadedPosition,
        eventKind: 'play',
      });
    }

    return decision;
  };
}

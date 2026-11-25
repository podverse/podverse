'use client';

import { useCallback } from 'react';

import type { DTOItem } from '@podverse/helpers';
import { resolveAutoQueuePrevious } from '@podverse/playback-core';

import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import { useAutoQueue } from '../contexts/AutoQueue';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { getApiRequestService } from '../factories/apiRequestService';
import { createWebAutoQueueSourceFetchers } from '../lib/autoQueue/webAutoQueueSourceFetchers';
import { crossDevicePlaybackStore } from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import { sendPlaybackCommand } from '../lib/crossDevicePlayback/sendPlaybackCommand';
import { playbackTargetFromStandardLoad } from '../lib/playback';
import { tryOptimisticQueuePrevious } from '../lib/queue/optimisticQueueLeave';
import { resolveAddByRSSListContextFromCurrentItem } from '../utils/addByRSS/resolveListContextFromCurrentItem';
import { useAddByRSSPlayPrevious } from './useAddByRSSPlayPrevious';
import { useEpisodeChapterNavigation } from './useEpisodeChapterNavigation';
import { useLongPress } from './useLongPress';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';
import { useOptimisticQueueLeave } from './useOptimisticQueueLeave';

export function useTrackPreviousButtonActions(): {
  hasEpisodeChaptersForTrackButtons: boolean;
  /** What a click on the button runs. Cross-device `next` / `previous` commands call this. */
  runLocalClick: () => Promise<void>;
  onClick: () => void;
  longPressProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
} {
  const { mpChannel, mpItem, mpClip, mpItemSoundbite, setMPShouldPlay, mpIsPlaying, mpAddByRSS } =
    useMediaPlayer();
  const { seek } = useMediaPlayerControls();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();
  useOptimisticQueueLeave();
  const { listContext } = useAddByRSSListContext();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { autoQueueConfig, autoQueueActiveRow, setAutoQueueActiveRow } = useAutoQueue();
  const addByRSSPlayPrevious = useAddByRSSPlayPrevious();
  const { hasEpisodeChaptersForTrackButtons, seekToAdjacentChapter } =
    useEpisodeChapterNavigation();

  const seekToStart = useCallback(() => {
    seek(0);
    setMPCurrentTime(0);
  }, [seek, setMPCurrentTime]);

  const runAddByRSSPreviousTrack = useCallback(async () => {
    if (!mpAddByRSS) {
      return;
    }
    const hasListContext = listContext && listContext.itemIdTexts.length > 0;
    const fallbackContext = !hasListContext
      ? await resolveAddByRSSListContextFromCurrentItem(
          mpAddByRSS.idText,
          mpAddByRSS.resourceData,
          'recent'
        )
      : null;
    const played = await addByRSSPlayPrevious(fallbackContext ?? undefined);
    if (!played) {
      seekToStart();
    }
  }, [mpAddByRSS, listContext, addByRSSPlayPrevious, seekToStart]);

  const runCorePreviousTrack = useCallback(async () => {
    const outcome = tryOptimisticQueuePrevious({ shouldPlay: mpIsPlaying });
    if (outcome === 'started' || outcome === 'settled') {
      if (outcome === 'started') {
        setMPShouldPlay(mpIsPlaying);
      }
      return;
    }
    if (!mpChannel || !mpItem) {
      return;
    }

    const seed = {
      item: mpItem,
      channel: mpChannel,
      clip: mpClip,
      item_soundbite: mpItemSoundbite,
    };
    const decision = await resolveAutoQueuePrevious({
      config: { ...autoQueueConfig, disabled: false },
      seed,
      activeRow: autoQueueActiveRow,
      fetchers: createWebAutoQueueSourceFetchers(getApiRequestService()),
    });

    if (decision.kind === 'step-back-row') {
      setMPShouldPlay(mpIsPlaying);
      setAutoQueueActiveRow(decision.row);
      return;
    }

    if (decision.kind === 'restart') {
      seekToStart();
      return;
    }

    mediaPlayerResourceUpdate({
      target: playbackTargetFromStandardLoad({
        channel: decision.resource.channel,
        clip: decision.resource.clip,
        // The queue row's item is DTOItemQueueItem. This load takes DTOItem.
        item: decision.resource.item as DTOItem,
        itemChapter: null,
        itemSoundbite: decision.resource.item_soundbite,
        musicIntent: 'explicit_play',
      }),
      itemChapterShouldSeek: false,
      shouldPlay: mpIsPlaying,
      enclosureSelectedParams: 'use-active-item-or-default',
      isPlaying: mpIsPlaying,
      skipMoveNowPlayingToHistory: false,
      newAutoQueueConfig: {
        playlist_id_text: autoQueueConfig.playlist_id_text,
        disabled: false,
        random: autoQueueConfig.random,
        repeat: autoQueueConfig.repeat,
        nextPage: autoQueueConfig.nextPage || 1,
        shuffleHash: autoQueueConfig.shuffleHash,
      },
      autoQueueShouldClear: true,
    });
  }, [
    mpChannel,
    mpItem,
    mpClip,
    mpItemSoundbite,
    mpIsPlaying,
    autoQueueActiveRow,
    autoQueueConfig,
    setMPShouldPlay,
    setAutoQueueActiveRow,
    mediaPlayerResourceUpdate,
    seekToStart,
  ]);

  const runPreviousTrack = useCallback(async () => {
    if (mpAddByRSS) {
      await runAddByRSSPreviousTrack();
      return;
    }
    await runCorePreviousTrack();
  }, [mpAddByRSS, runAddByRSSPreviousTrack, runCorePreviousTrack]);

  const handleLongPress = useCallback(() => {
    if (crossDevicePlaybackStore.getSnapshot().role === 'remote') {
      void sendPlaybackCommand({ type: 'previous' });
      return;
    }
    void runPreviousTrack();
  }, [runPreviousTrack]);

  const runLocalClick = useCallback(async () => {
    if (hasEpisodeChaptersForTrackButtons) {
      seekToAdjacentChapter('previous');
      return;
    }

    if (mpAddByRSS) {
      const isRestartThreshold = 3;
      if (mpCurrentTime > isRestartThreshold) {
        seekToStart();
        return;
      }
      await runAddByRSSPreviousTrack();
      return;
    }

    if (mpChannel && mpItem) {
      const isRestartThreshold = 3;
      if (mpCurrentTime > isRestartThreshold) {
        seekToStart();
        return;
      }
      await runCorePreviousTrack();
    }
  }, [
    hasEpisodeChaptersForTrackButtons,
    seekToAdjacentChapter,
    mpAddByRSS,
    mpCurrentTime,
    seekToStart,
    runAddByRSSPreviousTrack,
    mpChannel,
    mpItem,
    runCorePreviousTrack,
  ]);

  const handleClick = useCallback(async () => {
    if (crossDevicePlaybackStore.getSnapshot().role === 'remote') {
      await sendPlaybackCommand({ type: 'previous' });
      return;
    }
    await runLocalClick();
  }, [runLocalClick]);

  const { onClick, ...longPressProps } = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delayMs: 500,
  });

  return {
    hasEpisodeChaptersForTrackButtons,
    runLocalClick,
    onClick,
    longPressProps,
  };
}

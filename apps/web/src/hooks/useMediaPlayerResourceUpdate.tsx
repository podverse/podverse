import { useEffect, useRef } from 'react';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  EnclosureSelectedParams,
} from '@podverse/helpers';
import { isMusicMediumId, MediumEnum } from '@podverse/helpers';

import { useAddByRSSListContext } from '../contexts/AddByRSSListContext';
import type { AutoQueueConfig } from '../contexts/AutoQueue';
import { useAutoQueue } from '../contexts/AutoQueue';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueueResourcesAbridgedIndex } from '../contexts/QueueResourcesAbridgedIndex';
import type { MusicItemPlaybackIntent } from '../lib/musicItemPlaybackIntent';
import { resolveMusicSessionRestoreSeekSeconds } from '../lib/musicSessionRestoreCurrentTime';
import { trimPlaybackPositionNearEnd } from '../lib/playbackResumeNearEnd';
import { useQueueResourcesUpdateNowPlaying } from './useQueueResourceUpdateNowPlaying';

export function useMediaPlayerResourceUpdate() {
  const {
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
    mpEnclosureSelectedParams,
    mpItem,
    musicItemPlaybackIntentRef,
    musicSessionRestoreSeekSecondsRef,
  } = useMediaPlayer();
  const { autoQueueConfig, setAutoQueueConfig, setAutoQueueResources, setAutoQueueActiveRow } =
    useAutoQueue();
  const { setAddByRSSListContext } = useAddByRSSListContext();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const updateNowPlaying = useQueueResourcesUpdateNowPlaying();
  const { queueResourcesAbridgedIndex } = useQueueResourcesAbridgedIndex();

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

  return ({
    shouldPlay,
    channel,
    clip,
    item,
    itemChapter,
    itemChapterShouldSeek,
    itemSoundbite,
    enclosureSelectedParams,
    mpDuration,
    mpCurrentTime,
    isPlaying,
    newAutoQueueConfig,
    autoQueueShouldClear,
    musicItemPlaybackIntent,
  }: {
    shouldPlay?: boolean;
    channel: DTOChannel | null;
    clip: DTOClip | null;
    item: DTOItem | null;
    itemChapter: DTOItemChapter | null;
    itemChapterShouldSeek: boolean;
    itemSoundbite: DTOItemSoundbite | null;
    enclosureSelectedParams: EnclosureSelectedParams | 'use-active-item-or-default';
    mpDuration?: number;
    mpCurrentTime?: number;
    isPlaying?: boolean;
    skipMoveNowPlayingToHistory: boolean;
    newAutoQueueConfig: AutoQueueConfig;
    autoQueueShouldClear: boolean;
    /** Music-type items only; podcast/video ignore this. Default `explicit_play`. */
    musicItemPlaybackIntent?: MusicItemPlaybackIntent;
  }) => {
    setMPAddByRSS(null);
    setAddByRSSListContext(null);

    if (autoQueueShouldClear) {
      setAutoQueueResources({});
      setAutoQueueActiveRow(0);
    }

    if (newAutoQueueConfig !== undefined) {
      setAutoQueueConfig({
        ...autoQueueConfigRef.current,
        ...newAutoQueueConfig,
      });
    }

    if (shouldPlay !== undefined) {
      setMPShouldPlay(shouldPlay);
    }

    setMPChannel(channel);
    setMPClip(clip);
    setMPItem(item);
    setMPItemChapter(itemChapter);
    setMPItemChapterShouldSeek(itemChapterShouldSeek);
    setMPItemSoundbite(itemSoundbite);

    if (enclosureSelectedParams === 'use-active-item-or-default' || !enclosureSelectedParams) {
      if (mpItemRef.current?.id && item && item.id === mpItemRef.current.id) {
        setMPEnclosureSelectedParams(mpEnclosureSelectedParamsRef.current);
      } else {
        setMPEnclosureSelectedParams({
          type: 'default',
          enclosureRowSelected: null,
          sourceRowSelected: null,
        });
        setMPItemLabeledItemEnclosures([]);
      }
    } else {
      setMPEnclosureSelectedParams(enclosureSelectedParams);
    }

    if (isPlaying !== undefined) {
      setMPIsPlaying(isPlaying);
    }

    musicSessionRestoreSeekSecondsRef.current = null;

    // Assign the resource you are loading's abridged index data to the media player
    // so that it is already loaded by the time the now playing resource is updated within the queue.
    // Else, clear the previous items current time and duration by setting to 0
    // (because they will be updated shortly after by the media audio/video controllers anyway).
    type ResourceWithId = { id: number | string } | null | undefined;
    type AbridgedData = { p?: number | string; d?: number | string };
    function getAbridgedAndSet(
      resource: ResourceWithId,
      abridgedMap: Record<string, AbridgedData>,
      preventSet: boolean = false
    ) {
      const abridged = resource ? abridgedMap?.[resource.id] : undefined;
      let currentTime = Number(abridged?.p) || 0;
      const duration = Number(abridged?.d) || 0;

      currentTime = trimPlaybackPositionNearEnd(currentTime, duration);

      if (!preventSet) {
        setMPCurrentTime(currentTime);
      }

      return { currentTime, duration };
    }

    let timeData = { currentTime: 0, duration: 0 };

    if (clip) {
      timeData = getAbridgedAndSet(clip, queueResourcesAbridgedIndexRef.current.clips);
    } else if (itemSoundbite) {
      timeData = getAbridgedAndSet(
        itemSoundbite,
        queueResourcesAbridgedIndexRef.current.item_soundbites
      );
    } else if (item) {
      if (channel?.medium_id === MediumEnum.Podcast || channel?.medium_id === MediumEnum.Video) {
        timeData = getAbridgedAndSet(item, queueResourcesAbridgedIndexRef.current.items);
      } else if (isMusicMediumId(channel?.medium_id)) {
        const effectiveMusicIntent: MusicItemPlaybackIntent =
          musicItemPlaybackIntent ?? 'explicit_play';
        if (effectiveMusicIntent === 'session_restore') {
          const abridged = queueResourcesAbridgedIndexRef.current.items[item.id];
          const { seekSeconds, durationFromIndex } = resolveMusicSessionRestoreSeekSeconds({
            explicitPlaybackSeconds: mpCurrentTime,
            abridged,
            mpDurationHint: mpDuration,
          });
          timeData = { currentTime: seekSeconds, duration: durationFromIndex };
          setMPCurrentTime(seekSeconds);
          musicSessionRestoreSeekSecondsRef.current = seekSeconds;
        } else {
          const preventSet = true;
          const tempTimeData = getAbridgedAndSet(
            item,
            queueResourcesAbridgedIndexRef.current.items,
            preventSet
          );
          timeData = { currentTime: 0, duration: tempTimeData.duration };
          setMPCurrentTime(0);
        }
      } else {
        const preventSet = true;
        const tempTimeData = getAbridgedAndSet(
          item,
          queueResourcesAbridgedIndexRef.current.items,
          preventSet
        );
        timeData = { currentTime: 0, duration: tempTimeData.duration };
        setMPCurrentTime(0);
      }
    } else {
      setMPCurrentTime(0);
    }

    const finalDuration = mpDuration !== undefined ? mpDuration : timeData.duration;

    const resolvedMusicIntent: MusicItemPlaybackIntent | null =
      !clip && !itemSoundbite && item && channel && isMusicMediumId(channel.medium_id)
        ? (musicItemPlaybackIntent ?? 'explicit_play')
        : null;

    const finalCurrentTime =
      resolvedMusicIntent === 'session_restore'
        ? timeData.currentTime
        : mpCurrentTime !== undefined
          ? mpCurrentTime
          : timeData.currentTime;

    musicItemPlaybackIntentRef.current = resolvedMusicIntent;

    updateNowPlaying({
      mpChannel: channel,
      mpClip: clip,
      mpItem: item,
      mpItemSoundbite: itemSoundbite,
      mpDuration: finalDuration,
      mpCurrentTime: finalCurrentTime,
    });
  };
}

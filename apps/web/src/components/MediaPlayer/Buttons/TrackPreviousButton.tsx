import { useCallback } from 'react';
import { FaBackwardStep } from 'react-icons/fa6';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemQueueItem,
  DTOItemSoundbite,
  DTOPlaylistResource,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { useAddByRSSListContext } from '../../../contexts/AddByRSSListContext';
import { useAutoQueue } from '../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useAddByRSSPlayPrevious } from '../../../hooks/useAddByRSSPlayPrevious';
import { useLongPress } from '../../../hooks/useLongPress';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { playbackTargetFromStandardLoad } from '../../../lib/playback';
import { resolveAddByRSSListContextFromCurrentItem } from '../../../utils/addByRSS/resolveListContextFromCurrentItem';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackPreviousButton.module.scss';

export const TrackPreviousButton = () => {
  const apiRequestService = getApiRequestService();
  const { mpChannel, mpItem, mpClip, mpItemSoundbite, setMPShouldPlay, mpIsPlaying, mpAddByRSS } =
    useMediaPlayer();
  const { seek } = useMediaPlayerControls();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();
  const { listContext } = useAddByRSSListContext();

  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { autoQueueConfig, autoQueueActiveRow, setAutoQueueActiveRow } = useAutoQueue();
  const addByRSSPlayPrevious = useAddByRSSPlayPrevious();

  const seekToStart = useCallback(() => {
    seek(0);
    setMPCurrentTime(0);
  }, [seek, setMPCurrentTime]);

  const runAddByRSSPreviousOnly = useCallback(async () => {
    if (!mpAddByRSS) return;
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

  const runCorePreviousOnly = useCallback(async () => {
    if (!mpChannel || !mpItem) return;
    if (autoQueueActiveRow > 0) {
      const previousAutoQueueActiveRow = autoQueueActiveRow - 1;
      setMPShouldPlay(mpIsPlaying);
      setAutoQueueActiveRow(previousAutoQueueActiveRow);
    } else {
      if (autoQueueConfig.random) {
        seekToStart();
      } else {
        let channel: DTOChannel | null = null;
        let clip: DTOClip | null = null;
        let item_soundbite: DTOItemSoundbite | null = null;
        let item: DTOItem | null = null;

        if (autoQueueConfig.playlist_id_text) {
          const response = await apiRequestService.reqPlaylistResourceGetManyForQueueByListPosition(
            autoQueueConfig.playlist_id_text,
            {
              clip_id_text: mpClip?.id_text,
              item_soundbite_id_text: mpItemSoundbite?.id_text,
              item_id_text: mpItem.id_text,
            },
            'backward'
          );
          const playlistResources: DTOPlaylistResource[] = response.data;
          const previousRow = playlistResources.length > 0 ? playlistResources[0] : null;
          if (previousRow) {
            if (previousRow.clip) {
              clip = previousRow.clip;
              item = previousRow.clip.item || null;
              channel = item?.channel || null;
            } else if (previousRow.item_soundbite) {
              item_soundbite = previousRow.item_soundbite;
              item = previousRow.item_soundbite.item || null;
              channel = item?.channel || null;
            } else if (previousRow.item) {
              item = previousRow.item;
              channel = previousRow.item.channel || null;
            }
          }
        } else {
          const itemsResponse: DTOItemQueueItem[] =
            mpChannel?.medium_id === MediumEnum.Music
              ? await apiRequestService.reqItemGetManyForQueueBySeason(mpItem.id_text, 'backward')
              : await apiRequestService.reqItemGetManyForQueueByPubDate(mpItem.id_text, 'backward');
          const previousItem = itemsResponse.length > 0 ? itemsResponse[0] : null;
          item = (previousItem ?? null) as DTOItem | null;
          channel = previousItem?.channel || null;
          clip = null;
          item_soundbite = null;
        }

        if (item && channel) {
          mediaPlayerResourceUpdate({
            target: playbackTargetFromStandardLoad({
              channel,
              clip,
              item,
              itemChapter: null,
              itemSoundbite: item_soundbite,
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
        } else {
          seekToStart();
        }
      }
    }
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

  const handleLongPress = useCallback(() => {
    if (mpAddByRSS) {
      void runAddByRSSPreviousOnly();
    } else {
      void runCorePreviousOnly();
    }
  }, [mpAddByRSS, runAddByRSSPreviousOnly, runCorePreviousOnly]);

  const handleClick = useCallback(async () => {
    if (mpAddByRSS) {
      const isRestartThreshold = 3;
      if (mpCurrentTime > isRestartThreshold) {
        seekToStart();
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
      if (played) return;
      seekToStart();
      return;
    }
    if (mpChannel && mpItem) {
      const isRestartThreshold = 3;
      const shouldRestart = mpCurrentTime > isRestartThreshold;

      if (shouldRestart) {
        seekToStart();
        return;
      }

      if (autoQueueActiveRow > 0) {
        const previousAutoQueueActiveRow = autoQueueActiveRow - 1;
        setMPShouldPlay(mpIsPlaying);
        setAutoQueueActiveRow(previousAutoQueueActiveRow);
      } else {
        if (autoQueueConfig.random) {
          seekToStart();
        } else {
          let channel: DTOChannel | null = null;
          let clip: DTOClip | null = null;
          let item_soundbite: DTOItemSoundbite | null = null;
          let item: DTOItem | null = null;

          if (autoQueueConfig.playlist_id_text) {
            const response =
              await apiRequestService.reqPlaylistResourceGetManyForQueueByListPosition(
                autoQueueConfig.playlist_id_text,
                {
                  clip_id_text: mpClip?.id_text,
                  item_soundbite_id_text: mpItemSoundbite?.id_text,
                  item_id_text: mpItem.id_text,
                },
                'backward'
              );
            const playlistResources: DTOPlaylistResource[] = response.data;
            const previousRow = playlistResources.length > 0 ? playlistResources[0] : null;
            if (previousRow) {
              if (previousRow.clip) {
                clip = previousRow.clip;
                item = previousRow.clip.item || null;
                channel = item?.channel || null;
              } else if (previousRow.item_soundbite) {
                item_soundbite = previousRow.item_soundbite;
                item = previousRow.item_soundbite.item || null;
                channel = item?.channel || null;
              } else if (previousRow.item) {
                item = previousRow.item;
                channel = previousRow.item.channel || null;
              }
            }
          } else {
            const itemsResponse: DTOItemQueueItem[] =
              mpChannel?.medium_id === MediumEnum.Music
                ? await apiRequestService.reqItemGetManyForQueueBySeason(mpItem.id_text, 'backward')
                : await apiRequestService.reqItemGetManyForQueueByPubDate(
                    mpItem.id_text,
                    'backward'
                  );
            const previousItem = itemsResponse.length > 0 ? itemsResponse[0] : null;
            item = (previousItem ?? null) as DTOItem | null;
            channel = previousItem?.channel || null;
            clip = null;
            item_soundbite = null;
          }

          if (item && channel) {
            mediaPlayerResourceUpdate({
              target: playbackTargetFromStandardLoad({
                channel,
                clip,
                item,
                itemChapter: null,
                itemSoundbite: item_soundbite,
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
          } else {
            seekToStart();
          }
        }
      }
    }
  }, [
    mpAddByRSS,
    mpCurrentTime,
    listContext,
    addByRSSPlayPrevious,
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

  const { onClick, ...longPressProps } = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    delayMs: 500,
  });

  return (
    <button
      className={styles.trackPreviousButton}
      onClick={onClick}
      {...longPressProps}
      type="button"
    >
      <FaBackwardStep />
    </button>
  );
};

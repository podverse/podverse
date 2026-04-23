'use client';

import React, { useEffect, useRef } from 'react';

import type { DTOQueueResource } from '@podverse/helpers';
import { buildLabeledItemEnclosures } from '@podverse/helpers';

import { EVENTS } from '../../../constants/events';
import type { AutoQueueResourcesMapRow } from '../../../contexts/AutoQueue';
import { checkIsActiveRowHighestKey, useAutoQueue } from '../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useQueues } from '../../../contexts/Queue';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useAutoQueueLoadResources } from '../../../hooks/useAutoQueueLoadResources';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { usePlayAddByRSS } from '../../../hooks/usePlayAddByRSS';
import { loadAddByRSSIndexItemFromResourceData } from '../../../utils/addByRSS/playFromQueueResource';
import { updateLayoutForMediaPlayer } from '../../../utils/mediaPlayer/mediaPlayerLayout';
import { MediaPlayerControllerAudio } from './Audio/MediaPlayerControllerAudio';
import { MediaPlayerControllerLiveStreamAudio } from './LiveStream/MediaPlayerControllerLiveStreamAudio';
import { MediaPlayerLiveStreamVideoWrapper } from './LiveStream/MediaPlayerLiveStreamVideoWrapper';
import { MediaPlayerVideoWrapper } from './Video/MediaPlayerVideoWrapper';

export const MediaPlayerController: React.FC = () => {
  const apiRequestService = getApiRequestService();
  const {
    mpChannel,
    mpItem,
    mpClip,
    mpItemSoundbite,
    mpAddByRSS,
    mpDuration,
    setMPItemChapters,
    setMPItemLabeledItemEnclosures,
  } = useMediaPlayer();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const playAddByRSS = usePlayAddByRSS();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { activeQueueUpcomingResources } = useQueues();
  const { autoQueueResources, autoQueueActiveRow, autoQueueConfig } = useAutoQueue();
  const autoQueueLoadResources = useAutoQueueLoadResources();

  const autoQueueResourcesRef = useRef(autoQueueResources);
  useEffect(() => {
    autoQueueResourcesRef.current = autoQueueResources;
  }, [autoQueueResources]);

  const autoQueueActiveRowRef = useRef(autoQueueActiveRow);
  useEffect(() => {
    autoQueueActiveRowRef.current = autoQueueActiveRow;
  }, [autoQueueActiveRow]);

  const autoQueueConfigRef = useRef(autoQueueConfig);
  useEffect(() => {
    autoQueueConfigRef.current = autoQueueConfig;
  }, [autoQueueConfig]);

  const handleKeyDown = (e: KeyboardEvent | React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    if (e.key === 'ArrowLeft') {
      const newTime = Math.max(0, mpCurrentTime - 10);
      window.dispatchEvent(
        new CustomEvent(EVENTS.MEDIA_PLAYER.SEEK, { detail: { time: newTime } })
      );
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
      const newTime = Math.min(mpDuration, mpCurrentTime + 10);
      window.dispatchEvent(
        new CustomEvent(EVENTS.MEDIA_PLAYER.SEEK, { detail: { time: newTime } })
      );
      e.preventDefault();
    }
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });

  useEffect(() => {
    updateLayoutForMediaPlayer(!!mpChannel || !!mpAddByRSS);
  }, [mpChannel, mpAddByRSS]);

  useEffect(() => {
    const fetchItemChapters = async () => {
      if (mpItem?.id_text) {
        const response = await apiRequestService.reqItemParseAndGetChapters(mpItem.id_text);
        setMPItemChapters(response.data);
      }
    };

    const fetchAutoQueueResources = async () => {
      const isActiveRowHighestKey = checkIsActiveRowHighestKey(
        autoQueueActiveRowRef.current,
        autoQueueResourcesRef.current
      );

      const isAutoQueueResourcesEmpty =
        Object.keys(autoQueueResourcesRef.current).map(Number).length === 0;

      if (isActiveRowHighestKey || isAutoQueueResourcesEmpty) {
        if (mpItem?.id_text) {
          await autoQueueLoadResources();
        }
      }
    };

    const fetchItemLabeledItemEnclosures = async () => {
      const mpItemLabeledEnclosures = buildLabeledItemEnclosures(mpItem?.item_enclosures || []);
      setMPItemLabeledItemEnclosures(mpItemLabeledEnclosures);
    };

    fetchItemChapters();
    fetchAutoQueueResources();
    fetchItemLabeledItemEnclosures();
  }, [mpItem]);

  async function handleLoadAutoQueueItem(nextResource: AutoQueueResourcesMapRow) {
    const fullItem = await apiRequestService.reqItemGetByIdOrIdText(nextResource.item.id_text);
    if (fullItem) {
      const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(fullItem.channel_id);
      if (fullChannel) {
        mediaPlayerResourceUpdate({
          channel: fullChannel,
          clip: nextResource.clip,
          item: fullItem,
          itemChapter: null,
          itemChapterShouldSeek: false,
          itemSoundbite: nextResource.item_soundbite,
          enclosureSelectedParams: 'use-active-item-or-default',
          skipMoveNowPlayingToHistory: false,
          newAutoQueueConfig: {
            playlist_id_text: autoQueueConfigRef.current.playlist_id_text,
            disabled: false,
            random: autoQueueConfigRef.current.random,
            repeat: autoQueueConfigRef.current.repeat,
            nextPage: autoQueueConfigRef.current.nextPage || 1,
            shuffleHash: autoQueueConfigRef.current.shuffleHash,
          },
          autoQueueShouldClear: false,
        });
      }
    }
  }

  async function handleLoadQueueItem(nextResource: DTOQueueResource) {
    const fullItem = await apiRequestService.reqItemGetByIdOrIdText(nextResource.item.id_text);
    if (fullItem) {
      const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(fullItem.channel_id);
      if (fullChannel) {
        mediaPlayerResourceUpdate({
          channel: fullChannel,
          clip: nextResource.clip || null,
          item: fullItem,
          itemChapter: null,
          itemChapterShouldSeek: false,
          itemSoundbite: nextResource.item_soundbite || null,
          enclosureSelectedParams: 'use-active-item-or-default',
          skipMoveNowPlayingToHistory: false,
          newAutoQueueConfig: {
            playlist_id_text: autoQueueConfigRef.current.playlist_id_text,
            disabled: false,
            random: autoQueueConfigRef.current.random,
            repeat: autoQueueConfigRef.current.repeat,
            nextPage: autoQueueConfigRef.current.nextPage || 1,
            shuffleHash: autoQueueConfigRef.current.shuffleHash,
          },
          autoQueueShouldClear: true,
        });
      }
    }
  }

  async function handleLoadQueueClip(nextResource: DTOQueueResource) {
    if (nextResource?.clip && nextResource?.clip?.id_text !== mpClip?.id_text) {
      const fullClip = await apiRequestService.reqClipGet(nextResource.clip.id_text);
      if (fullClip) {
        const fullItem = await apiRequestService.reqItemGetByIdOrIdText(fullClip.item.id_text);
        if (fullItem) {
          const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(
            fullItem.channel_id
          );
          if (fullChannel) {
            mediaPlayerResourceUpdate({
              channel: fullChannel,
              clip: fullClip,
              item: fullItem,
              itemChapter: null,
              itemChapterShouldSeek: false,
              itemSoundbite: null,
              enclosureSelectedParams: 'use-active-item-or-default',
              skipMoveNowPlayingToHistory: false,
              newAutoQueueConfig: {
                playlist_id_text: autoQueueConfigRef.current.playlist_id_text,
                disabled: false,
                random: autoQueueConfigRef.current.random,
                repeat: autoQueueConfigRef.current.repeat,
                nextPage: autoQueueConfigRef.current.nextPage || 1,
                shuffleHash: autoQueueConfigRef.current.shuffleHash,
              },
              autoQueueShouldClear: true,
            });
          }
        }
      }
    }
  }

  async function handleLoadQueueItemSoundbite(nextResource: DTOQueueResource) {
    if (
      nextResource?.item_soundbite &&
      nextResource?.item_soundbite?.id_text !== mpItemSoundbite?.id_text
    ) {
      const fullItemSoundbite = await apiRequestService.reqItemSoundbiteGet(
        nextResource.item_soundbite.id_text
      );
      if (fullItemSoundbite?.item) {
        const fullItem = await apiRequestService.reqItemGetByIdOrIdText(
          fullItemSoundbite.item.id_text
        );
        if (fullItem) {
          const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(
            fullItem.channel_id
          );
          if (fullChannel) {
            mediaPlayerResourceUpdate({
              channel: fullChannel,
              clip: null,
              item: fullItem,
              itemChapter: null,
              itemChapterShouldSeek: false,
              itemSoundbite: fullItemSoundbite,
              enclosureSelectedParams: 'use-active-item-or-default',
              skipMoveNowPlayingToHistory: false,
              newAutoQueueConfig: {
                playlist_id_text: autoQueueConfigRef.current.playlist_id_text,
                disabled: false,
                random: autoQueueConfigRef.current.random,
                repeat: autoQueueConfigRef.current.repeat,
                nextPage: autoQueueConfigRef.current.nextPage || 1,
                shuffleHash: autoQueueConfigRef.current.shuffleHash,
              },
              autoQueueShouldClear: true,
            });
          }
        }
      }
    }
  }

  async function handleLoadQueueItemAddByRSS(nextResource: DTOQueueResource) {
    const resourceData = nextResource.add_by_rss_resource_data ?? null;
    const indexItem = await loadAddByRSSIndexItemFromResourceData(resourceData);
    if (indexItem) {
      // Pass playback_position from the already-fetched queue resource
      const playbackPosition = nextResource.playback_position
        ? parseFloat(String(nextResource.playback_position))
        : undefined;
      await playAddByRSS(
        indexItem,
        playbackPosition !== undefined && !Number.isNaN(playbackPosition)
          ? playbackPosition
          : undefined
      );
    }
  }

  useEffect(() => {
    if (activeQueueUpcomingResources && activeQueueUpcomingResources.length > 0) {
      const nextResource = activeQueueUpcomingResources[0];
      if (!nextResource) return;
      const nextIdText =
        typeof nextResource.add_by_rss_resource_data?.id_text === 'string'
          ? nextResource.add_by_rss_resource_data.id_text
          : null;
      const isAlreadyPlayingThisAddByRSS = nextIdText !== null && mpAddByRSS?.idText === nextIdText;
      if (
        nextResource.add_by_rss_resource_data &&
        !nextResource.is_add_by_rss_redacted &&
        !isAlreadyPlayingThisAddByRSS
      ) {
        handleLoadQueueItemAddByRSS(nextResource);
      } else if (nextResource?.item && !isAlreadyPlayingThisAddByRSS) {
        handleLoadQueueItem(nextResource);
      } else if (nextResource?.clip) {
        handleLoadQueueClip(nextResource);
      } else if (nextResource?.item_soundbite) {
        handleLoadQueueItemSoundbite(nextResource);
      }
    }
  }, [activeQueueUpcomingResources]);

  useEffect(() => {
    if (autoQueueActiveRow || autoQueueActiveRow === 0) {
      const newResource = autoQueueResourcesRef.current[autoQueueActiveRow];
      if (newResource) {
        handleLoadAutoQueueItem(newResource);
      }
    }
  }, [autoQueueActiveRow]);

  return (
    <>
      <MediaPlayerControllerAudio />
      <MediaPlayerVideoWrapper />
      <MediaPlayerControllerLiveStreamAudio />
      <MediaPlayerLiveStreamVideoWrapper />
    </>
  );
};

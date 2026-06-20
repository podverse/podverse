'use client';

import { useEffect, useRef } from 'react';

import type { DTOQueueResource } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  resolvePreferredMediaTypeEnclosureSelectedParams,
} from '@podverse/helpers';

import type { AutoQueueResourcesMapRow } from '../contexts/AutoQueue';
import { checkIsActiveRowHighestKey, useAutoQueue } from '../contexts/AutoQueue';
import { useLocalSettings } from '../contexts/LocalSettings';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';
import type { MusicItemPlaybackIntent } from '../lib/playback';
import { parsePlaybackSeconds, playbackTargetFromStandardLoad } from '../lib/playback';
import { loadAddByRSSIndexItemFromResourceData } from '../utils/addByRSS/playFromQueueResource';
import { useAutoQueueLoadResources } from './useAutoQueueLoadResources';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';
import { usePlayAddByRSS } from './usePlayAddByRSS';

/**
 * Queue head + auto-queue row reactions: fetch item metadata, resolve upcoming
 * queue resources into `mediaPlayerResourceUpdate` / `playAddByRSS` loads.
 * Kept out of `MediaPlayerController` so that file stays a thin coordinator.
 */
export function useMediaPlayerControllerQueueHeadLoading(): void {
  const apiRequestService = getApiRequestService();
  const {
    mpItem,
    mpClip,
    mpItemSoundbite,
    mpAddByRSS,
    pendingMusicQueueLoadIntentRef,
    mpEnclosureSelectedParams,
    setMPEnclosureSelectedParams,
    setMPItemChapters,
    setMPItemLabeledItemEnclosures,
  } = useMediaPlayer();
  const { preferredMediaType } = useLocalSettings();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const playAddByRSS = usePlayAddByRSS();
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

  const mpClipRef = useRef(mpClip);
  useEffect(() => {
    mpClipRef.current = mpClip;
  }, [mpClip]);

  const mpItemSoundbiteRef = useRef(mpItemSoundbite);
  useEffect(() => {
    mpItemSoundbiteRef.current = mpItemSoundbite;
  }, [mpItemSoundbite]);

  const mpEnclosureSelectedParamsRef = useRef(mpEnclosureSelectedParams);
  useEffect(() => {
    mpEnclosureSelectedParamsRef.current = mpEnclosureSelectedParams;
  }, [mpEnclosureSelectedParams]);

  const preferredMediaTypeRef = useRef(preferredMediaType);
  useEffect(() => {
    preferredMediaTypeRef.current = preferredMediaType;
  }, [preferredMediaType]);

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

      // On a fresh item load (params reset to the `default` selection with no row
      // chosen), apply the viewer's preferred media type. Manual SourceSelectors
      // overrides and same-item reloads keep non-default params and are preserved.
      const currentParams = mpEnclosureSelectedParamsRef.current;
      const isFreshLoadDefault =
        currentParams.type === 'default' &&
        currentParams.enclosureRowSelected === null &&
        currentParams.sourceRowSelected === null;
      if (isFreshLoadDefault && mpItemLabeledEnclosures.length > 0) {
        const preferredParams = resolvePreferredMediaTypeEnclosureSelectedParams(
          mpItemLabeledEnclosures,
          preferredMediaTypeRef.current
        );
        if (preferredParams.type !== 'default') {
          setMPEnclosureSelectedParams(preferredParams);
        }
      }
    };

    void fetchItemChapters();
    void fetchAutoQueueResources();
    void fetchItemLabeledItemEnclosures();
  }, [mpItem]);

  async function handleLoadAutoQueueItem(nextResource: AutoQueueResourcesMapRow) {
    const fullItem = await apiRequestService.reqItemGetByIdOrIdText(nextResource.item.id_text);
    if (fullItem) {
      const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(fullItem.channel_id);
      if (fullChannel) {
        mediaPlayerResourceUpdate({
          target: playbackTargetFromStandardLoad({
            channel: fullChannel,
            clip: nextResource.clip,
            item: fullItem,
            itemChapter: null,
            itemSoundbite: nextResource.item_soundbite,
            musicIntent: 'fresh_transition',
          }),
          itemChapterShouldSeek: false,
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

  function resolveMusicIntentForQueueHeadLoad(): MusicItemPlaybackIntent {
    const pending = pendingMusicQueueLoadIntentRef.current;
    if (pending !== null) {
      pendingMusicQueueLoadIntentRef.current = null;
      return pending;
    }
    return 'session_restore';
  }

  async function handleLoadQueueItem(nextResource: DTOQueueResource) {
    const fullItem = await apiRequestService.reqItemGetByIdOrIdText(nextResource.item.id_text);
    if (fullItem) {
      const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(fullItem.channel_id);
      if (fullChannel) {
        mediaPlayerResourceUpdate({
          target: playbackTargetFromStandardLoad({
            channel: fullChannel,
            clip: nextResource.clip ?? null,
            item: fullItem,
            itemChapter: null,
            itemSoundbite: nextResource.item_soundbite ?? null,
            musicIntent: resolveMusicIntentForQueueHeadLoad(),
          }),
          explicitPlaybackSeconds: parsePlaybackSeconds(nextResource.playback_position),
          itemChapterShouldSeek: false,
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
    if (nextResource?.clip && nextResource?.clip?.id_text !== mpClipRef.current?.id_text) {
      const fullClip = await apiRequestService.reqClipGet(nextResource.clip.id_text);
      if (fullClip) {
        const fullItem = await apiRequestService.reqItemGetByIdOrIdText(fullClip.item.id_text);
        if (fullItem) {
          const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(
            fullItem.channel_id
          );
          if (fullChannel) {
            mediaPlayerResourceUpdate({
              target: playbackTargetFromStandardLoad({
                channel: fullChannel,
                clip: fullClip,
                item: fullItem,
                itemChapter: null,
                itemSoundbite: null,
                musicIntent: 'fresh_transition',
              }),
              explicitPlaybackSeconds: parsePlaybackSeconds(nextResource.playback_position),
              itemChapterShouldSeek: false,
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
      nextResource?.item_soundbite?.id_text !== mpItemSoundbiteRef.current?.id_text
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
              target: playbackTargetFromStandardLoad({
                channel: fullChannel,
                clip: null,
                item: fullItem,
                itemChapter: null,
                itemSoundbite: fullItemSoundbite,
                musicIntent: 'fresh_transition',
              }),
              explicitPlaybackSeconds: parsePlaybackSeconds(nextResource.playback_position),
              itemChapterShouldSeek: false,
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
        void handleLoadQueueItemAddByRSS(nextResource);
      } else if (nextResource?.item && !isAlreadyPlayingThisAddByRSS) {
        void handleLoadQueueItem(nextResource);
      } else if (nextResource?.clip) {
        void handleLoadQueueClip(nextResource);
      } else if (nextResource?.item_soundbite) {
        void handleLoadQueueItemSoundbite(nextResource);
      }
    }
  }, [activeQueueUpcomingResources, mpAddByRSS?.idText]);

  useEffect(() => {
    if (autoQueueActiveRow || autoQueueActiveRow === 0) {
      const newResource = autoQueueResourcesRef.current[autoQueueActiveRow];
      if (newResource) {
        void handleLoadAutoQueueItem(newResource);
      }
    }
  }, [autoQueueActiveRow]);
}

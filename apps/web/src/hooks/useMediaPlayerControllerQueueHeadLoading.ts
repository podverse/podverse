'use client';

import { useEffect, useRef, useState } from 'react';

import type { DTOQueueResource } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  resolveHandoffDecision,
  resolvePreferredMediaTypeEnclosureSelectedParams,
} from '@podverse/helpers';

import type { AutoQueueResourcesMapRow } from '../contexts/AutoQueue';
import { checkIsActiveRowHighestKey, useAutoQueue } from '../contexts/AutoQueue';
import { useLocalSettings } from '../contexts/LocalSettings';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';
import type { MusicItemPlaybackIntent } from '../lib/playback';
import { parsePlaybackSeconds, playbackTargetFromStandardLoad } from '../lib/playback';
import { loadAddByRSSIndexItemFromResourceData } from '../utils/addByRSS/playFromQueueResource';
import {
  buildPlaybackHandoffDismissedStateKey,
  readPlaybackHandoffDismissedStateKey,
  writePlaybackHandoffDismissedStateKey,
} from '../utils/playbackHandoffDismissal';
import {
  readPlaybackHandoffLocalState,
  writePlaybackHandoffLocalState,
} from './playbackHandoffState';
import { useAutoQueueLoadResources } from './useAutoQueueLoadResources';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';
import { usePlayAddByRSS } from './usePlayAddByRSS';
import { useQueueResourcesLoadActive } from './useQueueResourcesLoadActive';
import { useQueueResourcesUpdateNowPlaying } from './useQueueResourceUpdateNowPlaying';

/**
 * Queue head + auto-queue row reactions: fetch item metadata, resolve upcoming
 * queue resources into `mediaPlayerResourceUpdate` / `playAddByRSS` loads.
 * Kept out of `MediaPlayerController` so that file stays a thin coordinator.
 */
type PlaybackHandoffPromptState = {
  dismissedStateKey: string | null;
  localTitle: string | null;
  nextResource: DTOQueueResource;
  serverTitle: string | null;
};

/**
 * Titles are null when neither a title nor an id_text is known. Callers localize that fallback;
 * this hook never produces user-facing copy.
 */
export type QueueHeadPlaybackHandoffPrompt = {
  localTitle: string | null;
  serverTitle: string | null;
};

export type QueueHeadLoadingState = {
  handoffPrompt: QueueHeadPlaybackHandoffPrompt | null;
  continueLocalPlayback: () => void;
  switchToServerPlayback: () => void;
};

/** Upcoming rows sit strictly above 0. Now-playing is ~0; history is negative. */
const isUpcomingQueueListPosition = (listPosition: string): boolean => {
  const position = Number(listPosition);
  return Number.isFinite(position) && position > 0;
};

const queueResourceIdentity = (
  resource: DTOQueueResource
): { itemIdText: string; itemTitle: string | null } | null => {
  if (resource.item?.id_text) {
    return {
      itemIdText: resource.item.id_text,
      itemTitle: resource.item.title ?? null,
    };
  }
  if (resource.clip?.item?.id_text) {
    return {
      itemIdText: resource.clip.item.id_text,
      itemTitle: resource.clip.item.title ?? null,
    };
  }
  if (resource.item_soundbite?.item?.id_text) {
    return {
      itemIdText: resource.item_soundbite.item.id_text,
      itemTitle: resource.item_soundbite.item.title ?? null,
    };
  }
  const addByRssIdText = resource.add_by_rss_resource_data?.id_text;
  if (typeof addByRssIdText === 'string' && addByRssIdText.length > 0) {
    const addByRssTitle = resource.add_by_rss_resource_data?.title;
    return {
      itemIdText: addByRssIdText,
      itemTitle: typeof addByRssTitle === 'string' ? addByRssTitle : null,
    };
  }
  return null;
};

const resolveDisplayTitle = (
  title: string | null | undefined,
  idText: string | null | undefined
): string | null => {
  if (typeof title === 'string') {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 0) {
      return trimmedTitle;
    }
  }
  if (typeof idText === 'string') {
    const trimmedIdText = idText.trim();
    if (trimmedIdText.length > 0) {
      return trimmedIdText;
    }
  }
  return null;
};

export function useMediaPlayerControllerQueueHeadLoading(): QueueHeadLoadingState {
  const apiRequestService = getApiRequestService();
  const {
    mpChannel,
    mpItem,
    mpClip,
    mpItemSoundbite,
    mpAddByRSS,
    mpDuration,
    mpIsPlaying,
    pendingMusicQueueLoadIntentRef,
    mpEnclosureSelectedParams,
    setMPEnclosureSelectedParams,
    setMPItemChapters,
    setMPItemLabeledItemEnclosures,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { preferredMediaType } = useLocalSettings();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const playAddByRSS = usePlayAddByRSS();
  const updateNowPlaying = useQueueResourcesUpdateNowPlaying();
  const { activeQueue, activeQueueUpcomingResources } = useQueues();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const { autoQueueResources, autoQueueActiveRow, autoQueueConfig } = useAutoQueue();
  const autoQueueLoadResources = useAutoQueueLoadResources();
  const [playbackHandoffPrompt, setPlaybackHandoffPrompt] =
    useState<PlaybackHandoffPromptState | null>(null);
  const playbackHandoffDismissedStateKeyRef = useRef<string | null>(null);
  const activeQueueRef = useRef(activeQueue);
  const queueResourcesLoadActiveRef = useRef(queueResourcesLoadActive);
  const queueHeadAdoptInFlightRef = useRef(false);
  const queueHeadAdoptedWithoutListenRef = useRef<number | null>(null);

  useEffect(() => {
    activeQueueRef.current = activeQueue;
  }, [activeQueue]);

  useEffect(() => {
    queueResourcesLoadActiveRef.current = queueResourcesLoadActive;
  }, [queueResourcesLoadActive]);

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

  useEffect(() => {
    playbackHandoffDismissedStateKeyRef.current = readPlaybackHandoffDismissedStateKey();
  }, []);

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

  type QueueResourceLoadOptions = {
    forcePlay?: boolean;
    /** Empty-player hydration must not stamp `last_played_at`. */
    skipNowPlayingWrite?: boolean;
    /** Empty-player hydration loads paused. */
    pauseOnLoad?: boolean;
  };

  const rememberQueueResourceAsLocalState = (nextResource: DTOQueueResource): void => {
    const resourceIdentity = queueResourceIdentity(nextResource);
    if (resourceIdentity === null) {
      return;
    }
    writePlaybackHandoffLocalState({
      itemIdText: resourceIdentity.itemIdText,
      itemTitle: resourceIdentity.itemTitle,
      lastPlayedAt: nextResource.last_played_at,
    });
  };

  const shouldLoadQueueResource = (nextResource: DTOQueueResource): boolean => {
    const serverIdentity = queueResourceIdentity(nextResource);
    const localState = readPlaybackHandoffLocalState();
    const hasLoadedLocalTarget =
      mpItem !== null || mpAddByRSS !== null || mpClip !== null || mpItemSoundbite !== null;
    if (!hasLoadedLocalTarget) {
      return true;
    }
    const localItemIdText = localState?.itemIdText ?? mpItem?.id_text ?? null;

    if (serverIdentity === null || localItemIdText === null) {
      return true;
    }
    if (localItemIdText === serverIdentity.itemIdText) {
      return true;
    }

    const handoffDecision = resolveHandoffDecision({
      localItemIdText,
      localLastPlayedAt: localState?.lastPlayedAt ?? null,
      serverItemIdText: serverIdentity.itemIdText,
      serverLastPlayedAt: nextResource.last_played_at,
      isPlayingLocally: mpIsPlaying,
    });

    if (handoffDecision.kind !== 'prompt') {
      return false;
    }

    const dismissedStateKey = buildPlaybackHandoffDismissedStateKey({
      serverItemIdText: serverIdentity.itemIdText,
      serverLastPlayedAt: nextResource.last_played_at,
    });
    if (
      dismissedStateKey !== null &&
      dismissedStateKey === playbackHandoffDismissedStateKeyRef.current
    ) {
      return false;
    }

    setPlaybackHandoffPrompt({
      dismissedStateKey,
      localTitle: resolveDisplayTitle(localState?.itemTitle, localItemIdText),
      nextResource,
      serverTitle: resolveDisplayTitle(serverIdentity.itemTitle, serverIdentity.itemIdText),
    });

    return false;
  };

  async function handleLoadQueueItem(
    nextResource: DTOQueueResource,
    options?: QueueResourceLoadOptions
  ) {
    const fullItem = await apiRequestService.reqItemGetByIdOrIdText(nextResource.item.id_text);
    if (fullItem) {
      const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(fullItem.channel_id);
      if (fullChannel) {
        rememberQueueResourceAsLocalState(nextResource);
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
          isPlaying:
            options?.forcePlay === true ? true : options?.pauseOnLoad === true ? false : undefined,
          shouldPlay:
            options?.forcePlay === true ? true : options?.pauseOnLoad === true ? false : undefined,
          skipNowPlayingWrite: options?.skipNowPlayingWrite === true,
        });
      }
    }
  }

  async function handleLoadQueueClip(
    nextResource: DTOQueueResource,
    options?: QueueResourceLoadOptions
  ) {
    if (nextResource?.clip && nextResource?.clip?.id_text !== mpClipRef.current?.id_text) {
      const fullClip = await apiRequestService.reqClipGet(nextResource.clip.id_text);
      if (fullClip) {
        const fullItem = await apiRequestService.reqItemGetByIdOrIdText(fullClip.item.id_text);
        if (fullItem) {
          const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(
            fullItem.channel_id
          );
          if (fullChannel) {
            rememberQueueResourceAsLocalState(nextResource);
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
              isPlaying:
                options?.forcePlay === true
                  ? true
                  : options?.pauseOnLoad === true
                    ? false
                    : undefined,
              shouldPlay:
                options?.forcePlay === true
                  ? true
                  : options?.pauseOnLoad === true
                    ? false
                    : undefined,
              skipNowPlayingWrite: options?.skipNowPlayingWrite === true,
            });
          }
        }
      }
    }
  }

  async function handleLoadQueueItemSoundbite(
    nextResource: DTOQueueResource,
    options?: QueueResourceLoadOptions
  ) {
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
            rememberQueueResourceAsLocalState(nextResource);
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
              isPlaying:
                options?.forcePlay === true
                  ? true
                  : options?.pauseOnLoad === true
                    ? false
                    : undefined,
              shouldPlay:
                options?.forcePlay === true
                  ? true
                  : options?.pauseOnLoad === true
                    ? false
                    : undefined,
              skipNowPlayingWrite: options?.skipNowPlayingWrite === true,
            });
          }
        }
      }
    }
  }

  async function handleLoadQueueItemAddByRSS(
    nextResource: DTOQueueResource,
    options?: QueueResourceLoadOptions
  ) {
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
          : undefined,
        undefined,
        {
          recordNowPlaying: options?.skipNowPlayingWrite !== true,
          shouldPlay: options?.pauseOnLoad === true ? false : options?.forcePlay !== false,
        }
      );
      rememberQueueResourceAsLocalState(nextResource);
    }
  }

  const continueLocalPlayback = () => {
    if (playbackHandoffPrompt === null) {
      return;
    }

    if (playbackHandoffPrompt.dismissedStateKey !== null) {
      playbackHandoffDismissedStateKeyRef.current = playbackHandoffPrompt.dismissedStateKey;
      writePlaybackHandoffDismissedStateKey(playbackHandoffPrompt.dismissedStateKey);
    }

    setPlaybackHandoffPrompt(null);

    if (mpChannel && mpItem) {
      void updateNowPlaying({
        mpChannel,
        mpCurrentTime,
        mpDuration,
        mpClip,
        mpItem,
        mpItemSoundbite,
        eventKind: 'play',
      });
      writePlaybackHandoffLocalState({
        itemIdText: mpItem.id_text,
        itemTitle: mpItem.title,
        lastPlayedAt: new Date().toISOString(),
      });
    }
  };

  // An explicit choice from this prompt is allowed to replace the loaded item even if playback has
  // since started. The guard against swapping items under active playback belongs to the automatic
  // path, which is why the prompt itself is only ever raised while playback is idle.
  const switchToServerPlayback = () => {
    if (playbackHandoffPrompt === null) {
      return;
    }

    const { nextResource } = playbackHandoffPrompt;
    setPlaybackHandoffPrompt(null);

    if (nextResource.add_by_rss_resource_data && !nextResource.is_add_by_rss_redacted) {
      void handleLoadQueueItemAddByRSS(nextResource);
      return;
    }
    if (nextResource.item) {
      void handleLoadQueueItem(nextResource, { forcePlay: true });
      return;
    }
    if (nextResource.clip) {
      void handleLoadQueueClip(nextResource, { forcePlay: true });
      return;
    }
    if (nextResource.item_soundbite) {
      void handleLoadQueueItemSoundbite(nextResource, { forcePlay: true });
    }
  };

  useEffect(() => {
    if (!activeQueueUpcomingResources || activeQueueUpcomingResources.length === 0) {
      return;
    }
    const nextResource = activeQueueUpcomingResources[0];
    if (!nextResource) {
      return;
    }
    if (!shouldLoadQueueResource(nextResource)) {
      return;
    }

    const playerEmpty =
      mpItem === null && mpAddByRSS === null && mpClip === null && mpItemSoundbite === null;
    const adoptedWithoutListen = queueHeadAdoptedWithoutListenRef.current === nextResource.id;

    const dispatchLoad = (options?: QueueResourceLoadOptions) => {
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
        void handleLoadQueueItemAddByRSS(nextResource, options);
      } else if (nextResource.item && !isAlreadyPlayingThisAddByRSS) {
        void handleLoadQueueItem(nextResource, options);
      } else if (nextResource.clip) {
        void handleLoadQueueClip(nextResource, options);
      } else if (nextResource.item_soundbite) {
        void handleLoadQueueItemSoundbite(nextResource, options);
      }
    };

    if (!playerEmpty) {
      dispatchLoad(adoptedWithoutListen ? { skipNowPlayingWrite: true } : undefined);
      return;
    }

    if (queueHeadAdoptInFlightRef.current || adoptedWithoutListen) {
      return;
    }

    queueHeadAdoptInFlightRef.current = true;
    void (async () => {
      try {
        const queueIdText = activeQueueRef.current?.id_text;
        if (isUpcomingQueueListPosition(nextResource.list_position) && queueIdText) {
          await apiRequestService.reqQueueResourcesPromoteUpcomingToNowPlaying(queueIdText);
          await queueResourcesLoadActiveRef.current();
        }
      } catch {
        // The row still loads. A full reload retries the promote; this pass does not loop.
      }
      queueHeadAdoptedWithoutListenRef.current = nextResource.id;
      queueHeadAdoptInFlightRef.current = false;
      dispatchLoad({ skipNowPlayingWrite: true, pauseOnLoad: true });
    })();
  }, [
    activeQueueUpcomingResources,
    mpAddByRSS?.idText,
    mpClip?.id_text,
    mpIsPlaying,
    mpItem?.id_text,
    mpItemSoundbite?.id_text,
    mpItem?.title,
  ]);

  useEffect(() => {
    if (autoQueueActiveRow || autoQueueActiveRow === 0) {
      const newResource = autoQueueResourcesRef.current[autoQueueActiveRow];
      if (newResource) {
        void handleLoadAutoQueueItem(newResource);
      }
    }
  }, [autoQueueActiveRow]);

  return {
    handoffPrompt:
      playbackHandoffPrompt === null
        ? null
        : {
            localTitle: playbackHandoffPrompt.localTitle,
            serverTitle: playbackHandoffPrompt.serverTitle,
          },
    continueLocalPlayback,
    switchToServerPlayback,
  };
}

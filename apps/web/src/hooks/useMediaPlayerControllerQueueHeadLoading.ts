'use client';

import { useEffect, useRef, useState } from 'react';

import type { DTOItem, DTOQueueResource } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  getAddByRSSHashIdsForResourceData,
  resolveHandoffDecision,
  resolvePreferredMediaTypeEnclosureSelectedParams,
} from '@podverse/helpers';
import { buildAddByRSSResourceData } from '@podverse/parser-mapping';

import type { AutoQueueResourcesMapRow } from '../contexts/AutoQueue';
import { checkIsActiveRowHighestKey, useAutoQueue } from '../contexts/AutoQueue';
import { useCrossDevicePlaybackSnapshot } from '../contexts/CrossDevicePlayback';
import { useLocalSettings } from '../contexts/LocalSettings';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';
import { crossDevicePlaybackStore } from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import type { MusicItemPlaybackIntent } from '../lib/playback';
import {
  parsePlaybackSeconds,
  playbackTargetFromStandardLoad,
  playbackTargetLivestream,
} from '../lib/playback';
import { fetchFreshRestoredItem } from '../lib/playback/fetchFreshRestoredItem';
import {
  getAddByRSSResourceDataFeedUrl,
  resolveAddByRSSIndexItemFromResourceData,
} from '../utils/addByRSS/playFromQueueResource';
import { checkIsLiveItem } from '../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import {
  buildPlaybackHandoffDismissedStateKey,
  readPlaybackHandoffDismissedStateKey,
  writePlaybackHandoffDismissedStateKey,
} from '../utils/playbackHandoffDismissal';
import {
  addByRSSPlaybackIdentity,
  clearPlaybackHandoffLocalState,
  readPlaybackHandoffLocalState,
  writePlaybackHandoffLocalState,
} from './playbackHandoffState';
import { useAddByRSSMetadataUpgrade } from './useAddByRSSMetadataUpgrade';
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

type QueueHeadLoadDecision =
  | { kind: 'load' }
  | { kind: 'skip' }
  | { kind: 'offer-handoff'; prompt: PlaybackHandoffPromptState };

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

type QueueResourceIdentity = {
  itemIdText: string;
  itemTitle: string | null;
  /** Shown when there is no title. Null for add-by-RSS, whose identity is a hash. */
  displayIdText: string | null;
};

const queueResourceIdentity = (resource: DTOQueueResource): QueueResourceIdentity | null => {
  if (resource.item?.id_text) {
    return {
      itemIdText: resource.item.id_text,
      itemTitle: resource.item.title ?? null,
      displayIdText: resource.item.id_text,
    };
  }
  if (resource.clip?.item?.id_text) {
    return {
      itemIdText: resource.clip.item.id_text,
      itemTitle: resource.clip.item.title ?? null,
      displayIdText: resource.clip.item.id_text,
    };
  }
  if (resource.item_soundbite?.item?.id_text) {
    return {
      itemIdText: resource.item_soundbite.item.id_text,
      itemTitle: resource.item_soundbite.item.title ?? null,
      displayIdText: resource.item_soundbite.item.id_text,
    };
  }
  const addByRssIdentity = addByRSSPlaybackIdentity(
    resource.add_by_rss_resource_data,
    resource.add_by_rss_hash_id
  );
  if (addByRssIdentity !== null) {
    const addByRssTitle = resource.add_by_rss_resource_data?.title;
    return {
      itemIdText: addByRssIdentity,
      itemTitle: typeof addByRssTitle === 'string' ? addByRssTitle : null,
      displayIdText: null,
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

/** Another device is playing, so this tab must not load into the local player. */
const isRemotePlaybackRole = (): boolean =>
  crossDevicePlaybackStore.getSnapshot().role === 'remote';

/**
 * Whether this tab moves an ended livestream queue head to History. A `remote` tab never does:
 * another device, or this browser's audio tab, owns the head. Every other tab owns it, including
 * an `idle` tab when no session is active. Ownership is unknown until the first check-in settles.
 */
const resolveEndedQueueHeadOwnership = (): 'owner' | 'not-owner' | 'unknown' => {
  const snapshot = crossDevicePlaybackStore.getSnapshot();
  if (snapshot.availability === 'pending') {
    return 'unknown';
  }
  return snapshot.role === 'remote' ? 'not-owner' : 'owner';
};

/** The prompt belongs to a settled idle tab; the effect that closes it uses the same test. */
const canRaisePlaybackHandoffPrompt = (): boolean => {
  const snapshot = crossDevicePlaybackStore.getSnapshot();
  return snapshot.role === 'idle' && snapshot.availability !== 'pending';
};

/**
 * The item whose live status decides whether a queue head may be offered: the rows that
 * `switchToServerPlayback` sends to `handleLoadQueueItem`. Add by RSS rows have no server status.
 */
const queueHeadItemIdTextForStatusRead = (resource: DTOQueueResource): string | null => {
  if (resource.add_by_rss_resource_data && !resource.is_add_by_rss_redacted) {
    return null;
  }
  return resource.item?.id_text ?? null;
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
    playbackLoadGenerationRef,
    mpEnclosureSelectedParams,
    setMPEnclosureSelectedParams,
    setMPItemChapters,
    setMPItemLabeledItemEnclosures,
  } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { preferredMediaType } = useLocalSettings();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const playAddByRSS = usePlayAddByRSS();
  const armAddByRSSMetadataUpgrade = useAddByRSSMetadataUpgrade();
  const updateNowPlaying = useQueueResourcesUpdateNowPlaying();
  const { activeQueue, activeQueueUpcomingResources } = useQueues();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const { autoQueueResources, autoQueueActiveRow, autoQueueConfig } = useAutoQueue();
  const autoQueueLoadResources = useAutoQueueLoadResources();
  const crossDeviceRole = useCrossDevicePlaybackSnapshot((snapshot) => snapshot.role);
  const crossDeviceAvailability = useCrossDevicePlaybackSnapshot(
    (snapshot) => snapshot.availability
  );
  const [playbackHandoffPrompt, setPlaybackHandoffPrompt] =
    useState<PlaybackHandoffPromptState | null>(null);
  const playbackHandoffDismissedStateKeyRef = useRef<string | null>(null);
  const activeQueueRef = useRef(activeQueue);
  const queueResourcesLoadActiveRef = useRef(queueResourcesLoadActive);
  const queueHeadAdoptInFlightRef = useRef(false);
  const queueHeadAdoptedWithoutListenRef = useRef<number | null>(null);
  // Automatic queue loads give way to a load applied after they start, and to a newer
  // automatic load from this hook (latest request id wins).
  const queueHeadLoadRequestIdRef = useRef(0);
  // Each queue-head effect run starts a new prompt check; a status read from an earlier run is
  // dropped, so a prompt never opens for a decision that no longer holds.
  const handoffPromptCheckIdRef = useRef(0);

  type AutomaticLoadToken = { requestId: number; loadGeneration: number };

  const isStaleAutomaticLoad = (token: AutomaticLoadToken | undefined): boolean =>
    token !== undefined &&
    (token.requestId !== queueHeadLoadRequestIdRef.current ||
      token.loadGeneration !== playbackLoadGenerationRef.current);

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
        if (isRemotePlaybackRole()) {
          return;
        }
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
    /** Present on automatic loads; omitted for an explicit handoff "switch" choice. */
    automaticLoad?: AutomaticLoadToken;
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

  /** What the player holds. The handoff record never stands in for it. */
  const loadedPlaybackIdentity = (): string | null => {
    if (mpAddByRSS !== null) {
      return addByRSSPlaybackIdentity(mpAddByRSS.resourceData);
    }
    if (mpItem?.id_text) {
      return mpItem.id_text;
    }
    if (mpClip?.item?.id_text) {
      return mpClip.item.id_text;
    }
    if (mpItemSoundbite?.item?.id_text) {
      return mpItemSoundbite.item.id_text;
    }
    return null;
  };

  /**
   * True when `identity` names the loaded item. A payload that includes `feed_url` is also named
   * by the hash that omits `feed_url`.
   */
  const isLoadedPlaybackIdentity = (identity: string): boolean => {
    if (identity === loadedPlaybackIdentity()) {
      return true;
    }
    return (
      mpAddByRSS !== null &&
      getAddByRSSHashIdsForResourceData(mpAddByRSS.resourceData).includes(identity)
    );
  };

  const loadedAddByRSSTitle = (): string | null => {
    const title = mpAddByRSS?.resourceData.title;
    return typeof title === 'string' ? title : null;
  };

  const rememberPlaybackHandoffDismissal = (dismissedStateKey: string | null): void => {
    if (dismissedStateKey === null) {
      return;
    }
    playbackHandoffDismissedStateKeyRef.current = dismissedStateKey;
    writePlaybackHandoffDismissedStateKey(dismissedStateKey);
  };

  const resolveQueueHeadLoadDecision = (nextResource: DTOQueueResource): QueueHeadLoadDecision => {
    const serverIdentity = queueResourceIdentity(nextResource);
    const hasLoadedLocalTarget =
      mpItem !== null || mpAddByRSS !== null || mpClip !== null || mpItemSoundbite !== null;
    if (!hasLoadedLocalTarget) {
      return { kind: 'load' };
    }
    const localItemIdText = loadedPlaybackIdentity();
    // A record naming anything other than the loaded item is stale; its timestamp and title
    // describe a different item.
    const storedLocalState = readPlaybackHandoffLocalState();
    const localState =
      storedLocalState !== null && isLoadedPlaybackIdentity(storedLocalState.itemIdText)
        ? storedLocalState
        : null;
    if (storedLocalState !== null && localState === null) {
      clearPlaybackHandoffLocalState();
    }

    if (serverIdentity === null || localItemIdText === null) {
      return { kind: 'load' };
    }
    if (isLoadedPlaybackIdentity(serverIdentity.itemIdText)) {
      return { kind: 'load' };
    }

    const handoffDecision = resolveHandoffDecision({
      localItemIdText,
      localLastPlayedAt: localState?.lastPlayedAt ?? null,
      serverItemIdText: serverIdentity.itemIdText,
      serverLastPlayedAt: nextResource.last_played_at,
      isPlayingLocally: mpIsPlaying,
    });

    if (handoffDecision.kind !== 'prompt') {
      return { kind: 'skip' };
    }

    const dismissedStateKey = buildPlaybackHandoffDismissedStateKey({
      serverItemIdText: serverIdentity.itemIdText,
      serverLastPlayedAt: nextResource.last_played_at,
    });
    if (
      dismissedStateKey !== null &&
      dismissedStateKey === playbackHandoffDismissedStateKeyRef.current
    ) {
      return { kind: 'skip' };
    }

    // Live control covers a remote or active tab. Hold the prompt until the first check-in settles.
    if (crossDeviceRole !== 'idle' || crossDeviceAvailability === 'pending') {
      return { kind: 'skip' };
    }

    return {
      kind: 'offer-handoff',
      prompt: {
        dismissedStateKey,
        localTitle:
          mpAddByRSS !== null
            ? resolveDisplayTitle(loadedAddByRSSTitle() ?? localState?.itemTitle, null)
            : resolveDisplayTitle(localState?.itemTitle, localItemIdText),
        nextResource,
        serverTitle: resolveDisplayTitle(serverIdentity.itemTitle, serverIdentity.displayIdText),
      },
    };
  };

  /**
   * Opens the handoff prompt after reading the head's item fresh. An ended or missing livestream
   * head is never offered: its dismissal is remembered so the same head does not ask again, and
   * nothing is written, because the tab that owns the head retires it. With no answer, the prompt
   * names the queue row as it is.
   */
  async function offerPlaybackHandoffPrompt(
    prompt: PlaybackHandoffPromptState,
    checkId: number
  ): Promise<void> {
    const headItemIdText = queueHeadItemIdTextForStatusRead(prompt.nextResource);
    if (headItemIdText !== null) {
      const restored = await fetchFreshRestoredItem(headItemIdText);
      if (checkId !== handoffPromptCheckIdRef.current || !canRaisePlaybackHandoffPrompt()) {
        return;
      }
      if (restored.decision.action === 'retire') {
        rememberPlaybackHandoffDismissal(prompt.dismissedStateKey);
        return;
      }
    }
    setPlaybackHandoffPrompt(prompt);
  }

  /**
   * An ended livestream at the queue head is treated like a finished item: its row goes to
   * history and the queue reloads, so the queue-head effect loads the next row paused. An item
   * the server no longer has writes nothing; the player stays empty.
   */
  async function retireEndedQueueHeadItem(endedItem: DTOItem | null): Promise<void> {
    const queueIdText = activeQueueRef.current?.id_text;
    if (endedItem === null || !queueIdText) {
      return;
    }
    const ownership = resolveEndedQueueHeadOwnership();
    if (ownership === 'unknown') {
      // The queue-head effect runs again when availability settles, and reads the head again.
      queueHeadAdoptedWithoutListenRef.current = null;
      return;
    }
    if (ownership === 'not-owner') {
      return;
    }
    try {
      await apiRequestService.reqQueueResourceItemAddHistory(queueIdText, endedItem.id_text, {
        playback_position: '0',
        completed: true,
      });
      await queueResourcesLoadActiveRef.current(undefined, { queueIdText });
    } catch (error: unknown) {
      console.error('Ended livestream could not move to history', {
        error,
        itemIdText: endedItem.id_text,
      });
    }
  }

  async function handleLoadQueueItem(
    nextResource: DTOQueueResource,
    options?: QueueResourceLoadOptions
  ) {
    const restored = await fetchFreshRestoredItem(nextResource.item.id_text);
    if (restored.decision.action === 'retire') {
      if (isStaleAutomaticLoad(options?.automaticLoad)) {
        return;
      }
      await retireEndedQueueHeadItem(restored.item);
      return;
    }
    // No answer from the server: load the queue row's own copy, which carries its channel.
    const itemToLoad = restored.item ?? nextResource.item;
    const rowChannel = restored.item === null ? (nextResource.item.channel ?? null) : null;
    const fullChannel =
      rowChannel ?? (await apiRequestService.reqChannelGetByIdOrIdText(itemToLoad.channel_id));
    if (!fullChannel) {
      return;
    }
    if (isStaleAutomaticLoad(options?.automaticLoad) || isRemotePlaybackRole()) {
      return;
    }
    rememberQueueResourceAsLocalState(nextResource);
    const musicIntent = resolveMusicIntentForQueueHeadLoad();
    const loadsAsLivestream =
      checkIsLiveItem(itemToLoad) && !nextResource.clip && !nextResource.item_soundbite;
    mediaPlayerResourceUpdate({
      target: loadsAsLivestream
        ? playbackTargetLivestream(fullChannel, itemToLoad)
        : playbackTargetFromStandardLoad({
            channel: fullChannel,
            clip: nextResource.clip ?? null,
            item: itemToLoad,
            itemChapter: null,
            itemSoundbite: nextResource.item_soundbite ?? null,
            musicIntent,
          }),
      explicitPlaybackSeconds: loadsAsLivestream
        ? undefined
        : parsePlaybackSeconds(nextResource.playback_position),
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

  async function handleLoadQueueClip(
    nextResource: DTOQueueResource,
    options?: QueueResourceLoadOptions
  ) {
    if (nextResource?.clip && nextResource?.clip?.id_text !== mpClipRef.current?.id_text) {
      const fullClip = await apiRequestService.reqClipGet(nextResource.clip.id_text);
      if (fullClip) {
        const clipItem = fullClip.item;
        if (clipItem === null || clipItem === undefined) {
          return;
        }
        const fullItem = await apiRequestService.reqItemGetByIdOrIdText(clipItem.id_text);
        if (fullItem) {
          const fullChannel = await apiRequestService.reqChannelGetByIdOrIdText(
            fullItem.channel_id
          );
          if (fullChannel) {
            if (isStaleAutomaticLoad(options?.automaticLoad) || isRemotePlaybackRole()) {
              return;
            }
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
            if (isStaleAutomaticLoad(options?.automaticLoad) || isRemotePlaybackRole()) {
              return;
            }
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
    const resolved = await resolveAddByRSSIndexItemFromResourceData(resourceData);
    if (resolved) {
      if (isStaleAutomaticLoad(options?.automaticLoad) || isRemotePlaybackRole()) {
        return;
      }
      const { indexItem, source } = resolved;
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

      const feedUrl = getAddByRSSResourceDataFeedUrl(resourceData);
      if (
        resourceData !== null &&
        feedUrl !== null &&
        (source === 'minimal' || source === 'bundle') &&
        'bundle' in indexItem
      ) {
        const identity = addByRSSPlaybackIdentity(buildAddByRSSResourceData(indexItem));
        if (identity !== null) {
          armAddByRSSMetadataUpgrade({ identity, feedUrl, resourceData });
        }
      }
    }
  }

  const continueLocalPlayback = () => {
    if (playbackHandoffPrompt === null) {
      return;
    }

    rememberPlaybackHandoffDismissal(playbackHandoffPrompt.dismissedStateKey);

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
    handoffPromptCheckIdRef.current += 1;
    const handoffPromptCheckId = handoffPromptCheckIdRef.current;
    // Another device is playing. This tab does not load a queue item into the local player.
    if (crossDeviceRole === 'remote') {
      return;
    }
    if (!activeQueueUpcomingResources || activeQueueUpcomingResources.length === 0) {
      return;
    }
    const nextResource = activeQueueUpcomingResources[0];
    if (!nextResource) {
      return;
    }
    const loadDecision = resolveQueueHeadLoadDecision(nextResource);
    if (loadDecision.kind === 'offer-handoff') {
      if (
        playbackHandoffPrompt !== null &&
        playbackHandoffPrompt.nextResource.id === nextResource.id
      ) {
        // This head was already read before its prompt opened; refresh the titles only.
        setPlaybackHandoffPrompt(loadDecision.prompt);
      } else {
        void offerPlaybackHandoffPrompt(loadDecision.prompt, handoffPromptCheckId);
      }
      return;
    }
    if (loadDecision.kind === 'skip') {
      return;
    }

    const playerEmpty =
      mpItem === null && mpAddByRSS === null && mpClip === null && mpItemSoundbite === null;
    const adoptedWithoutListen = queueHeadAdoptedWithoutListenRef.current === nextResource.id;
    const effectLoadGeneration = playbackLoadGenerationRef.current;

    const dispatchLoad = (options?: QueueResourceLoadOptions) => {
      if (isRemotePlaybackRole()) {
        return;
      }
      queueHeadLoadRequestIdRef.current += 1;
      const automaticLoad: AutomaticLoadToken = {
        requestId: queueHeadLoadRequestIdRef.current,
        loadGeneration: effectLoadGeneration,
      };
      const loadOptions: QueueResourceLoadOptions = { ...options, automaticLoad };
      const nextAddByRSSIdentity = nextResource.add_by_rss_resource_data
        ? addByRSSPlaybackIdentity(
            nextResource.add_by_rss_resource_data,
            nextResource.add_by_rss_hash_id
          )
        : null;
      const isAlreadyPlayingThisAddByRSS =
        nextAddByRSSIdentity !== null &&
        mpAddByRSS !== null &&
        isLoadedPlaybackIdentity(nextAddByRSSIdentity);
      // This effect re-runs on play/pause, and a track fires `pause` just before `ended`. Reloading
      // the item already in the player writes it back to now-playing, which can land after `ended`
      // moved it to history and keep the queue from advancing.
      const isAlreadyLoadedThisItem =
        !nextResource.clip &&
        !nextResource.item_soundbite &&
        mpClip === null &&
        mpItemSoundbite === null &&
        mpAddByRSS === null &&
        nextResource.item?.id_text !== undefined &&
        nextResource.item.id_text === mpItem?.id_text;
      if (
        nextResource.add_by_rss_resource_data &&
        !nextResource.is_add_by_rss_redacted &&
        !isAlreadyPlayingThisAddByRSS
      ) {
        void handleLoadQueueItemAddByRSS(nextResource, loadOptions);
      } else if (nextResource.item && !isAlreadyPlayingThisAddByRSS && !isAlreadyLoadedThisItem) {
        void handleLoadQueueItem(nextResource, loadOptions);
      } else if (nextResource.clip) {
        void handleLoadQueueClip(nextResource, loadOptions);
      } else if (nextResource.item_soundbite) {
        void handleLoadQueueItemSoundbite(nextResource, loadOptions);
      }
    };

    if (!playerEmpty) {
      // Only an empty player adopts a different item automatically. A newer server item on a
      // paused player is offered through the handoff prompt instead.
      const serverIdentity = queueResourceIdentity(nextResource);
      if (serverIdentity === null || !isLoadedPlaybackIdentity(serverIdentity.itemIdText)) {
        return;
      }
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
          await queueResourcesLoadActiveRef.current(undefined, { queueIdText });
        }
      } catch {
        // The row still loads. A full reload retries the promote; this pass does not loop.
      }
      if (effectLoadGeneration !== playbackLoadGenerationRef.current || isRemotePlaybackRole()) {
        queueHeadAdoptInFlightRef.current = false;
        return;
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
    crossDeviceRole,
    crossDeviceAvailability,
  ]);

  useEffect(() => {
    // Read the role when the row changes. A role change by itself does not start a load.
    if (isRemotePlaybackRole()) {
      return;
    }
    if (autoQueueActiveRow || autoQueueActiveRow === 0) {
      const newResource = autoQueueResourcesRef.current[autoQueueActiveRow];
      if (newResource) {
        void handleLoadAutoQueueItem(newResource);
      }
    }
  }, [autoQueueActiveRow]);

  // An open prompt belongs to a settled idle tab. Dropping it records nothing, so the same
  // conflict can ask again once this tab is idle.
  useEffect(() => {
    if (playbackHandoffPrompt === null) {
      return;
    }
    if (crossDeviceRole !== 'idle' || crossDeviceAvailability === 'pending') {
      setPlaybackHandoffPrompt(null);
    }
  }, [crossDeviceAvailability, crossDeviceRole, playbackHandoffPrompt]);

  useEffect(() => {
    if (crossDeviceRole !== 'remote') {
      return;
    }
    // The other device owns the player. Forget an adopt so an empty player can load the queue
    // head again once this tab is idle.
    queueHeadAdoptedWithoutListenRef.current = null;
    queueHeadAdoptInFlightRef.current = false;
  }, [crossDeviceRole]);

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

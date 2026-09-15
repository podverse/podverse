import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { primaryLightboxArtworkUrl, primaryListArtworkUrl } from '@podverse/helpers';
import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOQueueResource,
} from '@podverse/helpers/dto';
import { getErrorCode } from '@podverse/helpers/error';
import type { PlaybackEventKind } from '@podverse/helpers/playbackEvents';
import {
  PLAYBACK_POSITION_LOCAL_INTERVAL_MS,
  PLAYBACK_POSITION_NETWORK_INTERVAL_MS,
} from '@podverse/helpers/playbackOutboxLimits';
import { getQueueForMedium } from '@podverse/helpers/queue';
import type { MusicItemPlaybackIntent, PlaybackTarget } from '@podverse/playback-core';
import { clampPlaybackPositionForStorage } from '@podverse/playback-core/clampNearEndSeconds';
import { resolveQueueAdvance } from '@podverse/playback-core/resolveQueueAdvance';

import { useAuth } from '../auth/AuthProvider';
import { nativePlaybackBridge } from '../bridge/nativePlaybackBridge';
import { useNativePlaybackBridge } from '../bridge/useNativePlaybackBridge';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useAutoQueue } from '../contexts/AutoQueueProvider';
import { useQueues } from '../contexts/QueuesProvider';
import type { MobileAuthRequestContext } from '../data';
import type { PlaybackOutboxEnqueueEvent, PlaybackStatsTargets } from '../data';
import {
  accountRepository,
  playbackContentRepository,
  playbackOutboxRepository,
  queueRepository,
  statsRepository,
} from '../data';
import type { PlaybackReconcileDifferentNowPlayingConflict } from '../data/repositories/playbackReconcile';
import type { AutoQueueSeed } from '../hooks/useAutoQueueLoadResources';
import { useAutoQueueLoadResources } from '../hooks/useAutoQueueLoadResources';
import { useQueueMutations } from '../hooks/useQueueMutations';
import { useQueueResourcesLoadActive } from '../hooks/useQueueResourcesLoadActive';
import type { AnonymousPlaybackSnapshot } from '../lib/anonymous/anonymousPlaybackStorage';
import {
  anonymousSnapshotFromTarget,
  clearAnonymousPlaybackSnapshot,
  readAnonymousPlaybackSnapshot,
  writeAnonymousPlaybackSnapshot,
} from '../lib/anonymous/anonymousPlaybackStorage';
import type { AutoQueueResourcesMapRow } from '../lib/autoQueue/autoQueue';
import { autoQueueIncrementActiveRow } from '../lib/autoQueue/autoQueue';
import {
  buildChapterPlaybackTarget,
  buildClipPlaybackTarget,
  buildItemPlaybackTarget,
  buildSoundbitePlaybackTarget,
  playbackTargetToHistoryTarget,
  playbackTargetToStatsTargets,
} from '../lib/playback/buildPlaybackTarget';
import { resolvePlaybackUrl } from '../lib/playback/resolvePlaybackUrl';
import { shouldSkipListenStatsForAccount } from '../popularityTracking/popularityTrackingGate';
import { getPref, setPref } from '../prefs/prefsStore';
import {
  readPlaybackReconcileConflicts,
  subscribePlaybackReconcileConflicts,
} from '../sync/playbackReconcileConflict';
import {
  nowPlayingResourceFromTarget,
  playbackEventFromBackgroundTransition,
  playbackEventFromDiscreteSignal,
  playbackEventFromProgressSample,
  shouldClaimActiveQueueForPlaybackEvent,
  shouldPostNowPlayingImmediately,
} from './playbackEventSource';
import {
  buildPlaybackHandoffDismissedStateKey,
  shouldPromptForPlaybackHandoffConflict,
} from './playbackHandoff';
import { writeIsPlayingLocallyForSync } from './playbackSyncState';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';

export type PlaybackNowPlaying = {
  title: string;
  /** Compact chrome (mini player): shrunken-first. */
  imageUrl: string | null;
  /** Full player display and image viewer: largest original. */
  viewerImageUrl: string | null;
  channelTitle: string | null;
};

/**
 * Caller-declared auto-queue side effect for a load (mirrors web's `autoQueueShouldClear` /
 * `newAutoQueueConfig` on `useMediaPlayerResourceUpdate` — NOT the playback-core decision flag):
 * - `clear`: explicit user play resets the auto-queue resources and drops any playlist source.
 * - `preserve`: auto-advance keeps the seeded auto-queue intact.
 * - `seed-playlist`: playlist row play sets the playlist as the auto-queue source.
 */
type AutoQueueDirective =
  { mode: 'clear' } | { mode: 'preserve' } | { mode: 'seed-playlist'; playlistIdText: string };

const ANONYMOUS_SNAPSHOT_THROTTLE_MS = 5000;
const PLAYBACK_HANDOFF_DISMISSED_STATE_PREF_KEY = 'playback.handoff_dismissed_state';

type PlaybackHandoffPromptState = {
  conflict: PlaybackReconcileDifferentNowPlayingConflict;
  dismissedStateKey: string | null;
  localTitle: string;
  remoteResource: DTOQueueResource;
  serverTitle: string;
};

const normalizePlaybackPosition = (value: string | null | undefined): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(0, parsed);
};

const resolveQueueResourceRef = (
  resource: DTOQueueResource
): {
  resourceIdText: string;
  resourceKind: 'add_by_rss' | 'clip' | 'item' | 'soundbite';
} | null => {
  if (typeof resource.add_by_rss_hash_id === 'string' && resource.add_by_rss_hash_id.length > 0) {
    return { resourceIdText: resource.add_by_rss_hash_id, resourceKind: 'add_by_rss' };
  }
  if (resource.item_soundbite?.id_text) {
    return { resourceIdText: resource.item_soundbite.id_text, resourceKind: 'soundbite' };
  }
  if (resource.clip?.id_text) {
    return { resourceIdText: resource.clip.id_text, resourceKind: 'clip' };
  }
  if (resource.item?.id_text) {
    return { resourceIdText: resource.item.id_text, resourceKind: 'item' };
  }
  return null;
};

const queueResourceTitle = (resource: DTOQueueResource): string | null => {
  const titleFromItem = resource.item?.title;
  if (typeof titleFromItem === 'string' && titleFromItem.length > 0) {
    return titleFromItem;
  }
  const titleFromClipItem = resource.clip?.item?.title;
  if (typeof titleFromClipItem === 'string' && titleFromClipItem.length > 0) {
    return titleFromClipItem;
  }
  const titleFromSoundbiteItem = resource.item_soundbite?.item?.title;
  if (typeof titleFromSoundbiteItem === 'string' && titleFromSoundbiteItem.length > 0) {
    return titleFromSoundbiteItem;
  }
  return null;
};

export type PlaybackContextValue = {
  activeTarget: PlaybackTarget | null;
  nowPlaying: PlaybackNowPlaying | null;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  /** Audio-first play notice key (e.g. missing enclosure, unavailable livestream). */
  noticeKey: string | null;
  playItem: (
    item: DTOItem,
    channel: DTOChannel,
    options?: { intent?: MusicItemPlaybackIntent }
  ) => Promise<void>;
  playClip: (clip: DTOClip, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playSoundbite: (soundbite: DTOItemSoundbite, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playChapter: (chapter: DTOItemChapter, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playItemById: (idText: string) => Promise<void>;
  playClipById: (idText: string) => Promise<void>;
  /** Play a playlist row and seed the auto-queue source to that playlist (web list-row parity). */
  playPlaylistRowById: (
    idText: string,
    kind: 'item' | 'clip',
    playlistIdText: string
  ) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  seekTo: (seconds: number) => void;
  setRate: (rate: number) => void;
  skipToNext: () => Promise<void>;
  /** Same path as the native `ended` handler (`advance('complete')`). */
  completeNowPlaying: () => Promise<void>;
};

/**
 * Session / control surface: changes on load, play/pause, rate, notices — not on every timeupdate.
 * List rows that only need “is this the active item?” subscribe here.
 */
export type PlaybackSessionContextValue = Omit<
  PlaybackContextValue,
  'durationSeconds' | 'positionSeconds'
>;

/** High-frequency playhead. Prefer mounting consumers only for the active now-playing chrome. */
export type PlaybackProgressContextValue = {
  durationSeconds: number;
  positionSeconds: number;
};

const PlaybackSessionContext = createContext<PlaybackSessionContextValue | undefined>(undefined);
const PlaybackProgressContext = createContext<PlaybackProgressContextValue | undefined>(undefined);

const summaryFromItem = (item: DTOItem, channel: DTOChannel): PlaybackNowPlaying => ({
  channelTitle: channel.title ?? null,
  imageUrl: primaryListArtworkUrl(item.item_images, channel.channel_images),
  title: item.title ?? '',
  viewerImageUrl: primaryLightboxArtworkUrl(item.item_images, channel.channel_images),
});

const hasPlaybackStatsTargets = (targets: PlaybackStatsTargets): boolean => {
  return (
    targets.channelIdText !== null || targets.clipIdText !== null || targets.itemIdText !== null
  );
};

// Module-level guard so the anonymous restore fires at most once per app process (web parity with
// `anonymousPlaybackRestoreStarted` in AnonymousPlaybackRestoreController).
let anonymousPlaybackRestoreStarted = false;

export function PlaybackProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeQueue, queues, setActiveQueue } = useQueues();
  const {
    autoQueueActiveRow,
    autoQueueConfig,
    autoQueueResources,
    setAutoQueueActiveRow,
    setAutoQueueConfig,
    setAutoQueueResources,
  } = useAutoQueue();
  const loadActive = useQueueResourcesLoadActive();
  const { moveNowPlayingToHistory } = useQueueMutations();
  const loadAutoQueueResources = useAutoQueueLoadResources();
  const applyLoad = useMediaPlayerResourceUpdate();

  const [activeTarget, setActiveTarget] = useState<PlaybackTarget | null>(null);
  const [nowPlaying, setNowPlaying] = useState<PlaybackNowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionSeconds, setPositionSeconds] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [playbackHandoffPrompt, setPlaybackHandoffPrompt] =
    useState<PlaybackHandoffPromptState | null>(null);
  const [playbackReconcileConflicts, setPlaybackReconcileConflicts] = useState<
    readonly PlaybackReconcileDifferentNowPlayingConflict[]
  >([]);

  const activeTargetRef = useRef<PlaybackTarget | null>(null);
  const nowPlayingRef = useRef<PlaybackNowPlaying | null>(null);
  const positionRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const pauseAtRef = useRef<number | null>(null);
  const playbackRateRef = useRef<number>(1);
  const advancingRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const lastAnonymousSnapshotWriteRef = useRef<number>(0);
  const lastPlaybackLocalWriteRef = useRef<number>(0);
  const lastPlaybackNetworkWriteRef = useRef<number>(0);
  const appStateRef = useRef(AppState.currentState);
  const accountIdTextRef = useRef<string | null>(account?.id_text ?? null);
  const playbackHandoffPromptRef = useRef<PlaybackHandoffPromptState | null>(null);
  const playbackHandoffDismissedStateKeyRef = useRef<string | null>(null);

  const activeQueueRef = useRef(activeQueue);
  useEffect(() => {
    activeQueueRef.current = activeQueue;
  }, [activeQueue]);
  const queuesRef = useRef(queues);
  useEffect(() => {
    queuesRef.current = queues;
  }, [queues]);
  const autoQueueActiveRowRef = useRef(autoQueueActiveRow);
  useEffect(() => {
    autoQueueActiveRowRef.current = autoQueueActiveRow;
  }, [autoQueueActiveRow]);
  const autoQueueConfigRef = useRef(autoQueueConfig);
  useEffect(() => {
    autoQueueConfigRef.current = autoQueueConfig;
  }, [autoQueueConfig]);
  const autoQueueResourcesRef = useRef(autoQueueResources);
  useEffect(() => {
    autoQueueResourcesRef.current = autoQueueResources;
  }, [autoQueueResources]);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
    accountIdTextRef.current = account?.id_text ?? null;
  }, [account]);
  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);
  useEffect(() => {
    playbackHandoffPromptRef.current = playbackHandoffPrompt;
  }, [playbackHandoffPrompt]);

  const buildContext = useCallback(
    (): MobileAuthRequestContext => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  useEffect(() => {
    let isActive = true;

    void getPref(PLAYBACK_HANDOFF_DISMISSED_STATE_PREF_KEY).then((stored) => {
      if (!isActive) {
        return;
      }
      playbackHandoffDismissedStateKeyRef.current = stored;
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setPlaybackReconcileConflicts(readPlaybackReconcileConflicts());
    return subscribePlaybackReconcileConflicts((conflicts) => {
      setPlaybackReconcileConflicts([...conflicts]);
    });
  }, []);

  const setPlaybackPlaying = useCallback((playing: boolean): void => {
    isPlayingRef.current = playing;
    writeIsPlayingLocallyForSync(playing);
    setIsPlaying(playing);
  }, []);

  const resolveAuthenticatedAccountIdText = useCallback(async (): Promise<string | null> => {
    if (statusRef.current !== 'authenticated') {
      return null;
    }
    if (accountIdTextRef.current !== null) {
      return accountIdTextRef.current;
    }
    const snapshot = await accountRepository.getSnapshot();
    const accountIdText = snapshot?.id_text ?? null;
    accountIdTextRef.current = accountIdText;
    return accountIdText;
  }, []);

  const resolvePlaybackStatsTargets = useCallback(
    (target: PlaybackTarget): PlaybackStatsTargets | null => {
      if (statusRef.current !== 'authenticated') {
        return null;
      }
      if (shouldSkipListenStatsForAccount(accountRef.current)) {
        return null;
      }

      const targets = playbackTargetToStatsTargets(target);
      return hasPlaybackStatsTargets(targets) ? targets : null;
    },
    []
  );

  const toStatsReplayPayload = useCallback((targets: PlaybackStatsTargets | null): unknown => {
    if (targets === null) {
      return undefined;
    }
    return {
      stats_targets: {
        channel_id_text: targets.channelIdText ?? undefined,
        clip_id_text: targets.clipIdText ?? undefined,
        item_id_text: targets.itemIdText ?? undefined,
      },
    };
  }, []);

  const trackPlaybackStatsBestEffort = useCallback(
    (targets: PlaybackStatsTargets | null): void => {
      if (targets === null) {
        return;
      }
      statsRepository.trackPlaybackStats(buildContext(), targets);
    },
    [buildContext]
  );

  const writePlaybackEvent = useCallback(
    async (params: {
      completed?: boolean;
      eventKind: PlaybackEventKind;
      forceNetwork?: boolean;
      isPlaying: boolean;
      mediaFileDurationSeconds?: number;
      occurredAt?: number;
      payload?: unknown;
      playbackPositionSeconds?: number;
    }): Promise<boolean> => {
      const occurredAt =
        Number.isFinite(params.occurredAt) &&
        params.occurredAt !== undefined &&
        params.occurredAt > 0
          ? Math.trunc(params.occurredAt)
          : Date.now();
      try {
        if (statusRef.current !== 'authenticated') {
          return false;
        }

        const target = activeTargetRef.current;
        // Add-by-RSS plays from a device-local feed with no channel and no queue behind it, so
        // there is no queue-scoped playback event to write.
        if (target === null || target.kind === 'add-by-rss') {
          return false;
        }

        const resource = nowPlayingResourceFromTarget(target);
        if (resource === null) {
          return false;
        }

        const queueFromList = getQueueForMedium(queuesRef.current, target.channel.medium_id);
        const queueFromActive =
          activeQueueRef.current === null
            ? null
            : getQueueForMedium([activeQueueRef.current], target.channel.medium_id);
        let queue = queueFromList ?? queueFromActive;
        if (queue === null) {
          const loaded = await loadActive(target.channel.medium_id);
          queue = loaded.activeQueue;
        }
        if (queue === null) {
          return false;
        }

        const accountIdText = await resolveAuthenticatedAccountIdText();
        if (accountIdText === null) {
          return false;
        }
        const mediaFileDuration =
          Number.isFinite(params.mediaFileDurationSeconds) &&
          params.mediaFileDurationSeconds !== undefined &&
          params.mediaFileDurationSeconds > 0
            ? params.mediaFileDurationSeconds
            : undefined;
        const rawPosition =
          Number.isFinite(params.playbackPositionSeconds) &&
          params.playbackPositionSeconds !== undefined
            ? Math.max(0, params.playbackPositionSeconds)
            : 0;
        const playbackPosition = clampPlaybackPositionForStorage(rawPosition, mediaFileDuration);

        const outboxEvent: PlaybackOutboxEnqueueEvent = {
          accountIdText,
          completed: params.completed,
          eventKind: params.eventKind,
          isPlaying: params.isPlaying,
          mediaFileDuration,
          occurredAt,
          payload: params.payload,
          playbackPosition,
          queueIdText: queue.id_text,
          resourceIdText: resource.resourceIdText,
          resourceKind: resource.resourceKind,
        };

        const enqueued = await playbackOutboxRepository.enqueue(outboxEvent);
        if (!enqueued) {
          return false;
        }

        lastPlaybackLocalWriteRef.current = occurredAt;
        const shouldPostNetworkNow =
          params.forceNetwork === true ||
          shouldPostNowPlayingImmediately(outboxEvent.eventKind) ||
          occurredAt - lastPlaybackNetworkWriteRef.current >= PLAYBACK_POSITION_NETWORK_INTERVAL_MS;

        if (!shouldPostNetworkNow) {
          return true;
        }

        lastPlaybackNetworkWriteRef.current = occurredAt;
        const claimedQueue = shouldClaimActiveQueueForPlaybackEvent(outboxEvent.eventKind);
        const posted = await playbackOutboxRepository.postNowPlayingEvent(
          buildContext(),
          outboxEvent,
          {
            claimActiveQueue: claimedQueue,
          }
        );
        if (claimedQueue && posted) {
          setActiveQueue({
            ...queue,
            is_active_queue: true,
          });
        }
        return true;
      } catch (error) {
        if (getErrorCode(error) === 'ERR_OFFLINE_MODE') {
          return false;
        }
        if (__DEV__) {
          console.warn('[playback] now-playing write failed', error);
        }
        return false;
      }
    },
    [buildContext, loadActive, resolveAuthenticatedAccountIdText, setActiveQueue]
  );

  const ensureChannel = useCallback(
    async (item: DTOItem): Promise<DTOChannel | null> => {
      if (item.channel) {
        return item.channel;
      }
      try {
        return await playbackContentRepository.getChannelById(buildContext(), item.channel_id);
      } catch {
        return playbackContentRepository.getLocalChannelForItem(item.id_text);
      }
    },
    [buildContext]
  );

  const applyAutoQueueDirective = useCallback(
    (directive: AutoQueueDirective) => {
      if (directive.mode === 'preserve') {
        return;
      }
      setAutoQueueResources({});
      autoQueueResourcesRef.current = {};
      setAutoQueueActiveRow(0);
      autoQueueActiveRowRef.current = 0;
      const nextConfig =
        directive.mode === 'seed-playlist'
          ? {
              ...autoQueueConfigRef.current,
              disabled: false,
              nextPage: 1,
              playlist_id_text: directive.playlistIdText,
            }
          : { ...autoQueueConfigRef.current, nextPage: 1, playlist_id_text: null };
      setAutoQueueConfig(nextConfig);
      autoQueueConfigRef.current = nextConfig;
    },
    [setAutoQueueActiveRow, setAutoQueueConfig, setAutoQueueResources]
  );

  const writeAnonymousSnapshot = useCallback((target: PlaybackTarget, positionValue: number) => {
    const snapshot = anonymousSnapshotFromTarget(
      target,
      positionValue,
      durationRef.current > 0 ? durationRef.current : undefined
    );
    if (snapshot === null) {
      return;
    }
    lastAnonymousSnapshotWriteRef.current = Date.now();
    void writeAnonymousPlaybackSnapshot(snapshot);
  }, []);

  const clearNowPlaying = useCallback(() => {
    nativePlaybackBridge.pause();
    pauseAtRef.current = null;
    activeTargetRef.current = null;
    setActiveTarget(null);
    setNowPlaying(null);
    setPlaybackPlaying(false);
  }, [setPlaybackPlaying]);

  const playTarget = useCallback(
    async (
      target: PlaybackTarget,
      params: {
        url: string;
        summary: PlaybackNowPlaying;
        autoQueue: AutoQueueDirective;
        explicitPlaybackSeconds?: number;
        mediaFileDurationHintSeconds?: number;
        autoPlayOverride?: boolean;
      }
    ): Promise<void> => {
      setNoticeKey(null);
      const decision = await applyLoad(
        {
          explicitPlaybackSeconds: params.explicitPlaybackSeconds,
          mediaFileDurationHintSeconds: params.mediaFileDurationHintSeconds,
          target,
        },
        params.url,
        playbackRateRef.current,
        params.autoPlayOverride
      );
      applyAutoQueueDirective(params.autoQueue);
      pauseAtRef.current = decision.pauseAtSeconds ?? null;
      activeTargetRef.current = target;
      positionRef.current = decision.initialSeekSeconds;
      durationRef.current =
        params.mediaFileDurationHintSeconds !== undefined ? params.mediaFileDurationHintSeconds : 0;
      const shouldAutoPlay = params.autoPlayOverride ?? decision.shouldAutoPlay;
      setActiveTarget(target);
      setNowPlaying(params.summary);
      setPositionSeconds(decision.initialSeekSeconds);
      setDurationSeconds(durationRef.current);
      setPlaybackPlaying(shouldAutoPlay);

      if (shouldAutoPlay) {
        const statsTargets = decision.shouldRecordPlaybackStat
          ? resolvePlaybackStatsTargets(target)
          : null;
        const outboxWritten = await writePlaybackEvent({
          eventKind: playbackEventFromDiscreteSignal('play'),
          forceNetwork: true,
          isPlaying: true,
          mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
          payload: toStatsReplayPayload(statsTargets),
          playbackPositionSeconds: decision.initialSeekSeconds,
        });
        if (outboxWritten) {
          trackPlaybackStatsBestEffort(statsTargets);
        }
      }
      if (statusRef.current === 'anonymous') {
        writeAnonymousSnapshot(target, decision.initialSeekSeconds);
      }
    },
    [
      applyAutoQueueDirective,
      applyLoad,
      resolvePlaybackStatsTargets,
      setPlaybackPlaying,
      toStatsReplayPayload,
      trackPlaybackStatsBestEffort,
      writeAnonymousSnapshot,
      writePlaybackEvent,
    ]
  );

  const startItemPlayback = useCallback(
    async (
      item: DTOItem,
      channel: DTOChannel,
      options: {
        intent: MusicItemPlaybackIntent;
        autoQueue: AutoQueueDirective;
        explicitPlaybackSeconds?: number;
        mediaFileDurationHintSeconds?: number;
        autoPlayOverride?: boolean;
      }
    ): Promise<void> => {
      if (item.live_item !== null && item.live_item !== undefined) {
        // Livestream playback is unavailable in the native engine; surface a localized notice.
        setNoticeKey('media_player.livestream_unavailable');
        return;
      }
      const url = await resolvePlaybackUrl(item);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildItemPlaybackTarget(item, channel, options.intent);
      await playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: options.mediaFileDurationHintSeconds,
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget]
  );

  const startClipPlayback = useCallback(
    async (
      clip: DTOClip,
      item: DTOItem,
      channel: DTOChannel,
      options: {
        autoQueue: AutoQueueDirective;
        explicitPlaybackSeconds?: number;
        mediaFileDurationHintSeconds?: number;
        autoPlayOverride?: boolean;
      }
    ): Promise<void> => {
      const url = await resolvePlaybackUrl(item);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildClipPlaybackTarget(clip, item, channel);
      await playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: options.mediaFileDurationHintSeconds,
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget]
  );

  const startSoundbitePlayback = useCallback(
    async (
      soundbite: DTOItemSoundbite,
      item: DTOItem,
      channel: DTOChannel,
      options: {
        autoQueue: AutoQueueDirective;
        explicitPlaybackSeconds?: number;
        mediaFileDurationHintSeconds?: number;
        autoPlayOverride?: boolean;
      }
    ): Promise<void> => {
      const url = await resolvePlaybackUrl(item);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildSoundbitePlaybackTarget(soundbite, item, channel);
      await playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: options.mediaFileDurationHintSeconds,
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget]
  );

  const playItem = useCallback(
    async (
      item: DTOItem,
      channel: DTOChannel,
      options?: { intent?: MusicItemPlaybackIntent }
    ): Promise<void> => {
      await startItemPlayback(item, channel, {
        autoQueue: { mode: 'clear' },
        intent: options?.intent ?? 'explicit_play',
      });
    },
    [startItemPlayback]
  );

  const playClip = useCallback(
    async (clip: DTOClip, item: DTOItem, channel: DTOChannel): Promise<void> => {
      await startClipPlayback(clip, item, channel, { autoQueue: { mode: 'clear' } });
    },
    [startClipPlayback]
  );

  const playSoundbite = useCallback(
    async (soundbite: DTOItemSoundbite, item: DTOItem, channel: DTOChannel): Promise<void> => {
      await startSoundbitePlayback(soundbite, item, channel, { autoQueue: { mode: 'clear' } });
    },
    [startSoundbitePlayback]
  );

  const playChapter = useCallback(
    async (chapter: DTOItemChapter, item: DTOItem, channel: DTOChannel): Promise<void> => {
      const url = await resolvePlaybackUrl(item);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildChapterPlaybackTarget(chapter, item, channel);
      await playTarget(target, {
        autoQueue: { mode: 'clear' },
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget]
  );

  const playItemByIdWithIntent = useCallback(
    async (
      idText: string,
      intent: MusicItemPlaybackIntent,
      autoQueue: AutoQueueDirective
    ): Promise<void> => {
      try {
        const item = await playbackContentRepository.getItemByIdText(buildContext(), idText);
        const channel = await ensureChannel(item);
        if (channel === null) {
          setNoticeKey('media_player.no_media');
          return;
        }
        await startItemPlayback(item, channel, { autoQueue, intent });
      } catch {
        setNoticeKey('media_player.no_media');
      }
    },
    [buildContext, ensureChannel, startItemPlayback]
  );

  const playClipByIdWithDirective = useCallback(
    async (idText: string, autoQueue: AutoQueueDirective): Promise<void> => {
      try {
        const clip = await playbackContentRepository.getClipByIdText(buildContext(), idText);
        const item = clip.item;
        const channel = await ensureChannel(item);
        if (channel === null) {
          setNoticeKey('media_player.no_media');
          return;
        }
        await startClipPlayback(clip, item, channel, { autoQueue });
      } catch {
        setNoticeKey('media_player.no_media');
      }
    },
    [buildContext, ensureChannel, startClipPlayback]
  );

  const playItemById = useCallback(
    (idText: string): Promise<void> =>
      playItemByIdWithIntent(idText, 'explicit_play', { mode: 'clear' }),
    [playItemByIdWithIntent]
  );

  const playClipById = useCallback(
    (idText: string): Promise<void> => playClipByIdWithDirective(idText, { mode: 'clear' }),
    [playClipByIdWithDirective]
  );

  const playPlaylistRowById = useCallback(
    (idText: string, kind: 'item' | 'clip', playlistIdText: string): Promise<void> => {
      const directive: AutoQueueDirective = { mode: 'seed-playlist', playlistIdText };
      return kind === 'clip'
        ? playClipByIdWithDirective(idText, directive)
        : playItemByIdWithIntent(idText, 'explicit_play', directive);
    },
    [playClipByIdWithDirective, playItemByIdWithIntent]
  );

  const playQueueResource = useCallback(
    async (
      resource: DTOQueueResource,
      intent: MusicItemPlaybackIntent,
      options?: { explicitPlaybackSeconds?: number; autoPlayOverride?: boolean }
    ): Promise<void> => {
      const preserve: AutoQueueDirective = { mode: 'preserve' };
      if (resource.clip) {
        const item = resource.clip.item;
        const channel = await ensureChannel(item);
        if (channel === null) {
          return;
        }
        await startClipPlayback(resource.clip, item, channel, {
          autoPlayOverride: options?.autoPlayOverride,
          autoQueue: preserve,
          explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        });
        return;
      }
      if (resource.item_soundbite && resource.item_soundbite.item) {
        const item = resource.item_soundbite.item;
        const channel = await ensureChannel(item);
        if (channel === null) {
          return;
        }
        await startSoundbitePlayback(resource.item_soundbite, item, channel, {
          autoPlayOverride: options?.autoPlayOverride,
          autoQueue: preserve,
          explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        });
        return;
      }
      const channel = await ensureChannel(resource.item);
      if (channel === null) {
        return;
      }
      await startItemPlayback(resource.item, channel, {
        autoPlayOverride: options?.autoPlayOverride,
        autoQueue: preserve,
        explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        intent,
      });
    },
    [ensureChannel, startClipPlayback, startItemPlayback, startSoundbitePlayback]
  );

  const rememberPlaybackHandoffDismissal = useCallback((dismissedStateKey: string | null): void => {
    if (dismissedStateKey === null) {
      return;
    }
    playbackHandoffDismissedStateKeyRef.current = dismissedStateKey;
    void setPref(PLAYBACK_HANDOFF_DISMISSED_STATE_PREF_KEY, dismissedStateKey);
  }, []);

  const resolveConflictStateTitle = useCallback(
    async (
      state: Pick<
        PlaybackReconcileDifferentNowPlayingConflict['local'],
        'resourceIdText' | 'resourceKind'
      >
    ): Promise<string> => {
      const activeTarget = activeTargetRef.current;
      const activeResource =
        activeTarget === null ? null : nowPlayingResourceFromTarget(activeTarget);
      if (
        activeResource !== null &&
        activeResource.resourceKind === state.resourceKind &&
        activeResource.resourceIdText === state.resourceIdText &&
        typeof nowPlayingRef.current?.title === 'string' &&
        nowPlayingRef.current.title.length > 0
      ) {
        return nowPlayingRef.current.title;
      }

      try {
        const context = buildContext();
        if (state.resourceKind === 'item') {
          const item = await playbackContentRepository.getItemByIdText(
            context,
            state.resourceIdText
          );
          return item.title && item.title.length > 0 ? item.title : item.id_text;
        }
        if (state.resourceKind === 'clip') {
          const clip = await playbackContentRepository.getClipByIdText(
            context,
            state.resourceIdText
          );
          const title = clip.item?.title;
          return title && title.length > 0 ? title : clip.id_text;
        }
        if (state.resourceKind === 'soundbite') {
          const soundbite = await playbackContentRepository.getSoundbiteByIdText(
            context,
            state.resourceIdText
          );
          const title = soundbite.item?.title;
          return title && title.length > 0 ? title : soundbite.id_text;
        }
      } catch {
        // Best-effort title hydration for prompt copy.
      }

      return state.resourceIdText;
    },
    [buildContext]
  );

  useEffect(() => {
    if (playbackHandoffPrompt !== null || playbackReconcileConflicts.length === 0) {
      return;
    }

    let cancelled = false;
    const activeQueueIdText = activeQueueRef.current?.id_text ?? null;
    const orderedConflicts =
      activeQueueIdText === null
        ? [...playbackReconcileConflicts]
        : [
            ...playbackReconcileConflicts.filter(
              (conflict) => conflict.queueIdText === activeQueueIdText
            ),
            ...playbackReconcileConflicts.filter(
              (conflict) => conflict.queueIdText !== activeQueueIdText
            ),
          ];

    void (async () => {
      const context = buildContext();
      for (const conflict of orderedConflicts) {
        if (
          !shouldPromptForPlaybackHandoffConflict({
            conflict,
            dismissedStateKey: playbackHandoffDismissedStateKeyRef.current,
            isPlayingLocally: isPlayingRef.current,
          })
        ) {
          continue;
        }

        const remoteResource = await queueRepository.getNowPlaying(context, conflict.queueIdText, {
          skipCache: true,
        });
        if (cancelled || remoteResource === null) {
          continue;
        }

        const remoteRef = resolveQueueResourceRef(remoteResource);
        if (
          remoteRef === null ||
          remoteRef.resourceKind !== conflict.remote.resourceKind ||
          remoteRef.resourceIdText !== conflict.remote.resourceIdText
        ) {
          continue;
        }

        const localTitlePromise = resolveConflictStateTitle(conflict.local);
        const serverTitle = queueResourceTitle(remoteResource);
        const resolvedServerTitle =
          serverTitle !== null ? serverTitle : await resolveConflictStateTitle(conflict.remote);
        const localTitle = await localTitlePromise;

        if (cancelled) {
          return;
        }

        setPlaybackHandoffPrompt({
          conflict,
          dismissedStateKey: buildPlaybackHandoffDismissedStateKey(conflict.remote),
          localTitle,
          remoteResource,
          serverTitle: resolvedServerTitle,
        });
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildContext, playbackHandoffPrompt, playbackReconcileConflicts, resolveConflictStateTitle]);

  const handlePlaybackHandoffContinue = useCallback(() => {
    const prompt = playbackHandoffPromptRef.current;
    if (prompt === null) {
      return;
    }

    setPlaybackHandoffPrompt(null);
    rememberPlaybackHandoffDismissal(prompt.dismissedStateKey);
    void writePlaybackEvent({
      eventKind: playbackEventFromDiscreteSignal('play'),
      forceNetwork: true,
      isPlaying: isPlayingRef.current,
      mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
      playbackPositionSeconds: positionRef.current,
    });
  }, [rememberPlaybackHandoffDismissal, writePlaybackEvent]);

  const handlePlaybackHandoffSwitch = useCallback(() => {
    const prompt = playbackHandoffPromptRef.current;
    if (prompt === null) {
      return;
    }

    setPlaybackHandoffPrompt(null);
    if (isPlayingRef.current) {
      return;
    }

    void playQueueResource(prompt.remoteResource, 'explicit_play', {
      autoPlayOverride: true,
      explicitPlaybackSeconds: normalizePlaybackPosition(prompt.remoteResource.playback_position),
    });
  }, [playQueueResource]);

  const playAutoQueueRow = useCallback(
    async (row: AutoQueueResourcesMapRow): Promise<void> => {
      const preserve: AutoQueueDirective = { mode: 'preserve' };
      if (row.clip) {
        const item = row.clip.item;
        const channel = row.channel ?? (await ensureChannel(item));
        if (channel === null) {
          return;
        }
        await startClipPlayback(row.clip, item, channel, { autoQueue: preserve });
        return;
      }
      if (row.item_soundbite && row.item_soundbite.item) {
        const item = row.item_soundbite.item;
        const channel = row.channel ?? (await ensureChannel(item));
        if (channel === null) {
          return;
        }
        await startSoundbitePlayback(row.item_soundbite, item, channel, { autoQueue: preserve });
        return;
      }
      // Item rows carry the slim `DTOItemQueueItem`; fetch the full item for enclosures.
      await playItemByIdWithIntent(row.item.id_text, 'fresh_transition', preserve);
    },
    [ensureChannel, playItemByIdWithIntent, startClipPlayback, startSoundbitePlayback]
  );

  const currentAutoQueueSeed = useCallback((): AutoQueueSeed | null => {
    const target = activeTargetRef.current;
    if (target === null || target.kind === 'add-by-rss' || target.kind === 'livestream') {
      return null;
    }
    return {
      channel: target.channel,
      clip: target.kind === 'clip' ? target.clip : null,
      item: target.item,
      item_soundbite: target.kind === 'soundbite' ? target.soundbite : null,
    };
  }, []);

  const computeHasAutoQueueNext = useCallback((): boolean => {
    const nextRow = autoQueueIncrementActiveRow(autoQueueActiveRowRef.current);
    if (autoQueueResourcesRef.current[nextRow] !== undefined) {
      return true;
    }
    const config = autoQueueConfigRef.current;
    if (config.disabled) {
      return false;
    }
    if (config.playlist_id_text !== null) {
      return true;
    }
    return currentAutoQueueSeed() !== null;
  }, [currentAutoQueueSeed]);

  const advanceAutoQueue = useCallback(async (): Promise<void> => {
    const nextRow = autoQueueIncrementActiveRow(autoQueueActiveRowRef.current);
    let row = autoQueueResourcesRef.current[nextRow];
    if (row === undefined) {
      const seed = currentAutoQueueSeed();
      if (seed !== null) {
        // Use the returned map immediately — setState alone leaves this ref stale until useEffect.
        const loaded = await loadAutoQueueResources(seed);
        autoQueueResourcesRef.current = loaded;
        row = loaded[nextRow];
      }
    }
    if (row === undefined) {
      clearNowPlaying();
      return;
    }
    setAutoQueueActiveRow(nextRow);
    autoQueueActiveRowRef.current = nextRow;
    await playAutoQueueRow(row);
  }, [
    clearNowPlaying,
    currentAutoQueueSeed,
    loadAutoQueueResources,
    playAutoQueueRow,
    setAutoQueueActiveRow,
  ]);

  const advance = useCallback(
    async (transitionKind: 'complete' | 'skip'): Promise<void> => {
      // Only advance when this provider owns the current playback. Add-by-RSS uses its own hook and
      // never sets `activeTarget`; ignoring null avoids hijacking the queue on its `ended` event.
      if (activeTargetRef.current === null) {
        return;
      }
      if (advancingRef.current) {
        return;
      }
      advancingRef.current = true;
      try {
        const target = activeTargetRef.current;
        const eventKind = playbackEventFromDiscreteSignal(transitionKind);
        const completed = transitionKind === 'complete';
        await writePlaybackEvent({
          completed,
          eventKind,
          forceNetwork: true,
          isPlaying: false,
          mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
          playbackPositionSeconds: positionRef.current,
        });
        const historyTarget =
          target !== null ? playbackTargetToHistoryTarget(target, positionRef.current) : null;
        if (historyTarget !== null) {
          try {
            await moveNowPlayingToHistory({ ...historyTarget, completed });
          } catch (error) {
            if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
              throw error;
            }
          }
        }

        let activeResource: DTOQueueResource | null = null;
        let upcomingManualCount = 0;
        try {
          const result = await loadActive(activeQueueRef.current?.medium_id);
          activeResource = result.activeResource;
          upcomingManualCount =
            result.activeResource !== null ? result.upcomingResources.length : 0;
        } catch (error) {
          if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
            throw error;
          }
        }
        const hasAutoQueueNext = computeHasAutoQueueNext();
        const decision = resolveQueueAdvance({ hasAutoQueueNext, upcomingManualCount });

        if (decision.kind === 'play-next-manual' && activeResource !== null) {
          try {
            await playQueueResource(activeResource, 'fresh_transition');
          } catch (error) {
            if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
              throw error;
            }
            clearNowPlaying();
          }
        } else if (decision.kind === 'advance-auto-queue') {
          try {
            await advanceAutoQueue();
          } catch (error) {
            if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
              throw error;
            }
            clearNowPlaying();
          }
        } else {
          clearNowPlaying();
        }
      } finally {
        advancingRef.current = false;
      }
    },
    [
      advanceAutoQueue,
      clearNowPlaying,
      computeHasAutoQueueNext,
      loadActive,
      moveNowPlayingToHistory,
      playQueueResource,
      writePlaybackEvent,
    ]
  );

  // Anonymous playback restore + login snapshot lifecycle (web parity with
  // AnonymousPlaybackRestoreController): logged-in users clear the snapshot (server queue is
  // authoritative — no blind server-queue wipe); anonymous users restore the last now-playing once,
  // loaded paused so cold start never blasts audio.
  const restoreFromSnapshot = useCallback(
    async (snapshot: AnonymousPlaybackSnapshot): Promise<void> => {
      const context = buildContext();
      try {
        if (snapshot.kind === 'clip') {
          const clip = await playbackContentRepository.getClipByIdText(context, snapshot.id_text);
          const item = clip.item;
          const channel = await ensureChannel(item);
          if (channel === null || statusRef.current !== 'anonymous') {
            return;
          }
          await startClipPlayback(clip, item, channel, {
            autoPlayOverride: false,
            autoQueue: { mode: 'clear' },
            explicitPlaybackSeconds: snapshot.playback_position_seconds,
            mediaFileDurationHintSeconds: snapshot.media_file_duration_seconds,
          });
          return;
        }
        if (snapshot.kind === 'item_soundbite') {
          const soundbite = await playbackContentRepository.getSoundbiteByIdText(
            context,
            snapshot.id_text
          );
          const item = soundbite.item;
          if (item === null || item === undefined) {
            return;
          }
          const channel = await ensureChannel(item);
          if (channel === null || statusRef.current !== 'anonymous') {
            return;
          }
          await startSoundbitePlayback(soundbite, item, channel, {
            autoPlayOverride: false,
            autoQueue: { mode: 'clear' },
            explicitPlaybackSeconds: snapshot.playback_position_seconds,
            mediaFileDurationHintSeconds: snapshot.media_file_duration_seconds,
          });
          return;
        }
        const item = await playbackContentRepository.getItemByIdText(context, snapshot.id_text);
        const channel = await ensureChannel(item);
        if (channel === null || statusRef.current !== 'anonymous') {
          return;
        }
        await startItemPlayback(item, channel, {
          autoPlayOverride: false,
          autoQueue: { mode: 'clear' },
          explicitPlaybackSeconds: snapshot.playback_position_seconds,
          intent: 'session_restore',
          mediaFileDurationHintSeconds: snapshot.media_file_duration_seconds,
        });
      } catch {
        // Best-effort restore; ignore fetch/network failures.
      }
    },
    [buildContext, ensureChannel, startClipPlayback, startItemPlayback, startSoundbitePlayback]
  );

  useEffect(() => {
    if (status === 'authenticated') {
      void clearAnonymousPlaybackSnapshot();
      return;
    }
    if (status !== 'anonymous' || anonymousPlaybackRestoreStarted) {
      return;
    }
    anonymousPlaybackRestoreStarted = true;
    void (async () => {
      const snapshot = await readAnonymousPlaybackSnapshot();
      if (snapshot === null || statusRef.current !== 'anonymous') {
        return;
      }
      await restoreFromSnapshot(snapshot);
    })();
  }, [restoreFromSnapshot, status]);

  useNativePlaybackBridge({
    ended: () => {
      void advance('complete');
    },
    error: () => {
      setPlaybackPlaying(false);
    },
    playbackState: (event) => {
      if (event.state === 'playing') {
        setPlaybackPlaying(true);
      } else if (event.state === 'paused' || event.state === 'ended' || event.state === 'error') {
        setPlaybackPlaying(false);
      }
    },
    progress: (event) => {
      positionRef.current = event.positionSeconds;
      setPositionSeconds(event.positionSeconds);
      if (event.durationSeconds > 0) {
        durationRef.current = event.durationSeconds;
        setDurationSeconds(event.durationSeconds);
      }
      const pauseAt = pauseAtRef.current;
      if (pauseAt !== null && event.positionSeconds >= pauseAt) {
        pauseAtRef.current = null;
        void writePlaybackEvent({
          eventKind: playbackEventFromDiscreteSignal('sleep_timer_stop'),
          forceNetwork: true,
          isPlaying: true,
          mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
          playbackPositionSeconds: event.positionSeconds,
        });
        nativePlaybackBridge.pause();
        setPlaybackPlaying(false);
      }

      const progressEventKind = playbackEventFromProgressSample({
        isPlaying: isPlayingRef.current,
      });
      const localWriteDue =
        Date.now() - lastPlaybackLocalWriteRef.current >= PLAYBACK_POSITION_LOCAL_INTERVAL_MS;
      if (progressEventKind !== null && localWriteDue) {
        void writePlaybackEvent({
          eventKind: progressEventKind,
          isPlaying: true,
          mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
          playbackPositionSeconds: event.positionSeconds,
        });
      }

      // Throttled anonymous snapshot so a restart resumes near the last position.
      const target = activeTargetRef.current;
      if (
        target !== null &&
        statusRef.current === 'anonymous' &&
        Date.now() - lastAnonymousSnapshotWriteRef.current >= ANONYMOUS_SNAPSHOT_THROTTLE_MS
      ) {
        writeAnonymousSnapshot(target, event.positionSeconds);
      }
    },
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = nextState;
      if (!wasActive || nextState === 'active') {
        return;
      }

      const eventKind = playbackEventFromBackgroundTransition({
        isPlaying: isPlayingRef.current,
      });
      if (eventKind === null) {
        return;
      }

      void writePlaybackEvent({
        eventKind,
        forceNetwork: true,
        isPlaying: true,
        mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
        playbackPositionSeconds: positionRef.current,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [writePlaybackEvent]);

  // Drive the video surface's JS-desired visibility from the playback target kind: only
  // full video items request the surface; clips/soundbites/chapters and audio podcasts keep it
  // hidden. The native host additionally gates on real video frames, so a video-medium item playing
  // an audio enclosure never leaves a black rectangle. No `load`/`destroy` — playhead is untouched.
  useEffect(() => {
    nativePlaybackBridge.setVideoSurfaceVisible(activeTarget?.kind === 'item-video');
  }, [activeTarget]);

  const pause = useCallback(() => {
    nativePlaybackBridge.pause();
    setPlaybackPlaying(false);
    void writePlaybackEvent({
      eventKind: playbackEventFromDiscreteSignal('pause'),
      forceNetwork: true,
      isPlaying: false,
      mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
      playbackPositionSeconds: positionRef.current,
    });
  }, [setPlaybackPlaying, writePlaybackEvent]);

  const resume = useCallback(async () => {
    await nativePlaybackBridge.play();
    setPlaybackPlaying(true);

    const target = activeTargetRef.current;
    const statsTargets = target !== null ? resolvePlaybackStatsTargets(target) : null;
    const outboxWritten = await writePlaybackEvent({
      eventKind: playbackEventFromDiscreteSignal('play'),
      forceNetwork: true,
      isPlaying: true,
      mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
      payload: toStatsReplayPayload(statsTargets),
      playbackPositionSeconds: positionRef.current,
    });
    if (outboxWritten) {
      trackPlaybackStatsBestEffort(statsTargets);
    }
  }, [
    resolvePlaybackStatsTargets,
    setPlaybackPlaying,
    toStatsReplayPayload,
    trackPlaybackStatsBestEffort,
    writePlaybackEvent,
  ]);

  const seekTo = useCallback(
    (seconds: number) => {
      nativePlaybackBridge.seek(seconds);
      positionRef.current = seconds;
      setPositionSeconds(seconds);
      void writePlaybackEvent({
        eventKind: playbackEventFromDiscreteSignal('seek'),
        forceNetwork: true,
        isPlaying: isPlayingRef.current,
        mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
        playbackPositionSeconds: seconds,
      });
    },
    [writePlaybackEvent]
  );

  const setRate = useCallback((rate: number) => {
    playbackRateRef.current = rate;
    setPlaybackRate(rate);
    nativePlaybackBridge.setRate(rate);
  }, []);

  const skipToNext = useCallback(() => advance('skip'), [advance]);
  const completeNowPlaying = useCallback(() => advance('complete'), [advance]);

  const sessionValue = useMemo<PlaybackSessionContextValue>(
    () => ({
      activeTarget,
      isPlaying,
      noticeKey,
      nowPlaying,
      pause,
      playChapter,
      playClip,
      playClipById,
      playItem,
      playItemById,
      playPlaylistRowById,
      playSoundbite,
      playbackRate,
      resume,
      completeNowPlaying,
      seekTo,
      setRate,
      skipToNext,
    }),
    [
      activeTarget,
      completeNowPlaying,
      isPlaying,
      noticeKey,
      nowPlaying,
      pause,
      playChapter,
      playClip,
      playClipById,
      playItem,
      playItemById,
      playPlaylistRowById,
      playSoundbite,
      playbackRate,
      resume,
      seekTo,
      setRate,
      skipToNext,
    ]
  );

  const progressValue = useMemo<PlaybackProgressContextValue>(
    () => ({
      durationSeconds,
      positionSeconds,
    }),
    [durationSeconds, positionSeconds]
  );

  return (
    <PlaybackSessionContext.Provider value={sessionValue}>
      <PlaybackProgressContext.Provider value={progressValue}>
        {children}
        <ConfirmDialog
          body={t('media_player.handoff.body', {
            localTitle: playbackHandoffPrompt?.localTitle ?? '',
            serverTitle: playbackHandoffPrompt?.serverTitle ?? '',
          })}
          cancelLabel={t('media_player.handoff.continue_action')}
          cancelTestID="playback-handoff-continue"
          confirmLabel={t('media_player.handoff.switch_action')}
          confirmTestID="playback-handoff-switch"
          onCancel={handlePlaybackHandoffContinue}
          onConfirm={handlePlaybackHandoffSwitch}
          testID="playback-handoff-dialog"
          title={t('media_player.handoff.title')}
          visible={playbackHandoffPrompt !== null}
        />
      </PlaybackProgressContext.Provider>
    </PlaybackSessionContext.Provider>
  );
}

export function usePlaybackSession(): PlaybackSessionContextValue {
  const context = useContext(PlaybackSessionContext);
  if (context === undefined) {
    throw new Error('usePlaybackSession must be used within a PlaybackProvider');
  }
  return context;
}

export function usePlaybackProgress(): PlaybackProgressContextValue {
  const context = useContext(PlaybackProgressContext);
  if (context === undefined) {
    throw new Error('usePlaybackProgress must be used within a PlaybackProvider');
  }
  return context;
}

/** Full playback API (session + playhead). Prefer the split hooks in list rows. */
export function usePlayback(): PlaybackContextValue {
  const session = usePlaybackSession();
  const progress = usePlaybackProgress();
  return { ...session, ...progress };
}

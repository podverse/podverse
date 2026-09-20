import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import type { AddByRSSResourceData } from '@podverse/helpers';
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
import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';
import type { PlaybackEventKind } from '@podverse/helpers/playbackEvents';
import {
  PLAYBACK_POSITION_LOCAL_INTERVAL_MS,
  PLAYBACK_POSITION_NETWORK_INTERVAL_MS,
} from '@podverse/helpers/playbackOutboxLimits';
import { getQueueForMedium } from '@podverse/helpers/queue';
import {
  reconstructAddByRSSItemFromResourceData,
  reconstructAddByRSSLivestreamFromResourceData,
} from '@podverse/parser-mapping';
import type {
  MusicItemPlaybackIntent,
  PlaybackLoadDecision,
  PlaybackTarget,
} from '@podverse/playback-core';
import {
  buildEnclosureSwitchPlaybackDecisionIfChanged,
  resolveResumeAtSecondsForEnclosureSwitch,
} from '@podverse/playback-core';
import { clampPlaybackPositionForStorage } from '@podverse/playback-core/clampNearEndSeconds';
import { resolveQueueAdvance } from '@podverse/playback-core/resolveQueueAdvance';

import type { PlaybackErrorEvent } from '../../modules/podverse-media-engine';

import { useAuth } from '../auth/AuthProvider';
import { nativePlaybackBridge } from '../bridge/nativePlaybackBridge';
import { useNativePlaybackBridge } from '../bridge/useNativePlaybackBridge';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { playbackErrorFromLoadFailure } from '../feedback/actionErrorCopy';
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
import type {
  PlaybackReconcileDifferentNowPlayingConflict,
  PlaybackReconcileResourceState,
} from '../data/repositories/playbackReconcile';
import type { AutoQueueSeed } from '../hooks/useAutoQueueLoadResources';
import { useAutoQueueLoadResources } from '../hooks/useAutoQueueLoadResources';
import { useQueueMutations } from '../hooks/useQueueMutations';
import { useQueueResourcesLoadActive } from '../hooks/useQueueResourcesLoadActive';
import type { AutoQueueResourcesMapRow } from '../lib/autoQueue/autoQueue';
import { autoQueueIncrementActiveRow } from '../lib/autoQueue/autoQueue';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';
import {
  buildChapterPlaybackTarget,
  buildClipPlaybackTarget,
  buildItemPlaybackTarget,
  buildSoundbitePlaybackTarget,
  playbackTargetToHistoryTarget,
  playbackTargetToStatsTargets,
} from '../lib/playback/buildPlaybackTarget';
import type { LastPlaybackSnapshot } from '../lib/playback/lastPlaybackStorage';
import {
  clearLastPlaybackSnapshot,
  lastPlaybackSnapshotFromTarget,
  readLastPlaybackSnapshot,
  writeLastPlaybackSnapshot,
} from '../lib/playback/lastPlaybackStorage';
import { resolveMediaFileDurationHintSeconds } from '../lib/playback/mediaFileDurationHint';
import {
  buildItemLabeledEnclosures,
  DEFAULT_ENCLOSURE_SELECTED_PARAMS,
  resolveItemEnclosureUrl,
  resolveSelectedItemEnclosureMediaType,
  resolveSessionEnclosureSelectedParams,
} from '../lib/playback/resolveEnclosureUrl';
import { resolvePlaybackUrl } from '../lib/playback/resolvePlaybackUrl';
import { shouldSkipListenStatsForAccount } from '../popularityTracking/popularityTrackingGate';
import { readPlaybackMediaTypePref } from '../prefs/preferredMediaType';
import { getPref, setPref } from '../prefs/prefsStore';
import {
  readPlaybackPositionAdoptions,
  subscribePlaybackPositionAdoptions,
} from '../sync/playbackPositionAdoption';
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
import {
  getPlaybackPositionClockSeconds,
  getPlaybackProgressRatio,
  getPlaybackProgressSnapshot,
  resetPlaybackProgress,
  setPlaybackDurationSeconds,
  setPlaybackPositionSeconds,
  setPlaybackProgress,
  setPlaybackProgressPlaying,
  setPlaybackProgressRate,
  subscribePlaybackPositionClock,
  subscribePlaybackProgress,
} from './playbackProgressStore';
import { writeIsPlayingLocallyForSync } from './playbackSyncState';
import type { PlaybackTransportState } from './playbackTransport';
import { isEnginePlayableState, playbackTransportForEngineState } from './playbackTransport';
import {
  chaptersForTrackButtons,
  resolveJumpTarget,
  resolveNextAction,
  resolvePreviousAction,
} from './previousAction';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';
import { resolveNowPlayingChapters } from './useNowPlayingChapters';

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

const LAST_PLAYBACK_SNAPSHOT_THROTTLE_MS = 5000;
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

const parseSeconds = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isAddByRssResourceData = (value: unknown): value is AddByRSSResourceData => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hasAddByRssLivestreamStartTime = (resourceData: AddByRSSResourceData): boolean => {
  const startTime = resourceData.start_time;
  return (
    (typeof startTime === 'string' && startTime.length > 0) ||
    typeof startTime === 'number' ||
    startTime instanceof Date
  );
};

const extractAddByRssArtworkUrl = (images: unknown): string | null => {
  if (!Array.isArray(images)) {
    return null;
  }

  for (const entry of images) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'url' in entry &&
      typeof entry['url'] === 'string' &&
      entry['url'].trim().length > 0
    ) {
      return entry['url'].trim();
    }
  }

  return null;
};

const summaryFromAddByRssResourceData = (
  resourceData: AddByRSSResourceData
): PlaybackNowPlaying => {
  const title =
    typeof resourceData.title === 'string' && resourceData.title.length > 0
      ? resourceData.title
      : '';
  const channelTitle =
    typeof resourceData.channel_title === 'string' && resourceData.channel_title.length > 0
      ? resourceData.channel_title
      : null;
  const imageUrl =
    extractAddByRssArtworkUrl(resourceData.item_images) ??
    extractAddByRssArtworkUrl(resourceData.channel_images);

  return {
    channelTitle,
    imageUrl,
    title,
    viewerImageUrl: imageUrl,
  };
};

const resolveAddByRssPlaybackUrl = (resourceData: AddByRSSResourceData): string | null => {
  if (hasAddByRssLivestreamStartTime(resourceData)) {
    const reconstructedLivestream = reconstructAddByRSSLivestreamFromResourceData(resourceData);
    const liveUrl = reconstructedLivestream?.item?.enclosure?.url;
    if (typeof liveUrl === 'string' && liveUrl.trim().length > 0) {
      return resolveE2eMediaUrl(liveUrl.trim());
    }
  }

  const reconstructedItem = reconstructAddByRSSItemFromResourceData(resourceData);
  const itemUrl = reconstructedItem?.bundle?.enclosures?.[0]?.item_enclosure_sources?.[0]?.uri;
  if (typeof itemUrl === 'string' && itemUrl.trim().length > 0) {
    return resolveE2eMediaUrl(itemUrl.trim());
  }

  return null;
};

const nonNegative = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, value);
};

const upperBoundFromDuration = (value: number): number | null => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
};

const itemFromTarget = (target: PlaybackTarget): DTOItem | null => {
  switch (target.kind) {
    case 'clip':
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return target.item;
    case 'add-by-rss':
      return null;
    case 'livestream':
      return target.item;
  }
};

const itemIdFromTarget = (target: PlaybackTarget | null): string | null => {
  if (target === null || target.kind === 'add-by-rss') {
    return null;
  }
  return target.item?.id_text ?? null;
};

const seekBoundsFromTarget = (
  target: PlaybackTarget,
  durationSeconds: number,
  positionSeconds: number
): { lowerBoundSeconds: number; upperBoundSeconds: number | null } => {
  const durationBound = upperBoundFromDuration(durationSeconds);

  if (target.kind === 'clip') {
    const lowerBoundSeconds = nonNegative(parseSeconds(target.clip.start_time) ?? 0);
    const clipEnd = parseSeconds(target.clip.end_time ?? null);
    const upperBoundSeconds =
      clipEnd !== null ? Math.max(lowerBoundSeconds, nonNegative(clipEnd)) : durationBound;
    return { lowerBoundSeconds, upperBoundSeconds };
  }

  if (target.kind === 'soundbite') {
    const lowerBoundSeconds = nonNegative(parseSeconds(target.soundbite.start_time) ?? 0);
    const soundbiteDuration = parseSeconds(target.soundbite.duration);
    const upperBoundSeconds =
      soundbiteDuration !== null && soundbiteDuration > 0
        ? lowerBoundSeconds + soundbiteDuration
        : durationBound;
    return { lowerBoundSeconds, upperBoundSeconds };
  }

  if (target.kind === 'chapter') {
    const lowerBoundSeconds = nonNegative(parseSeconds(target.chapter.start_time) ?? 0);
    const chapterEnd = parseSeconds(target.chapter.end_time ?? null);
    const upperBoundSeconds =
      chapterEnd !== null ? Math.max(lowerBoundSeconds, nonNegative(chapterEnd)) : durationBound;
    return { lowerBoundSeconds, upperBoundSeconds };
  }

  if (target.kind === 'livestream') {
    const liveEdge = nonNegative(positionSeconds);
    return { lowerBoundSeconds: 0, upperBoundSeconds: liveEdge };
  }

  return {
    lowerBoundSeconds: 0,
    upperBoundSeconds: durationBound,
  };
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
  /**
   * Mini / full player transport glyph. List rows stay play/pause via `isPlaying` only.
   */
  transportState: PlaybackTransportState;
  /** Last engine or load failure. `null` once a later load succeeds. */
  lastPlaybackError: PlaybackErrorEvent | null;
  positionSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  /** Playback notice key (e.g. missing enclosure, unavailable livestream). */
  noticeKey: string | null;
  enclosureSelectedParams: EnclosureSelectedParams;
  itemLabeledEnclosures: LabeledItemEnclosure[];
  switchEnclosureSelectedParams: (params: EnclosureSelectedParams) => Promise<void>;
  playItem: (
    item: DTOItem,
    channel: DTOChannel,
    options?: { intent?: MusicItemPlaybackIntent }
  ) => Promise<void>;
  playClip: (clip: DTOClip, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playSoundbite: (soundbite: DTOItemSoundbite, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playChapter: (chapter: DTOItemChapter, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playAddByRssResourceData: (
    resourceData: AddByRSSResourceData,
    options?: { explicitPlaybackSeconds?: number }
  ) => Promise<void>;
  playItemById: (idText: string) => Promise<void>;
  playClipById: (idText: string) => Promise<void>;
  playQueueResourceFromQueue: (resource: DTOQueueResource) => Promise<void>;
  /** Play a playlist row and seed the auto-queue source to that playlist (web list-row parity). */
  playPlaylistRowById: (
    idText: string,
    kind: 'item' | 'clip',
    playlistIdText: string
  ) => Promise<void>;
  beginAuthoringHold: () => void;
  endAuthoringHold: () => void;
  clearPauseBoundary: () => void;
  previewWindow: (params: { fromSeconds: number; pauseAtSeconds?: number | null }) => Promise<void>;
  loadItemPausedAt: (item: DTOItem, channel: DTOChannel, seconds: number) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  /** Reload the current source after an engine error. */
  retryPlayback: () => Promise<void>;
  seekTo: (seconds: number) => void;
  jumpBy: (deltaSeconds: number) => void;
  /** Tap: chapter-aware previous (or restart / previous queue item). */
  skipToPrevious: () => Promise<void>;
  /** Hold: previous queue item, ignoring chapters. */
  skipToPreviousTrack: () => Promise<void>;
  setRate: (rate: number) => void;
  /** Tap: next chapter when present, otherwise next queue item. */
  skipToNext: () => Promise<void>;
  /** Hold: next queue item, ignoring chapters. */
  skipToNextTrack: () => Promise<void>;
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

// Module-level guard so the last-playback restore fires at most once per app process.
let lastPlaybackRestoreStarted = false;

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
  const [transportState, setTransportState] = useState<PlaybackTransportState>('paused');
  const [lastPlaybackError, setLastPlaybackError] = useState<PlaybackErrorEvent | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [itemLabeledEnclosures, setItemLabeledEnclosures] = useState<LabeledItemEnclosure[]>([]);
  const [enclosureSelectedParams, setEnclosureSelectedParamsState] =
    useState<EnclosureSelectedParams>(DEFAULT_ENCLOSURE_SELECTED_PARAMS);
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
  const authoringHoldRef = useRef<boolean>(false);
  const playbackRateRef = useRef<number>(1);
  const advancingRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const lastSourceUrlRef = useRef<string | null>(null);
  // Whether the engine has reported the current source playable. Gates the transport spinner: it
  // means "cannot start yet", never "buffering again mid-episode".
  const sourcePlayableRef = useRef<boolean>(false);
  const lastPlaybackSnapshotWriteRef = useRef<number>(0);
  const enclosureSelectedParamsRef = useRef<EnclosureSelectedParams>(
    DEFAULT_ENCLOSURE_SELECTED_PARAMS
  );
  const previousAuthStatusRef = useRef(status);
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
    setPlaybackProgressPlaying(playing);
    setIsPlaying(playing);
  }, []);

  const setEnclosureSelectedParams = useCallback((params: EnclosureSelectedParams): void => {
    enclosureSelectedParamsRef.current = params;
    setEnclosureSelectedParamsState(params);
  }, []);

  const resetEnclosureSelectionSession = useCallback((): void => {
    setItemLabeledEnclosures([]);
    setEnclosureSelectedParams(DEFAULT_ENCLOSURE_SELECTED_PARAMS);
  }, [setEnclosureSelectedParams]);

  const resolvePlaybackSelectionForItem = useCallback(
    async (
      item: DTOItem
    ): Promise<{
      labeledItemEnclosures: LabeledItemEnclosure[];
      selectedParams: EnclosureSelectedParams;
    }> => {
      const labeledItemEnclosures = buildItemLabeledEnclosures(item);
      const nextCurrentParams =
        itemIdFromTarget(activeTargetRef.current) === item.id_text
          ? enclosureSelectedParamsRef.current
          : DEFAULT_ENCLOSURE_SELECTED_PARAMS;
      const preferredMediaType = await readPlaybackMediaTypePref();
      const selectedParams = resolveSessionEnclosureSelectedParams({
        current: nextCurrentParams,
        labeledItemEnclosures,
        preferredMediaType,
      });
      setItemLabeledEnclosures(labeledItemEnclosures);
      setEnclosureSelectedParams(selectedParams);
      return { labeledItemEnclosures, selectedParams };
    },
    [setEnclosureSelectedParams]
  );

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
      const local = await playbackContentRepository.getLocalChannelForItem(item.id_text);
      if (local !== null) {
        return local;
      }
      try {
        return await playbackContentRepository.getChannelById(buildContext(), item.channel_id);
      } catch {
        return null;
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

  const beginAuthoringHold = useCallback((): void => {
    authoringHoldRef.current = true;
  }, []);

  const endAuthoringHold = useCallback((): void => {
    authoringHoldRef.current = false;
  }, []);

  const clearPauseBoundary = useCallback((): void => {
    pauseAtRef.current = null;
  }, []);

  const writeLastPlaybackSnapshotForTarget = useCallback(
    (target: PlaybackTarget, positionValue: number) => {
      const snapshot = lastPlaybackSnapshotFromTarget(
        target,
        positionValue,
        durationRef.current > 0 ? durationRef.current : undefined
      );
      if (snapshot === null) {
        return;
      }
      if (snapshot === 'finished') {
        void clearLastPlaybackSnapshot();
        return;
      }
      lastPlaybackSnapshotWriteRef.current = Date.now();
      void writeLastPlaybackSnapshot(snapshot);
    },
    []
  );

  const clearNowPlaying = useCallback(() => {
    nativePlaybackBridge.pause();
    pauseAtRef.current = null;
    activeTargetRef.current = null;
    lastSourceUrlRef.current = null;
    sourcePlayableRef.current = false;
    positionRef.current = 0;
    durationRef.current = 0;
    resetPlaybackProgress();
    setActiveTarget(null);
    setNowPlaying(null);
    setPlaybackPlaying(false);
    setTransportState('paused');
    resetEnclosureSelectionSession();
    void clearLastPlaybackSnapshot();
  }, [resetEnclosureSelectionSession, setPlaybackPlaying]);

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
        playbackDecisionOverride?: PlaybackLoadDecision;
        shouldSkipPlayEventWrite?: boolean;
      }
    ): Promise<void> => {
      setNoticeKey(null);
      if (target.kind === 'add-by-rss') {
        resetEnclosureSelectionSession();
      }
      lastSourceUrlRef.current = params.url;
      sourcePlayableRef.current = false;
      setTransportState('loading');
      let decision: PlaybackLoadDecision;
      try {
        decision = await applyLoad(
          {
            explicitPlaybackSeconds: params.explicitPlaybackSeconds,
            mediaFileDurationHintSeconds: params.mediaFileDurationHintSeconds,
            target,
          },
          params.url,
          playbackRateRef.current,
          params.autoPlayOverride,
          params.playbackDecisionOverride
        );
      } catch {
        setLastPlaybackError(playbackErrorFromLoadFailure());
        setTransportState('error');
        activeTargetRef.current = target;
        setActiveTarget(target);
        setNowPlaying(params.summary);
        setPlaybackPlaying(false);
        return;
      }
      applyAutoQueueDirective(params.autoQueue);
      pauseAtRef.current = decision.pauseAtSeconds ?? null;
      activeTargetRef.current = target;
      positionRef.current = decision.initialSeekSeconds;
      durationRef.current =
        params.mediaFileDurationHintSeconds !== undefined ? params.mediaFileDurationHintSeconds : 0;
      const shouldAutoPlay = params.autoPlayOverride ?? decision.shouldAutoPlay;
      setActiveTarget(target);
      setNowPlaying(params.summary);
      setPlaybackProgress({
        durationSeconds: durationRef.current,
        positionSeconds: decision.initialSeekSeconds,
      });
      setPlaybackPlaying(shouldAutoPlay);
      // The native load resolved, so the source is prepared: stop spinning even if the engine has
      // not published its next state yet.
      sourcePlayableRef.current = true;
      setLastPlaybackError(null);
      setTransportState(shouldAutoPlay ? 'playing' : 'paused');

      if (shouldAutoPlay && params.shouldSkipPlayEventWrite !== true) {
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
      writeLastPlaybackSnapshotForTarget(target, decision.initialSeekSeconds);
    },
    [
      applyAutoQueueDirective,
      applyLoad,
      resetEnclosureSelectionSession,
      resolvePlaybackStatsTargets,
      setPlaybackPlaying,
      toStatsReplayPayload,
      trackPlaybackStatsBestEffort,
      writeLastPlaybackSnapshotForTarget,
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
      const { labeledItemEnclosures, selectedParams } = await resolvePlaybackSelectionForItem(item);
      const url = await resolvePlaybackUrl(item, selectedParams, labeledItemEnclosures);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildItemPlaybackTarget(item, channel, options.intent);
      await playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          options.mediaFileDurationHintSeconds,
          item.item_about.duration
        ),
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget, resolvePlaybackSelectionForItem]
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
      const { labeledItemEnclosures, selectedParams } = await resolvePlaybackSelectionForItem(item);
      const url = await resolvePlaybackUrl(item, selectedParams, labeledItemEnclosures);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildClipPlaybackTarget(clip, item, channel);
      await playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          options.mediaFileDurationHintSeconds,
          item.item_about.duration
        ),
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget, resolvePlaybackSelectionForItem]
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
      const { labeledItemEnclosures, selectedParams } = await resolvePlaybackSelectionForItem(item);
      const url = await resolvePlaybackUrl(item, selectedParams, labeledItemEnclosures);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildSoundbitePlaybackTarget(soundbite, item, channel);
      await playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          options.mediaFileDurationHintSeconds,
          item.item_about.duration
        ),
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget, resolvePlaybackSelectionForItem]
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

  const loadItemPausedAt = useCallback(
    async (item: DTOItem, channel: DTOChannel, seconds: number): Promise<void> => {
      await startItemPlayback(item, channel, {
        autoPlayOverride: false,
        autoQueue: { mode: 'clear' },
        explicitPlaybackSeconds: Math.max(0, seconds),
        intent: 'explicit_play',
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          undefined,
          item.item_about.duration
        ),
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
      const { labeledItemEnclosures, selectedParams } = await resolvePlaybackSelectionForItem(item);
      const url = await resolvePlaybackUrl(item, selectedParams, labeledItemEnclosures);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      const target = buildChapterPlaybackTarget(chapter, item, channel);
      await playTarget(target, {
        autoQueue: { mode: 'clear' },
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          undefined,
          item.item_about.duration
        ),
        summary: summaryFromItem(item, channel),
        url,
      });
    },
    [playTarget, resolvePlaybackSelectionForItem]
  );

  const switchEnclosureSelectedParams = useCallback(
    async (nextParams: EnclosureSelectedParams): Promise<void> => {
      const target = activeTargetRef.current;
      if (target === null || target.kind === 'add-by-rss' || target.kind === 'livestream') {
        setEnclosureSelectedParams(nextParams);
        return;
      }

      const currentParams = enclosureSelectedParamsRef.current;
      const decision = buildEnclosureSwitchPlaybackDecisionIfChanged({
        currentEnclosureSelectedParams: currentParams,
        labeledItemEnclosures: itemLabeledEnclosures,
        mpClip: target.kind === 'clip' ? target.clip : null,
        mpItemChapter: target.kind === 'chapter' ? target.chapter : null,
        mpItemSoundbite: target.kind === 'soundbite' ? target.soundbite : null,
        nextEnclosureSelectedParams: nextParams,
        resumeAtSeconds: resolveResumeAtSecondsForEnclosureSwitch(
          positionRef.current,
          positionRef.current
        ),
      });

      setEnclosureSelectedParams(nextParams);
      if (decision === null) {
        return;
      }

      const nextUrl = resolveItemEnclosureUrl({
        labeledItemEnclosures: itemLabeledEnclosures,
        selectedParams: nextParams,
      });
      if (nextUrl === null) {
        setNoticeKey('media_player.no_media');
        return;
      }

      await playTarget(target, {
        autoPlayOverride: isPlayingRef.current,
        autoQueue: { mode: 'preserve' },
        explicitPlaybackSeconds: decision.initialSeekSeconds,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          undefined,
          target.item.item_about.duration
        ),
        playbackDecisionOverride: decision,
        shouldSkipPlayEventWrite: true,
        summary: summaryFromItem(target.item, target.channel),
        url: nextUrl,
      });
    },
    [itemLabeledEnclosures, playTarget, setEnclosureSelectedParams]
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

  const startAddByRssPlayback = useCallback(
    async (
      resourceData: AddByRSSResourceData,
      options: {
        autoQueue: AutoQueueDirective;
        explicitPlaybackSeconds?: number;
      }
    ): Promise<void> => {
      const url = resolveAddByRssPlaybackUrl(resourceData);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return;
      }
      await playTarget(
        {
          kind: 'add-by-rss',
          resourceData,
        },
        {
          autoQueue: options.autoQueue,
          explicitPlaybackSeconds: options.explicitPlaybackSeconds,
          summary: summaryFromAddByRssResourceData(resourceData),
          url,
        }
      );
    },
    [playTarget]
  );

  const playAddByRssResourceData = useCallback(
    async (
      resourceData: AddByRSSResourceData,
      options?: { explicitPlaybackSeconds?: number }
    ): Promise<void> => {
      await startAddByRssPlayback(resourceData, {
        autoQueue: { mode: 'clear' },
        explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
      });
    },
    [startAddByRssPlayback]
  );

  const playQueueResource = useCallback(
    async (
      resource: DTOQueueResource,
      intent: MusicItemPlaybackIntent,
      options?: {
        explicitPlaybackSeconds?: number;
        autoPlayOverride?: boolean;
        autoQueue?: AutoQueueDirective;
      }
    ): Promise<void> => {
      const autoQueue = options?.autoQueue ?? { mode: 'preserve' };
      if (isAddByRssResourceData(resource.add_by_rss_resource_data)) {
        await startAddByRssPlayback(resource.add_by_rss_resource_data, {
          autoQueue,
          explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        });
        return;
      }
      if (resource.clip) {
        const item = resource.clip.item;
        const channel = await ensureChannel(item);
        if (channel === null) {
          return;
        }
        await startClipPlayback(resource.clip, item, channel, {
          autoPlayOverride: options?.autoPlayOverride,
          autoQueue,
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
          autoQueue,
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
        autoQueue,
        explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        intent,
      });
    },
    [
      ensureChannel,
      startAddByRssPlayback,
      startClipPlayback,
      startItemPlayback,
      startSoundbitePlayback,
    ]
  );

  const playQueueResourceFromQueue = useCallback(
    async (resource: DTOQueueResource): Promise<void> => {
      await playQueueResource(resource, 'explicit_play', {
        autoQueue: { mode: 'clear' },
        explicitPlaybackSeconds: normalizePlaybackPosition(resource.playback_position),
      });
    },
    [playQueueResource]
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
        // Clip authoring holds the item where it is: pause and leave it now-playing. This is settled
        // before anything else because the rest of this function writes the item out of the queue,
        // which is exactly what a hold must not do.
        if (transitionKind === 'complete' && authoringHoldRef.current) {
          nativePlaybackBridge.pause();
          setPlaybackPlaying(false);
          setTransportState('paused');
          return;
        }
        const hasAutoQueueNext = computeHasAutoQueueNext();

        const eventKind = playbackEventFromDiscreteSignal(transitionKind);
        const completed = transitionKind === 'complete';
        if (completed) {
          void clearLastPlaybackSnapshot();
        }
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

        // Read the queue only after the finished resource has left it, because the next thing to
        // play is the queue's own first row. Reading first returns the resource that is ending — it
        // is still now-playing, or still sits upcoming when playback started from a detail screen —
        // and playing that row restarts the same track instead of advancing. Web orders these the
        // same way (`NonLiveMediaOrchestrator` `onEnded`).
        //
        // The queue is the one for the medium of what was playing, not whichever queue happens to be
        // active: starting a track leaves a podcast queue active until its own claim lands, and
        // asking that queue for the next row skips into the wrong medium. Add-by-RSS has no channel
        // and no queue behind it, so it falls back to the active queue.
        let activeResource: DTOQueueResource | null = null;
        let upcomingManualCount = 0;
        const advanceMediumId =
          target !== null && target.kind !== 'add-by-rss'
            ? target.channel.medium_id
            : activeQueueRef.current?.medium_id;
        try {
          const result = await loadActive(advanceMediumId);
          activeResource = result.activeResource;
          upcomingManualCount =
            result.activeResource !== null ? result.upcomingResources.length : 0;
        } catch (error) {
          if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
            throw error;
          }
        }
        const decision = resolveQueueAdvance({
          hasAutoQueueNext,
          holdNowPlaying: false,
          upcomingManualCount,
        });

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

  // Universal last-playback restore: every resolved auth status restores the device-local
  // now-playing snapshot once per process, loaded paused so cold start never blasts audio. Sign-in
  // (anonymous → authenticated) clears the snapshot so the account's server queue is authoritative.
  const restoreFromSnapshot = useCallback(
    async (snapshot: LastPlaybackSnapshot): Promise<void> => {
      const context = buildContext();
      const snapshotStillCurrent = async (): Promise<boolean> => {
        if (statusRef.current === 'unknown') {
          return false;
        }
        // Sign-in may have cleared the snapshot while fetches were in flight.
        const stillStored = await readLastPlaybackSnapshot();
        return (
          stillStored !== null &&
          stillStored.kind === snapshot.kind &&
          stillStored.id_text === snapshot.id_text
        );
      };
      try {
        if (snapshot.kind === 'clip') {
          const clip = await playbackContentRepository.getClipByIdText(context, snapshot.id_text);
          const item = clip.item;
          const channel = await ensureChannel(item);
          if (channel === null || !(await snapshotStillCurrent())) {
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
          if (channel === null || !(await snapshotStillCurrent())) {
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
        if (channel === null || !(await snapshotStillCurrent())) {
          return;
        }
        await startItemPlayback(item, channel, {
          autoPlayOverride: false,
          autoQueue: { mode: 'clear' },
          explicitPlaybackSeconds: snapshot.playback_position_seconds,
          intent: 'session_restore',
          mediaFileDurationHintSeconds: snapshot.media_file_duration_seconds,
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[playback] last-playback restore failed', error);
        }
      }
    },
    [buildContext, ensureChannel, startClipPlayback, startItemPlayback, startSoundbitePlayback]
  );

  useEffect(() => {
    const previousStatus = previousAuthStatusRef.current;
    previousAuthStatusRef.current = status;

    // Sign-in clears any snapshot from a prior anonymous session — the account queue wins.
    if (previousStatus === 'anonymous' && status === 'authenticated') {
      void clearLastPlaybackSnapshot();
      return;
    }

    if (status === 'unknown' || lastPlaybackRestoreStarted) {
      return;
    }
    lastPlaybackRestoreStarted = true;
    void (async () => {
      const snapshot = await readLastPlaybackSnapshot();
      if (snapshot === null || statusRef.current === 'unknown') {
        return;
      }
      await restoreFromSnapshot(snapshot);
    })();
  }, [restoreFromSnapshot, status]);

  const reconcileFromNative = useCallback((): void => {
    void (async () => {
      try {
        const [position, duration] = await Promise.all([
          nativePlaybackBridge.getPosition(),
          nativePlaybackBridge.getDuration(),
        ]);
        if (Number.isFinite(position) && position >= 0) {
          positionRef.current = position;
          setPlaybackPositionSeconds(position);
        }
        if (Number.isFinite(duration) && duration > 0) {
          durationRef.current = duration;
          setPlaybackDurationSeconds(duration);
        }
      } catch {
        // Best-effort heal after a missed native event window (e.g. Fast Refresh).
      }
    })();
  }, []);

  useNativePlaybackBridge({
    ended: () => {
      void advance('complete');
    },
    error: (event) => {
      setPlaybackPlaying(false);
      setLastPlaybackError(event);
      setTransportState('error');
    },
    playbackState: (event) => {
      if (isEnginePlayableState(event.state)) {
        sourcePlayableRef.current = true;
      }
      const nextTransport = playbackTransportForEngineState(event.state, sourcePlayableRef.current);
      if (nextTransport !== null) {
        setTransportState(nextTransport);
      }
      if (event.state === 'playing') {
        setPlaybackPlaying(true);
      } else if (event.state === 'paused' || event.state === 'ended' || event.state === 'error') {
        setPlaybackPlaying(false);
      }
      if (event.state === 'ready' || event.state === 'playing') {
        reconcileFromNative();
      }
    },
    progress: (event) => {
      positionRef.current = event.positionSeconds;
      setPlaybackPositionSeconds(event.positionSeconds);
      if (event.durationSeconds > 0) {
        durationRef.current = event.durationSeconds;
        setPlaybackDurationSeconds(event.durationSeconds);
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

      // Throttled last-playback snapshot so a restart resumes near the last position.
      const target = activeTargetRef.current;
      if (
        target !== null &&
        Date.now() - lastPlaybackSnapshotWriteRef.current >= LAST_PLAYBACK_SNAPSHOT_THROTTLE_MS
      ) {
        writeLastPlaybackSnapshotForTarget(target, event.positionSeconds);
      }
    },
  });

  useEffect(() => {
    reconcileFromNative();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = nextState;
      if (nextState === 'active') {
        reconcileFromNative();
      }
      if (!wasActive || nextState === 'active') {
        return;
      }

      const target = activeTargetRef.current;
      if (target !== null) {
        writeLastPlaybackSnapshotForTarget(target, positionRef.current);
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
  }, [reconcileFromNative, writeLastPlaybackSnapshotForTarget, writePlaybackEvent]);

  // Drive the video surface from the selected enclosure media type. The native host additionally
  // gates on real video frames, so mismatched metadata never leaves a black rectangle.
  useEffect(() => {
    const hasActiveNonLiveItem =
      activeTarget !== null &&
      activeTarget.kind !== 'add-by-rss' &&
      activeTarget.kind !== 'livestream';
    const selectedMediaType = resolveSelectedItemEnclosureMediaType({
      labeledItemEnclosures: itemLabeledEnclosures,
      selectedParams: enclosureSelectedParams,
    });
    nativePlaybackBridge.setVideoSurfaceVisible(
      hasActiveNonLiveItem && selectedMediaType === 'video'
    );
  }, [activeTarget, enclosureSelectedParams, itemLabeledEnclosures]);

  const pause = useCallback(() => {
    nativePlaybackBridge.pause();
    setPlaybackPlaying(false);
    setTransportState('paused');
    const target = activeTargetRef.current;
    if (target !== null) {
      writeLastPlaybackSnapshotForTarget(target, positionRef.current);
    }
    void writePlaybackEvent({
      eventKind: playbackEventFromDiscreteSignal('pause'),
      forceNetwork: true,
      isPlaying: false,
      mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
      playbackPositionSeconds: positionRef.current,
    });
  }, [setPlaybackPlaying, writeLastPlaybackSnapshotForTarget, writePlaybackEvent]);

  const retryPlayback = useCallback(async () => {
    const url = lastSourceUrlRef.current;
    if (url === null) {
      return;
    }
    sourcePlayableRef.current = false;
    setTransportState('loading');
    try {
      await nativePlaybackBridge.loadAndStart({
        initialSeekSeconds: positionRef.current,
        url,
      });
      nativePlaybackBridge.setRate(playbackRateRef.current);
      sourcePlayableRef.current = true;
      setLastPlaybackError(null);
      setPlaybackPlaying(true);
      setTransportState('playing');
    } catch {
      setLastPlaybackError(playbackErrorFromLoadFailure());
      setTransportState('error');
    }
  }, [setPlaybackPlaying]);

  const resume = useCallback(async () => {
    await nativePlaybackBridge.play();
    setPlaybackPlaying(true);
    setTransportState('playing');

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
      setPlaybackPositionSeconds(seconds);
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

  /**
   * Move the loaded player to a position another device reached on the same resource.
   *
   * No playback event is written back. The position came from the server, so reporting it again
   * would restamp it with this device's clock and make this device look like the most recent
   * listener — two devices catching up on each other would then trade the "latest" claim forever.
   */
  const adoptRemotePlaybackPosition = useCallback(
    (seconds: number): void => {
      const target = activeTargetRef.current;
      if (target === null) {
        return;
      }

      nativePlaybackBridge.seek(seconds);
      positionRef.current = seconds;
      setPlaybackPositionSeconds(seconds);
      writeLastPlaybackSnapshotForTarget(target, seconds);
    },
    [writeLastPlaybackSnapshotForTarget]
  );

  useEffect(() => {
    const applyAdoptions = (adoptions: readonly PlaybackReconcileResourceState[]): void => {
      // The player is the last word on whether the position may move: reconcile ran in the
      // background and the user may have started listening in the meantime.
      if (adoptions.length === 0 || isPlayingRef.current) {
        return;
      }

      const target = activeTargetRef.current;
      const loaded = target === null ? null : nowPlayingResourceFromTarget(target);
      if (loaded === null) {
        return;
      }

      const match = adoptions.find(
        (adoption) =>
          adoption.resourceKind === loaded.resourceKind &&
          adoption.resourceIdText === loaded.resourceIdText
      );
      if (match === undefined || match.playbackPosition === positionRef.current) {
        return;
      }

      adoptRemotePlaybackPosition(match.playbackPosition);
    };

    applyAdoptions(readPlaybackPositionAdoptions());
    return subscribePlaybackPositionAdoptions(applyAdoptions);
  }, [adoptRemotePlaybackPosition]);

  const previewWindow = useCallback(
    async (params: { fromSeconds: number; pauseAtSeconds?: number | null }): Promise<void> => {
      pauseAtRef.current = params.pauseAtSeconds ?? null;
      seekTo(Math.max(0, params.fromSeconds));
      await resume();
    },
    [resume, seekTo]
  );

  const resolveChaptersForTarget = useCallback(
    async (target: PlaybackTarget): Promise<DTOItemChapter[]> => {
      const item = itemFromTarget(target);
      const fallbackChapter = target.kind === 'chapter' ? target.chapter : null;
      if (item === null) {
        return fallbackChapter === null ? [] : [fallbackChapter];
      }
      const chapters = await resolveNowPlayingChapters(buildContext(), item.id_text);
      if (
        fallbackChapter !== null &&
        !chapters.some((chapter) => chapter.id_text === fallbackChapter.id_text)
      ) {
        return [...chapters, fallbackChapter];
      }
      return chapters;
    },
    [buildContext]
  );

  const resolvePreviousQueueResource = useCallback(
    async (target: PlaybackTarget): Promise<DTOQueueResource | null> => {
      if (statusRef.current !== 'authenticated' || target.kind === 'add-by-rss') {
        return null;
      }
      try {
        const active = await loadActive(target.channel.medium_id);
        if (active.activeQueue === null) {
          return null;
        }
        const history = await queueRepository.getHistoryPage(
          buildContext(),
          active.activeQueue.id_text,
          1
        );
        return history[0] ?? null;
      } catch {
        return null;
      }
    },
    [buildContext, loadActive]
  );

  const jumpBy = useCallback(
    (deltaSeconds: number) => {
      const target = activeTargetRef.current;
      if (target === null || target.kind === 'livestream') {
        return;
      }
      const bounds = seekBoundsFromTarget(target, durationRef.current, positionRef.current);
      seekTo(
        resolveJumpTarget({
          deltaSeconds,
          lowerBoundSeconds: bounds.lowerBoundSeconds,
          positionSeconds: positionRef.current,
          upperBoundSeconds: bounds.upperBoundSeconds,
        })
      );
    },
    [seekTo]
  );

  const skipToPrevious = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || target.kind === 'livestream') {
      return;
    }
    const [rawChapters, previousQueueResource] = await Promise.all([
      resolveChaptersForTarget(target),
      resolvePreviousQueueResource(target),
    ]);
    const chapters = chaptersForTrackButtons(target, rawChapters);
    const action = resolvePreviousAction({
      chapters,
      hasPreviousQueueItem: previousQueueResource !== null,
      positionSeconds: positionRef.current,
    });
    if (action.kind === 'previous-queue-item') {
      if (previousQueueResource !== null) {
        await playQueueResource(previousQueueResource, 'explicit_play');
        return;
      }
      seekTo(0);
      return;
    }
    seekTo(action.seekSeconds);
  }, [playQueueResource, resolveChaptersForTarget, resolvePreviousQueueResource, seekTo]);

  const skipToPreviousTrack = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || target.kind === 'livestream') {
      return;
    }
    const previousQueueResource = await resolvePreviousQueueResource(target);
    if (previousQueueResource !== null) {
      await playQueueResource(previousQueueResource, 'explicit_play');
      return;
    }
    seekTo(0);
  }, [playQueueResource, resolvePreviousQueueResource, seekTo]);

  const setRate = useCallback((rate: number) => {
    playbackRateRef.current = rate;
    setPlaybackProgressRate(rate);
    setPlaybackRate(rate);
    nativePlaybackBridge.setRate(rate);
  }, []);

  const skipToNext = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || target.kind === 'livestream') {
      return;
    }
    const rawChapters = await resolveChaptersForTarget(target);
    const chapters = chaptersForTrackButtons(target, rawChapters);
    const action = resolveNextAction({
      chapters,
      positionSeconds: positionRef.current,
    });
    if (action.kind === 'seek-next-chapter') {
      seekTo(action.seekSeconds);
      return;
    }
    if (action.kind === 'none') {
      return;
    }
    await advance('skip');
  }, [advance, resolveChaptersForTarget, seekTo]);

  const skipToNextTrack = useCallback(() => advance('skip'), [advance]);
  const completeNowPlaying = useCallback(() => advance('complete'), [advance]);

  const sessionValue = useMemo<PlaybackSessionContextValue>(
    () => ({
      activeTarget,
      isPlaying,
      noticeKey,
      nowPlaying,
      enclosureSelectedParams,
      itemLabeledEnclosures,
      pause,
      playChapter,
      playAddByRssResourceData,
      playClip,
      playClipById,
      playItem,
      playItemById,
      loadItemPausedAt,
      playPlaylistRowById,
      playQueueResourceFromQueue,
      playSoundbite,
      playbackRate,
      beginAuthoringHold,
      endAuthoringHold,
      clearPauseBoundary,
      previewWindow,
      resume,
      retryPlayback,
      lastPlaybackError,
      completeNowPlaying,
      jumpBy,
      seekTo,
      setRate,
      switchEnclosureSelectedParams,
      skipToPrevious,
      skipToPreviousTrack,
      skipToNext,
      skipToNextTrack,
      transportState,
    }),
    [
      activeTarget,
      completeNowPlaying,
      jumpBy,
      isPlaying,
      noticeKey,
      nowPlaying,
      enclosureSelectedParams,
      itemLabeledEnclosures,
      pause,
      playChapter,
      playAddByRssResourceData,
      playClip,
      playClipById,
      playItem,
      playItemById,
      loadItemPausedAt,
      playPlaylistRowById,
      playQueueResourceFromQueue,
      playSoundbite,
      playbackRate,
      beginAuthoringHold,
      endAuthoringHold,
      clearPauseBoundary,
      previewWindow,
      resume,
      retryPlayback,
      lastPlaybackError,
      seekTo,
      setRate,
      switchEnclosureSelectedParams,
      skipToNext,
      skipToNextTrack,
      skipToPrevious,
      skipToPreviousTrack,
      transportState,
    ]
  );

  return (
    <PlaybackSessionContext.Provider value={sessionValue}>
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
  return useSyncExternalStore(
    subscribePlaybackProgress,
    getPlaybackProgressSnapshot,
    getPlaybackProgressSnapshot
  );
}

/** Whole-second playhead for clock labels — re-renders at most once per second. */
export function usePlaybackPositionClock(): number {
  return useSyncExternalStore(
    subscribePlaybackPositionClock,
    getPlaybackPositionClockSeconds,
    getPlaybackPositionClockSeconds
  );
}

/** Fill ratio 0–1 for progress tracks. Re-renders on every store tick while mounted. */
export function usePlaybackProgressRatio(): number {
  return useSyncExternalStore(subscribePlaybackProgress, getPlaybackProgressRatio, () => 0);
}

/** Full playback API (session + playhead). Prefer the split hooks in list rows. */
export function usePlayback(): PlaybackContextValue {
  const session = usePlaybackSession();
  const progress = usePlaybackProgress();
  return { ...session, ...progress };
}

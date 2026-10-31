import * as FileSystem from 'expo-file-system/legacy';
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
import {
  primaryLightboxArtworkUrl,
  primaryListArtworkUrl,
  resolveItemLiveStatusId,
} from '@podverse/helpers';
import type { DTOPlaybackResourceRef } from '@podverse/helpers/accountPlaybackStream';
import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOQueue,
  DTOQueueResource,
} from '@podverse/helpers/dto';
import { getErrorCode, getErrorResponseStatus } from '@podverse/helpers/error';
import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';
import type { PlaybackEventKind } from '@podverse/helpers/playbackEvents';
import {
  PLAYBACK_POSITION_LOCAL_INTERVAL_MS,
  PLAYBACK_POSITION_NETWORK_INTERVAL_MS,
  PLAYBACK_SEEK_NETWORK_COALESCE_MS,
} from '@podverse/helpers/playbackOutboxLimits';
import { getQueueForMedium } from '@podverse/helpers/queue';
import type {
  ListenSessionReport,
  ListenSessionTracker,
  MusicItemPlaybackIntent,
  PlaybackLoadDecision,
  PlaybackTarget,
} from '@podverse/playback-core';
import {
  buildEnclosureSwitchPlaybackDecisionIfChanged,
  createListenSessionTracker,
  listenSessionTargetFromPlaybackTarget,
  parsePlaybackSeconds,
  resolveResumeAtSecondsForEnclosureSwitch,
} from '@podverse/playback-core';
import type { AutoQueueResourcesMapRow } from '@podverse/playback-core/autoQueue';
import {
  autoQueueIncrementActiveRow,
  autoQueueSeedFromPlaybackTarget,
  hasAutoQueueRowAfter,
} from '@podverse/playback-core/autoQueue';
import {
  clampCommandStartToFileEnd,
  clampPlaybackPositionForStorage,
} from '@podverse/playback-core/clampNearEndSeconds';
import { clampLiveSeekSeconds, isRewindableLiveWindow } from '@podverse/playback-core/livePlayback';
import { resolvePlaybackLoadDecision } from '@podverse/playback-core/resolvePlaybackLoadDecision';
import { resolveQueueAdvance } from '@podverse/playback-core/resolveQueueAdvance';

import type {
  MediaEngineSourceMeta,
  PlaybackErrorEvent,
  PlaybackStateValue,
} from '../../modules/podverse-media-engine';
import { useAuth } from '../auth/AuthProvider';
import { nativePlaybackBridge } from '../bridge/nativePlaybackBridge';
import { useNativePlaybackBridge } from '../bridge/useNativePlaybackBridge';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import {
  canAdvanceToNextQueueItem,
  shouldClearNowPlayingAfterAdvance,
  upcomingManualCountFromCombined,
} from '../components/player/fullPlayerRows';
import { useAutoQueue } from '../contexts/AutoQueueProvider';
import { useQueues } from '../contexts/QueuesProvider';
import type { MobileAuthRequestContext } from '../data';
import type { PlaybackOutboxEnqueueEvent } from '../data';
import {
  accountRepository,
  addByRssRepository,
  playbackContentRepository,
  playbackOutboxRepository,
  queueRepository,
  statsRepository,
} from '../data';
import { syncEventLogRepository } from '../data/repositories';
import { nativeAdvanceSourceRepository } from '../data/repositories/nativeAdvanceSourceRepository';
import type {
  PlaybackReconcileDifferentNowPlayingConflict,
  PlaybackReconcileResourceState,
} from '../data/repositories/playbackReconcile';
import { downloadManager } from '../downloads/downloadManager';
import { downloadStore } from '../downloads/downloadStore';
import { playbackErrorFromLoadFailure } from '../feedback/actionErrorCopy';
import { useQueueDataRevision } from '../hooks/useQueueDataRevision';
import { useQueueMutations } from '../hooks/useQueueMutations';
import { useQueueResourcesLoadActive } from '../hooks/useQueueResourcesLoadActive';
import { EMPTY_ABRIDGED_INDEX } from '../lib/addByRss/domain';
import type { AddByRssFeedPlayEntry } from '../lib/addByRss/feedWalk';
import { findAddByRssEpisodePlayEntry } from '../lib/addByRss/feedWalk';
import {
  findLocalAddByRssResourceDataByHash,
  loadLocalFeed,
  resolveLocalAddByRssResourceData,
} from '../lib/addByRss/localResourceData';
import { isAddByRssResourceData, resolveAddByRssPlaybackUrl } from '../lib/addByRss/playbackUrl';
import {
  addByRssPlaybackMediaId,
  withCanonicalAddByRssFeedUrl,
} from '../lib/addByRss/resourceData';
import type { AutoQueueDirective } from '../lib/autoQueue/autoQueue';
import { createUuid } from '../lib/createUuid';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';
import { perfCount } from '../lib/perf/perfSpans';
import {
  buildChapterPlaybackTarget,
  buildClipPlaybackTarget,
  buildSoundbitePlaybackTarget,
  playbackReloadSource,
  playbackTargetRowMediaId,
  playbackTargetToHistoryTarget,
  resolveItemPlaybackStart,
} from '../lib/playback/buildPlaybackTarget';
import { isMusicPlaybackTarget } from '../lib/playback/engineAudioProfile';
import {
  adoptedItemNeedsEnrichment,
  buildAdoptedPlaybackTarget,
  buildChannelFromEngineMeta,
  buildItemFromEngineMeta,
  engineKindPlaysWholeItem,
} from '../lib/playback/engineSourceAdoption';
import type { LastPlaybackSnapshot } from '../lib/playback/lastPlaybackStorage';
import {
  clearLastPlaybackSnapshot,
  lastPlaybackSnapshotFromTarget,
  readLastPlaybackSnapshot,
  writeLastPlaybackSnapshot,
} from '../lib/playback/lastPlaybackStorage';
import { engineSourceMatchesTarget } from '../lib/playback/mediaEngineSourceMeta';
import {
  resolveLoadDurationSeconds,
  resolveMediaFileDurationHintSeconds,
  resolveSampleDurationSeconds,
} from '../lib/playback/mediaFileDurationHint';
import { decideAdoptedContinuation } from '../lib/playback/nativeAdvanceSource';
import {
  DOWNLOAD_HANDOFF_POSITION_TOLERANCE_SECONDS,
  DOWNLOAD_HANDOFF_PROGRESS_SUPPRESS_MS,
  isDownloadHandoffProgressLanded,
  planDownloadCompletePlaybackHandoff,
  resolveDownloadHandoffRecord,
} from '../lib/playback/planDownloadCompletePlaybackHandoff';
import {
  buildItemLabeledEnclosures,
  DEFAULT_ENCLOSURE_SELECTED_PARAMS,
  resolveItemEnclosureUrl,
  resolveSelectedItemEnclosureMediaType,
  resolveSessionEnclosureSelectedParams,
} from '../lib/playback/resolveEnclosureUrl';
import {
  resolveLocalDownloadPlaybackUrl,
  resolvePlaybackUrl,
} from '../lib/playback/resolvePlaybackUrl';
import { resolveRestoredItemLoad } from '../lib/playback/restoredItemLoad';
import { shouldPostSeekEventNow } from '../lib/playback/seekEventCoalescing';
import { isSeekHoldSampleLanded, SEEK_HOLD_MAX_MS } from '../lib/playback/seekPositionHold';
import { isEffectivelyOffline, subscribeConnectivity } from '../net/connectivity';
import { isOfflineModeEnabled } from '../prefs/offlineMode';
import { readPlaybackMediaTypePref } from '../prefs/preferredMediaType';
import { getPref, setPref } from '../prefs/prefsStore';
import {
  attachCarPlayConnectSyncListener,
  drainCarPlaybackJournal,
} from '../sync/carBackgroundSync';
import {
  readPlaybackPositionAdoptions,
  subscribePlaybackPositionAdoptions,
} from '../sync/playbackPositionAdoption';
import {
  readPlaybackReconcileConflicts,
  subscribePlaybackReconcileConflicts,
} from '../sync/playbackReconcileConflict';
import { shouldSkipListenStatsForAccount } from '../tasteProfileConsent/tasteProfileConsentGate';
import { addByRssCredentialsStateForUrl, withAddByRssPlaybackAuth } from './addByRssMediaAuth';
import type { CommandedStartGuard } from './crossDevice/commandedStartClamp';
import {
  createCommandedStartGuard,
  resolveCommandedStartOnEnded,
  resolveCommandedStartOnProgress,
} from './crossDevice/commandedStartClamp';
import type {
  CrossDevicePlaybackLocalPort,
  LocalPlaybackStartResult,
} from './crossDevice/crossDevicePlaybackCommandRunner';
import {
  isLivePlaybackTarget,
  playbackResourceRefFromTarget,
} from './crossDevice/crossDevicePlaybackPolicy';
import type { LocalPlaybackChangeKind } from './crossDevice/crossDevicePlaybackPublisher';
import type { CrossDevicePlaybackView } from './crossDevice/crossDevicePlaybackStore';
import {
  getCrossDevicePlaybackView,
  subscribeCrossDevicePlaybackView,
} from './crossDevice/crossDevicePlaybackStore';
import { useCrossDevicePlayback } from './crossDevice/useCrossDevicePlayback';
import {
  getLivePlaybackHasPlayed,
  getLivePlaybackWindow,
  markLivePlaybackPlayed,
  resetLivePlayback,
  setLivePlaybackSample,
  setLivePlaybackWindow,
} from './livePlaybackStore';
import { resolveNowPlayingAddByRssChapters } from './nowPlayingAddByRssSections';
import { buildPlaybackErrorLog, playbackErrorLogSignature } from './playbackErrorLog';
import {
  nowPlayingResourceFromTarget,
  playbackEventFromBackgroundTransition,
  playbackEventFromDiscreteSignal,
  playbackEventFromProgressSample,
  playbackEventPayloadForTarget,
  playbackMediumIdFromTarget,
  shouldClaimActiveQueueForPlaybackEvent,
  shouldPostNowPlayingImmediately,
} from './playbackEventSource';
import {
  buildPlaybackHandoffDismissedStateKey,
  shouldPromptForPlaybackHandoffConflict,
} from './playbackHandoff';
import { addByRssResourceDataTitle, queueResourceTitle } from './playbackHandoffTitle';
import {
  getPlaybackDurationSeconds,
  getPlaybackPositionClockSeconds,
  getPlaybackProgressRatio,
  getPlaybackProgressSnapshot,
  resetPlaybackProgress,
  setPlaybackDurationSeconds,
  setPlaybackPositionSeconds,
  setPlaybackProgress,
  setPlaybackProgressPlaying,
  setPlaybackProgressRate,
  subscribePlaybackDuration,
  subscribePlaybackPositionClock,
  subscribePlaybackProgress,
} from './playbackProgressStore';
import { playbackSourceMarkerFromUrl, setPlaybackSourceMarker } from './playbackSourceMarker';
import { writeIsPlayingLocallyForSync } from './playbackSyncState';
import type { PlaybackTransportState } from './playbackTransport';
import { isEnginePlayableState, playbackTransportForEngineState } from './playbackTransport';
import {
  chaptersForTrackButtons,
  resolveJumpTarget,
  resolveNextAction,
  resolvePreviousAction,
} from './previousAction';
import { useAddByRssFeedWalk } from './useAddByRssFeedWalk';
import { useAutoQueueFill } from './useAutoQueueFill';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';
import { useNativeAdvanceWindow } from './useNativeAdvanceWindow';
import { resolveNowPlayingChapters } from './useNowPlayingChapters';

export type PlaybackNowPlaying = {
  title: string;
  /** Compact chrome (mini player): shrunken-first. */
  imageUrl: string | null;
  /** Full player display and image viewer: largest original. */
  viewerImageUrl: string | null;
  channelTitle: string | null;
};

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

type ArmedCommandedStart = {
  guard: CommandedStartGuard;
  /**
   * `playbackTargetRowMediaId` of the target the guard belongs to. Samples and ends from the item
   * still playing while the commanded load is in flight never resolve it.
   */
  targetMediaId: string | null;
};

/**
 * The target's own load decision (pause-at, autoplay, stats, auto-queue) starting at a position
 * another device asked for, without the near-end and music explicit-play start rules.
 */
const commandedStartDecision = (target: PlaybackTarget, seconds: number): PlaybackLoadDecision => ({
  ...resolvePlaybackLoadDecision({ target }, { abridged: EMPTY_ABRIDGED_INDEX }),
  initialSeekSeconds: seconds,
});

const isLoadedReconcileResource = (
  target: PlaybackTarget | null,
  state: Pick<PlaybackReconcileResourceState, 'resourceIdText' | 'resourceKind'>
): boolean => {
  const loaded = target === null ? null : nowPlayingResourceFromTarget(target);
  return (
    loaded !== null &&
    loaded.resourceKind === state.resourceKind &&
    loaded.resourceIdText === state.resourceIdText
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

/** What a `play_item` command names for a queue row; null when another device cannot load it. */
const resolveQueueResourcePlayItem = (
  resource: DTOQueueResource
): { ref: DTOPlaybackResourceRef; addByRssResourceData: AddByRSSResourceData | null } | null => {
  const queueRef = resolveQueueResourceRef(resource);
  if (queueRef === null) {
    return null;
  }
  switch (queueRef.resourceKind) {
    case 'add_by_rss': {
      const resourceData = resource.add_by_rss_resource_data;
      if (!isAddByRssResourceData(resourceData)) {
        return null;
      }
      return {
        ref: { kind: 'add_by_rss', add_by_rss_hash_id: queueRef.resourceIdText },
        addByRssResourceData: withCanonicalAddByRssFeedUrl(resourceData),
      };
    }
    case 'soundbite':
      return {
        ref: { kind: 'soundbite', item_soundbite_id_text: queueRef.resourceIdText },
        addByRssResourceData: null,
      };
    case 'clip':
      return {
        ref: { kind: 'clip', clip_id_text: queueRef.resourceIdText },
        addByRssResourceData: null,
      };
    case 'item':
      return {
        ref: { kind: 'item', item_id_text: queueRef.resourceIdText },
        addByRssResourceData: null,
      };
  }
};

/**
 * Whether this session may move an ended livestream at the account's queue head to History. The
 * active device owns its head, so a session in the `remote` role writes nothing. The role is
 * unknown until this session's first check-in settles: `pending`, and also `off`, which is the
 * value before the account and its stream are up. A session that stays `off` writes nothing and
 * leaves the player empty. While `unavailable`, this device cannot see the others and keeps the
 * last role it knew.
 */
const resolveQueueHeadOwnership = (
  view: Pick<CrossDevicePlaybackView, 'availability' | 'role'>
): 'owner' | 'not-owner' | 'unknown' => {
  if (view.availability === 'pending' || view.availability === 'off') {
    return 'unknown';
  }
  return view.role === 'remote' ? 'not-owner' : 'owner';
};

/** A cold-start load: the server's copy when it answered, else the copy already in hand. */
type RestoredItemLoadChoice = { action: 'load'; item: DTOItem } | { action: 'retire' };

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
    options?: { intent?: MusicItemPlaybackIntent; explicitPlaybackSeconds?: number }
  ) => Promise<void>;
  playClip: (clip: DTOClip, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playSoundbite: (soundbite: DTOItemSoundbite, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playChapter: (chapter: DTOItemChapter, item: DTOItem, channel: DTOChannel) => Promise<void>;
  playAddByRssResourceData: (
    resourceData: AddByRSSResourceData,
    options?: { explicitPlaybackSeconds?: number; localDownloadItemIdText?: string }
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
  /** True while Make clip is mounted. Complete must not clear now-playing. */
  isAuthoringHold: boolean;
  clearPauseBoundary: () => void;
  previewWindow: (params: { fromSeconds: number; pauseAtSeconds?: number | null }) => Promise<void>;
  loadItemPausedAt: (item: DTOItem, channel: DTOChannel, seconds: number) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  /** Reload the current source after an engine error. */
  retryPlayback: () => Promise<void>;
  seekTo: (seconds: number) => void;
  jumpBy: (deltaSeconds: number) => void;
  /**
   * Go to a livestream's live moment and play: a seek to the live edge, or a reconnect when the
   * stream holds no window. Does nothing for other items or while another device plays.
   */
  goToLive: () => Promise<void>;
  /** Tap: chapter-aware previous (or restart / previous queue item). */
  skipToPrevious: () => Promise<void>;
  /** Hold: previous queue item, ignoring chapters. */
  skipToPreviousTrack: () => Promise<void>;
  setRate: (rate: number) => void;
  /**
   * A later auto-queue row, or a newer Add by RSS feed item, is already loaded.
   * Stays false until that row is found: a lookup still running with nothing loaded,
   * a lookup that failed, and a source with no later row.
   */
  hasAutomaticNext: boolean;
  /** Tap: next chapter when present, otherwise next queue item. */
  skipToNext: () => Promise<void>;
  /** Hold: next queue item, ignoring chapters. */
  skipToNextTrack: () => Promise<void>;
  /** Same path as the native `ended` handler (`advance('complete')`). */
  completeNowPlaying: () => Promise<void>;
  /** Flip auto-queue shuffle, then clear and reload the up-next rows from the playing item. */
  toggleShuffle: () => void;
  /** Flip auto-queue repeat, then clear and reload the up-next rows from the playing item. */
  toggleRepeat: () => void;
  /** Move playback to another of the account's devices; this phone keeps playing until it claims. */
  transferPlaybackTo: (targetSessionIdText: string) => Promise<void>;
  /** Play what another device is playing here, at its position or the live point, and claim. */
  takeOverPlaybackHere: () => Promise<void>;
};

/**
 * Session / control surface: changes on load, play/pause, rate, notices — not on every timeupdate.
 * List rows that only need “is this the active item?” subscribe here.
 */
export type PlaybackSessionContextValue = Omit<
  PlaybackContextValue,
  'durationSeconds' | 'positionSeconds'
>;

export interface PlaybackRowContextValue {
  activeTarget: PlaybackSessionContextValue['activeTarget'];
  enclosureSelectedParams: PlaybackSessionContextValue['enclosureSelectedParams'];
  itemLabeledEnclosures: PlaybackSessionContextValue['itemLabeledEnclosures'];
  noticeKey: PlaybackSessionContextValue['noticeKey'];
  pause: PlaybackSessionContextValue['pause'];
  playClipById: PlaybackSessionContextValue['playClipById'];
  playItemById: PlaybackSessionContextValue['playItemById'];
  resume: PlaybackSessionContextValue['resume'];
  switchEnclosureSelectedParams: PlaybackSessionContextValue['switchEnclosureSelectedParams'];
}

/** High-frequency playhead. Prefer mounting consumers only for the active now-playing chrome. */
export type PlaybackProgressContextValue = {
  durationSeconds: number;
  positionSeconds: number;
};

const PlaybackSessionContext = createContext<PlaybackSessionContextValue | undefined>(undefined);
const PlaybackRowContext = createContext<PlaybackRowContextValue | undefined>(undefined);
const PlaybackIsPlayingContext = createContext<boolean | undefined>(undefined);

const summaryFromItem = (item: DTOItem, channel: DTOChannel): PlaybackNowPlaying => ({
  channelTitle: channel.title ?? null,
  imageUrl: primaryListArtworkUrl(item.item_images, channel.channel_images),
  title: item.title ?? '',
  viewerImageUrl: primaryLightboxArtworkUrl(item.item_images, channel.channel_images),
});

// Module-level guard so the last-playback restore fires at most once per app process.
let lastPlaybackRestoreStarted = false;
/** True after the once-per-process snapshot restore has finished (including a null snapshot). */
let lastPlaybackRestoreSettled = false;

/** Ended livestream queue heads one adopt moves to History before it stops with an empty player. */
const RESTORED_QUEUE_HEAD_RETIRE_LIMIT = 3;

/** How long a start-play latch stays up after `playing` so a startup `paused` cannot flash the play icon. */
const START_PLAY_SETTLE_MS = 300;

/** While a livestream is paused, how often the provider re-reads its window from the engine. */
const LIVE_PAUSED_WINDOW_REFRESH_MS = 1000;

/**
 * How long a start-play latch can stay up if `playing` never arrives. Past this, a later pause
 * (lock screen, another device) is a real pause and must show the play glyph.
 */
const PENDING_START_MAX_MS = 5000;

export function PlaybackProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeQueue, queues, setActiveQueue, activeQueueUpcomingResources } = useQueues();
  const loadActive = useQueueResourcesLoadActive();
  const queueDataRevision = useQueueDataRevision();
  const { moveNowPlayingToHistory } = useQueueMutations();
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
  const [isAuthoringHold, setIsAuthoringHold] = useState(false);
  /** Rate sent to the engine for the current target. Music is always 1. */
  const playbackRateRef = useRef<number>(1);
  /** Rate the listener chose for spoken word and video. Music leaves it untouched. */
  const audioVideoRateRef = useRef<number>(1);
  /** Position of a seek the engine has not reported yet; earlier samples are ignored. */
  const pendingSeekSecondsRef = useRef<number | null>(null);
  const pendingSeekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancingRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const lastSourceUrlRef = useRef<string | null>(null);
  /** Identity of the item the native engine last loaded (`meta.idText`), if any. */
  const engineSourceIdTextRef = useRef<string | null>(null);
  /** An adopted engine source still showing partial data, filled in when a fetch can succeed. */
  const pendingAdoptionEnrichmentRef = useRef<MediaEngineSourceMeta | null>(null);
  /** Last failure written to the error log. Cleared once playback actually runs again. */
  const lastLoggedPlaybackErrorRef = useRef<string | null>(null);
  /** Claimed while a download-complete source swap is in flight, including the file-exists check. */
  const downloadSourceSwapLockRef = useRef(false);
  /** Drop playhead samples until the replacement item has seeked near the captured position. */
  const downloadSourceSwapSuppressProgressRef = useRef(false);
  const downloadSourceSwapSawReadyRef = useRef(false);
  const downloadSourceSwapSeekSecondsRef = useRef<number | null>(null);
  const downloadSourceSwapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the engine has reported the current source playable. Gates the transport spinner: it
  // means "cannot start yet", never "buffering again mid-episode".
  const sourcePlayableRef = useRef<boolean>(false);
  // A start-play load owns the glyph until it settles. The load sets pause; startup engine beats
  // must not move it. The latch drops after `playing`, on error, or after a max wait.
  const pendingStartRef = useRef<boolean>(false);
  const startHasPlayedRef = useRef<boolean>(false);
  const latestEngineStateRef = useRef<PlaybackStateValue | null>(null);
  const pendingStartSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPlaybackSnapshotWriteRef = useRef<number>(0);
  const enclosureSelectedParamsRef = useRef<EnclosureSelectedParams>(
    DEFAULT_ENCLOSURE_SELECTED_PARAMS
  );
  const previousAuthStatusRef = useRef(status);
  /** One failed/attempted adopt per resource so a missing enclosure does not spin. */
  const queueHeadAdoptAttemptedRef = useRef<string | null>(null);
  /** Queue that still needs a promote write after an offline adopt. */
  const pendingPromoteQueueIdTextRef = useRef<string | null>(null);
  const queueHeadAdoptInFlightRef = useRef(false);
  const lastPlaybackLocalWriteRef = useRef<number>(0);
  const lastPlaybackNetworkWriteRef = useRef<number>(0);
  const lastSeekNetworkPostAtRef = useRef<number | null>(null);
  const seekNetworkFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const accountIdTextRef = useRef<string | null>(account?.id_text ?? null);
  const playbackHandoffPromptRef = useRef<PlaybackHandoffPromptState | null>(null);
  const playbackHandoffDismissedStateKeyRef = useRef<string | null>(null);
  /** Tells cross-device playback about a seek or rate change; `useCrossDevicePlayback` assigns it. */
  const crossDeviceLocalChangeRef = useRef<(kind: LocalPlaybackChangeKind) => void>(() => {});
  /** A commanded start this phone has not yet compared with its own engine duration. */
  const commandedStartGuardRef = useRef<ArmedCommandedStart | null>(null);
  /** `seekTo`, for the native handlers registered above its definition. */
  const seekToRef = useRef<(seconds: number) => void>(() => {});

  /**
   * Write a playback failure to the error log. The dialog that shows it closes, and the media comes
   * from the creator's host, so this row is what lets support say whose server failed.
   */
  const recordPlaybackError = useCallback(
    (error: PlaybackErrorEvent, target: PlaybackTarget | null, url: string | null) => {
      const entry = buildPlaybackErrorLog({
        credentialsState: addByRssCredentialsStateForUrl(url),
        error,
        isLocalFile: playbackSourceMarkerFromUrl(url) === 'local',
        mediaUrl: url,
        occurredAt: Date.now(),
        positionSeconds: positionRef.current,
        target,
      });
      const signature = playbackErrorLogSignature(entry);
      if (lastLoggedPlaybackErrorRef.current === signature) {
        return;
      }
      lastLoggedPlaybackErrorRef.current = signature;
      void syncEventLogRepository.append(entry);
    },
    []
  );

  useEffect(() => {
    void nativePlaybackBridge.setJsOwnsAdvance(true);
    return () => {
      void nativePlaybackBridge.setJsOwnsAdvance(false);
    };
  }, []);

  useEffect(() => {
    attachCarPlayConnectSyncListener();
  }, []);

  const activeQueueRef = useRef(activeQueue);
  useEffect(() => {
    activeQueueRef.current = activeQueue;
  }, [activeQueue]);
  const queuesRef = useRef(queues);
  useEffect(() => {
    queuesRef.current = queues;
  }, [queues]);
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
  const buildContextRef = useRef(buildContext);
  useEffect(() => {
    buildContextRef.current = buildContext;
  }, [buildContext]);
  const readBuildContext = useCallback(
    (): MobileAuthRequestContext => buildContextRef.current(),
    []
  );

  const { autoQueueActiveRow, autoQueueResources } = useAutoQueue();
  const {
    applyAutoQueueDirective,
    autoQueueRefs,
    invalidateAutoQueueFill,
    isAutoQueueExhaustedRef,
    refillAutoQueueAhead,
    resolvePreviousTrackStep,
    toggleRepeat,
    toggleShuffle,
    writeAutoQueueState,
  } = useAutoQueueFill({ activeTargetRef, buildContext: readBuildContext });
  const { autoQueueActiveRowRef, autoQueueConfigRef, autoQueueResourcesRef } = autoQueueRefs;
  const {
    addByRssFeedWalk,
    clearAddByRssFeedWalk,
    ensureAddByRssFeedWalk,
    hasAddByRssNext,
    readHasAddByRssNext,
    resolveAddByRssAdjacentEntry,
  } = useAddByRssFeedWalk({ activeTargetRef });
  useNativeAdvanceWindow({ activeTarget, addByRssFeedWalk });

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

  useEffect(() => {
    return () => {
      if (seekNetworkFlushTimerRef.current !== null) {
        clearTimeout(seekNetworkFlushTimerRef.current);
        seekNetworkFlushTimerRef.current = null;
      }
      if (pendingStartSettleTimerRef.current !== null) {
        clearTimeout(pendingStartSettleTimerRef.current);
        pendingStartSettleTimerRef.current = null;
      }
      if (pendingSeekTimeoutRef.current !== null) {
        clearTimeout(pendingSeekTimeoutRef.current);
        pendingSeekTimeoutRef.current = null;
      }
    };
  }, []);

  const setPlaybackPlaying = useCallback((playing: boolean): void => {
    isPlayingRef.current = playing;
    writeIsPlayingLocallyForSync(playing);
    setPlaybackProgressPlaying(playing);
    setIsPlaying(playing);
  }, []);

  const clearSeekHold = useCallback((): void => {
    pendingSeekSecondsRef.current = null;
    if (pendingSeekTimeoutRef.current !== null) {
      clearTimeout(pendingSeekTimeoutRef.current);
      pendingSeekTimeoutRef.current = null;
    }
  }, []);

  const holdSeekPosition = useCallback((seconds: number): void => {
    pendingSeekSecondsRef.current = seconds;
    if (pendingSeekTimeoutRef.current !== null) {
      clearTimeout(pendingSeekTimeoutRef.current);
    }
    pendingSeekTimeoutRef.current = setTimeout(() => {
      pendingSeekTimeoutRef.current = null;
      pendingSeekSecondsRef.current = null;
    }, SEEK_HOLD_MAX_MS);
  }, []);

  /**
   * True while a native position still describes the playhead from before a seek. A sample near
   * the seek releases the hold and is applied.
   */
  const isPositionHeldBySeek = useCallback(
    (positionSeconds: number): boolean => {
      const seekSeconds = pendingSeekSecondsRef.current;
      if (seekSeconds === null) {
        return false;
      }
      if (isSeekHoldSampleLanded({ positionSeconds, seekSeconds })) {
        clearSeekHold();
        return false;
      }
      return true;
    },
    [clearSeekHold]
  );

  /**
   * Point the session at the rate this target plays at: 1 for music, otherwise the listener's
   * spoken-word and video rate. The stored rate survives a music item, so the next episode picks
   * it back up. Callers send the returned rate to the engine.
   */
  const applyEffectiveRateForTarget = useCallback((target: PlaybackTarget | null): number => {
    const rate = isMusicPlaybackTarget(target) ? 1 : audioVideoRateRef.current;
    playbackRateRef.current = rate;
    setPlaybackProgressRate(rate);
    setPlaybackRate(rate);
    return rate;
  }, []);

  const releasePendingStart = useCallback((): void => {
    pendingStartRef.current = false;
    startHasPlayedRef.current = false;
    if (pendingStartSettleTimerRef.current !== null) {
      clearTimeout(pendingStartSettleTimerRef.current);
      pendingStartSettleTimerRef.current = null;
    }
  }, []);

  const schedulePendingStartRelease = useCallback(
    (delayMs: number): void => {
      if (pendingStartSettleTimerRef.current !== null) {
        clearTimeout(pendingStartSettleTimerRef.current);
      }
      pendingStartSettleTimerRef.current = setTimeout(() => {
        pendingStartSettleTimerRef.current = null;
        if (!pendingStartRef.current) {
          return;
        }
        const startHasPlayed = startHasPlayedRef.current;
        pendingStartRef.current = false;
        startHasPlayedRef.current = false;
        const latest = latestEngineStateRef.current;
        // A pause that is still the latest state after playback started falls back to the play glyph.
        // A start that never reported playing keeps the glyph the load already chose.
        if (startHasPlayed && (latest === 'paused' || latest === 'ended')) {
          setPlaybackPlaying(false);
          setTransportState('paused');
        }
      }, delayMs);
    },
    [setPlaybackPlaying]
  );

  const armPendingStart = useCallback((): void => {
    startHasPlayedRef.current = false;
    pendingStartRef.current = true;
    schedulePendingStartRelease(PENDING_START_MAX_MS);
  }, [schedulePendingStartRelease]);

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

  const listenSessionRef = useRef<ListenSessionTracker | null>(null);
  const getListenSession = useCallback((): ListenSessionTracker => {
    if (listenSessionRef.current === null) {
      listenSessionRef.current = createListenSessionTracker({
        now: () => Date.now(),
        createClientListenId: createUuid,
        onReport: (report: ListenSessionReport) => {
          if (statusRef.current !== 'authenticated') {
            return;
          }
          const account = accountRef.current;
          if (account === null || shouldSkipListenStatsForAccount(account)) {
            return;
          }
          void statsRepository.recordListen(buildContextRef.current(), account.id_text, report);
        },
      });
    }
    return listenSessionRef.current;
  }, []);

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
        if (target === null) {
          return false;
        }

        const resource = nowPlayingResourceFromTarget(target);
        if (resource === null) {
          return false;
        }

        const mediumId = playbackMediumIdFromTarget(target);
        const queueFromList = getQueueForMedium(queuesRef.current, mediumId);
        const queueFromActive =
          activeQueueRef.current === null
            ? null
            : getQueueForMedium([activeQueueRef.current], mediumId);
        let queue = queueFromList ?? queueFromActive;
        if (queue === null) {
          const loaded = await loadActive(mediumId);
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
          payload: playbackEventPayloadForTarget(target, params.payload),
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

        // A forced network post (play/pause/complete/leading seek) supersedes a pending trailing
        // seek flush — the newer claim already carries the latest position the listener needs.
        if (seekNetworkFlushTimerRef.current !== null) {
          clearTimeout(seekNetworkFlushTimerRef.current);
          seekNetworkFlushTimerRef.current = null;
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

  const beginAuthoringHold = useCallback((): void => {
    authoringHoldRef.current = true;
    setIsAuthoringHold(true);
  }, []);

  const endAuthoringHold = useCallback((): void => {
    authoringHoldRef.current = false;
    setIsAuthoringHold(false);
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

  const clearDownloadSourceSwap = useCallback((): void => {
    downloadSourceSwapLockRef.current = false;
    downloadSourceSwapSuppressProgressRef.current = false;
    downloadSourceSwapSawReadyRef.current = false;
    downloadSourceSwapSeekSecondsRef.current = null;
    if (downloadSourceSwapTimeoutRef.current !== null) {
      clearTimeout(downloadSourceSwapTimeoutRef.current);
      downloadSourceSwapTimeoutRef.current = null;
    }
  }, []);

  const clearNowPlaying = useCallback(() => {
    nativePlaybackBridge.pause();
    pauseAtRef.current = null;
    getListenSession().end();
    activeTargetRef.current = null;
    invalidateAutoQueueFill();
    clearAddByRssFeedWalk();
    clearDownloadSourceSwap();
    clearSeekHold();
    commandedStartGuardRef.current = null;
    lastSourceUrlRef.current = null;
    setPlaybackSourceMarker(null);
    sourcePlayableRef.current = false;
    releasePendingStart();
    positionRef.current = 0;
    durationRef.current = 0;
    resetPlaybackProgress();
    resetLivePlayback();
    setActiveTarget(null);
    setNowPlaying(null);
    setPlaybackPlaying(false);
    setTransportState('paused');
    resetEnclosureSelectionSession();
    void clearLastPlaybackSnapshot();
  }, [
    clearAddByRssFeedWalk,
    clearDownloadSourceSwap,
    clearSeekHold,
    getListenSession,
    invalidateAutoQueueFill,
    releasePendingStart,
    resetEnclosureSelectionSession,
    setPlaybackPlaying,
  ]);

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
        /**
         * A position another device asked for. Used as given, without the near-end or music
         * start rules, and clamped to this phone's own file end once the engine knows it.
         */
        commandedStartSeconds?: number;
      }
    ): Promise<boolean> => {
      setNoticeKey(null);
      if (target.kind === 'add-by-rss') {
        resetEnclosureSelectionSession();
      }
      clearDownloadSourceSwap();
      clearSeekHold();
      commandedStartGuardRef.current = null;
      lastSourceUrlRef.current = params.url;
      setPlaybackSourceMarker(params.url);
      sourcePlayableRef.current = false;
      latestEngineStateRef.current = null;
      const effectiveRate = applyEffectiveRateForTarget(target);
      // Arm before the native load so startup `ready` / `paused` / `stalled` cannot move the glyph
      // before this function sets pause.
      const expectsAutoPlay = params.autoPlayOverride !== false;
      if (expectsAutoPlay) {
        armPendingStart();
      } else {
        releasePendingStart();
      }
      setTransportState('loading');
      const commandedStartSeconds =
        params.commandedStartSeconds !== undefined && !isLivePlaybackTarget(target)
          ? params.commandedStartSeconds
          : undefined;
      if (commandedStartSeconds !== undefined) {
        commandedStartGuardRef.current = {
          guard: createCommandedStartGuard(commandedStartSeconds),
          targetMediaId: playbackTargetRowMediaId(target),
        };
      }
      let decision: PlaybackLoadDecision;
      try {
        decision = await applyLoad(
          {
            explicitPlaybackSeconds: params.explicitPlaybackSeconds,
            mediaFileDurationHintSeconds: params.mediaFileDurationHintSeconds,
            target,
          },
          params.url,
          effectiveRate,
          params.autoPlayOverride,
          params.playbackDecisionOverride ??
            (commandedStartSeconds === undefined
              ? undefined
              : commandedStartDecision(target, commandedStartSeconds))
        );
      } catch (error) {
        commandedStartGuardRef.current = null;
        releasePendingStart();
        const failure = playbackErrorFromLoadFailure(error);
        recordPlaybackError(failure, target, params.url);
        setLastPlaybackError(failure);
        setTransportState('error');
        const failedStartSeconds =
          params.explicitPlaybackSeconds !== undefined && !isLivePlaybackTarget(target)
            ? params.explicitPlaybackSeconds
            : 0;
        positionRef.current = failedStartSeconds;
        durationRef.current = resolveLoadDurationSeconds({
          hintSeconds: params.mediaFileDurationHintSeconds,
          isLive: isLivePlaybackTarget(target),
        });
        clearSeekHold();
        setPlaybackProgress({
          durationSeconds: durationRef.current,
          positionSeconds: failedStartSeconds,
        });
        resetLivePlayback();
        activeTargetRef.current = target;
        setActiveTarget(target);
        setNowPlaying(params.summary);
        setPlaybackPlaying(false);
        getListenSession().end();
        return false;
      }
      applyAutoQueueDirective(params.autoQueue);
      pauseAtRef.current = decision.pauseAtSeconds ?? null;
      getListenSession().load({
        directive: decision.listenSession,
        target: listenSessionTargetFromPlaybackTarget(target),
        mediaDurationSeconds:
          params.mediaFileDurationHintSeconds !== undefined &&
          params.mediaFileDurationHintSeconds > 0
            ? params.mediaFileDurationHintSeconds
            : null,
      });
      activeTargetRef.current = target;
      // The fill seeds from `activeTargetRef`, so it starts only once the ref names this target.
      // Never awaited: load latency and first paint do not wait on the network.
      void refillAutoQueueAhead();
      // The Add by RSS walk is rebuilt from the item now loaded; any other item leaves the feed.
      if (target.kind === 'add-by-rss') {
        void ensureAddByRssFeedWalk();
      } else {
        clearAddByRssFeedWalk();
      }
      positionRef.current = decision.initialSeekSeconds;
      durationRef.current = resolveLoadDurationSeconds({
        hintSeconds: params.mediaFileDurationHintSeconds,
        isLive: isLivePlaybackTarget(target),
      });
      const shouldAutoPlay = params.autoPlayOverride ?? decision.shouldAutoPlay;
      resetLivePlayback();
      setActiveTarget(target);
      setNowPlaying(params.summary);
      setPlaybackProgress({
        durationSeconds: durationRef.current,
        positionSeconds: decision.initialSeekSeconds,
      });
      if (shouldAutoPlay) {
        // The load was issued. The glyph becomes pause here; an error that already arrived released
        // the latch, so this does not overwrite it.
        if (pendingStartRef.current) {
          sourcePlayableRef.current = true;
          setLastPlaybackError(null);
          setPlaybackPlaying(true);
          setTransportState('playing');
        }
      } else {
        releasePendingStart();
        sourcePlayableRef.current = true;
        setLastPlaybackError(null);
        setPlaybackPlaying(false);
        setTransportState('paused');
      }

      if (shouldAutoPlay && params.shouldSkipPlayEventWrite !== true) {
        await writePlaybackEvent({
          eventKind: playbackEventFromDiscreteSignal('play'),
          forceNetwork: true,
          isPlaying: true,
          mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
          playbackPositionSeconds: decision.initialSeekSeconds,
        });
      }
      writeLastPlaybackSnapshotForTarget(target, decision.initialSeekSeconds);
      return true;
    },
    [
      applyAutoQueueDirective,
      applyEffectiveRateForTarget,
      applyLoad,
      armPendingStart,
      clearAddByRssFeedWalk,
      clearDownloadSourceSwap,
      clearSeekHold,
      ensureAddByRssFeedWalk,
      getListenSession,
      recordPlaybackError,
      refillAutoQueueAhead,
      releasePendingStart,
      resetEnclosureSelectionSession,
      setPlaybackPlaying,
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
        commandedStartSeconds?: number;
      }
    ): Promise<boolean> => {
      const { labeledItemEnclosures, selectedParams } = await resolvePlaybackSelectionForItem(item);
      const url = await resolvePlaybackUrl(item, selectedParams, labeledItemEnclosures);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return false;
      }
      const start = resolveItemPlaybackStart({
        channel,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        intent: options.intent,
        item,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          options.mediaFileDurationHintSeconds,
          item.item_about?.duration
        ),
      });
      return playTarget(start.target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        commandedStartSeconds: options.commandedStartSeconds,
        explicitPlaybackSeconds: start.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: start.mediaFileDurationHintSeconds,
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
        commandedStartSeconds?: number;
      }
    ): Promise<boolean> => {
      const { labeledItemEnclosures, selectedParams } = await resolvePlaybackSelectionForItem(item);
      const url = await resolvePlaybackUrl(item, selectedParams, labeledItemEnclosures);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return false;
      }
      const target = buildClipPlaybackTarget(clip, item, channel);
      return playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        commandedStartSeconds: options.commandedStartSeconds,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          options.mediaFileDurationHintSeconds,
          item.item_about?.duration
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
        commandedStartSeconds?: number;
      }
    ): Promise<boolean> => {
      const { labeledItemEnclosures, selectedParams } = await resolvePlaybackSelectionForItem(item);
      const url = await resolvePlaybackUrl(item, selectedParams, labeledItemEnclosures);
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return false;
      }
      const target = buildSoundbitePlaybackTarget(soundbite, item, channel);
      return playTarget(target, {
        autoPlayOverride: options.autoPlayOverride,
        autoQueue: options.autoQueue,
        commandedStartSeconds: options.commandedStartSeconds,
        explicitPlaybackSeconds: options.explicitPlaybackSeconds,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          options.mediaFileDurationHintSeconds,
          item.item_about?.duration
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
      options?: { intent?: MusicItemPlaybackIntent; explicitPlaybackSeconds?: number }
    ): Promise<void> => {
      await startItemPlayback(item, channel, {
        autoQueue: { mode: 'clear' },
        explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
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
          item.item_about?.duration
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
          item.item_about?.duration
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

      const remoteUrl = resolveItemEnclosureUrl({
        labeledItemEnclosures: itemLabeledEnclosures,
        selectedParams: nextParams,
      });
      const resolved = await resolvePlaybackUrl(target.item, nextParams, itemLabeledEnclosures);
      const record = downloadStore.get(target.item.id_text);
      const documentDirectory = FileSystem.documentDirectory;
      const handoffRecord =
        record === null || documentDirectory === null
          ? record
          : resolveDownloadHandoffRecord(record, documentDirectory);
      const localMatchesSelection =
        remoteUrl !== null &&
        resolved !== null &&
        resolved.startsWith('file://') &&
        handoffRecord !== null &&
        planDownloadCompletePlaybackHandoff({
          advancing: false,
          lastSourceUrl: remoteUrl,
          record: handoffRecord,
          rewriteEnclosureUrl: resolveE2eMediaUrl,
          target,
        }) !== null;
      let nextUrl: string;
      if (localMatchesSelection && resolved !== null) {
        nextUrl = resolved;
      } else if (remoteUrl !== null && !isOfflineModeEnabled()) {
        nextUrl = remoteUrl;
      } else {
        setNoticeKey('media_player.no_media');
        return;
      }

      await playTarget(target, {
        autoPlayOverride: isPlayingRef.current,
        autoQueue: { mode: 'preserve' },
        explicitPlaybackSeconds: decision.initialSeekSeconds,
        mediaFileDurationHintSeconds: resolveMediaFileDurationHintSeconds(
          undefined,
          target.item.item_about?.duration
        ),
        playbackDecisionOverride: decision,
        shouldSkipPlayEventWrite: true,
        summary: summaryFromItem(target.item, target.channel),
        url: nextUrl,
      });
    },
    [itemLabeledEnclosures, playTarget, setEnclosureSelectedParams]
  );

  const reloadActiveSource = useCallback(
    async (localUrl: string): Promise<void> => {
      const sourceUrlBeforeSwap = lastSourceUrlRef.current;
      const itemIdBeforeSwap = itemIdFromTarget(activeTargetRef.current);
      const wasPlaying = isPlayingRef.current;
      let nativePosition: number | null = null;
      try {
        const read = await nativePlaybackBridge.getPosition();
        if (Number.isFinite(read) && read >= 0) {
          nativePosition = read;
        }
      } catch {
        // The last progress sample is the playhead when the engine read fails.
      }

      if (
        !downloadSourceSwapLockRef.current ||
        lastSourceUrlRef.current !== sourceUrlBeforeSwap ||
        itemIdFromTarget(activeTargetRef.current) !== itemIdBeforeSwap
      ) {
        downloadSourceSwapLockRef.current = false;
        return;
      }

      const position = nativePosition ?? positionRef.current;
      positionRef.current = position;

      downloadSourceSwapSawReadyRef.current = false;
      downloadSourceSwapSeekSecondsRef.current = position;
      downloadSourceSwapSuppressProgressRef.current = true;
      if (downloadSourceSwapTimeoutRef.current !== null) {
        clearTimeout(downloadSourceSwapTimeoutRef.current);
      }
      downloadSourceSwapTimeoutRef.current = setTimeout(() => {
        // The handoff window ended. Drop the start-play latch so a pause that stuck can show play.
        releasePendingStart();
        clearDownloadSourceSwap();
      }, DOWNLOAD_HANDOFF_PROGRESS_SUPPRESS_MS);

      lastSourceUrlRef.current = localUrl;
      setPlaybackSourceMarker(localUrl);
      try {
        const source = playbackReloadSource(activeTargetRef.current, localUrl, position);
        if (wasPlaying) {
          armPendingStart();
          await nativePlaybackBridge.loadAndStart(source);
        } else {
          releasePendingStart();
          await nativePlaybackBridge.load(source);
          nativePlaybackBridge.pause();
        }
        nativePlaybackBridge.setRate(playbackRateRef.current);
      } catch (error) {
        releasePendingStart();
        clearDownloadSourceSwap();
        const failure = playbackErrorFromLoadFailure(error);
        recordPlaybackError(failure, activeTargetRef.current, localUrl);
        setLastPlaybackError(failure);
        setPlaybackPlaying(false);
        setTransportState('error');
      }
    },
    [
      armPendingStart,
      clearDownloadSourceSwap,
      recordPlaybackError,
      releasePendingStart,
      setPlaybackPlaying,
    ]
  );

  const adoptCompletedDownloadIfStreaming = useCallback(async (): Promise<void> => {
    if (downloadSourceSwapLockRef.current || advancingRef.current) {
      return;
    }
    const target = activeTargetRef.current;
    const itemIdText = itemIdFromTarget(target);
    if (target === null || itemIdText === null) {
      return;
    }
    const record = downloadStore.get(itemIdText);
    if (record === null) {
      return;
    }
    const documentDirectory = FileSystem.documentDirectory;
    if (documentDirectory === null) {
      return;
    }
    const sourceUrlAtDecision = lastSourceUrlRef.current;
    const handoff = planDownloadCompletePlaybackHandoff({
      advancing: advancingRef.current,
      lastSourceUrl: sourceUrlAtDecision,
      record: resolveDownloadHandoffRecord(record, documentDirectory),
      rewriteEnclosureUrl: resolveE2eMediaUrl,
      target,
    });
    if (handoff === null) {
      return;
    }

    downloadSourceSwapLockRef.current = true;
    let exists: boolean;
    try {
      const info = await FileSystem.getInfoAsync(handoff.localUrl);
      exists = info.exists;
    } catch {
      exists = false;
    }
    if (!exists) {
      downloadSourceSwapLockRef.current = false;
      try {
        await downloadManager.markFileMissing(itemIdText);
      } catch {
        // The row stays complete until a later play resolves the missing file.
      }
      return;
    }
    if (
      advancingRef.current ||
      itemIdFromTarget(activeTargetRef.current) !== itemIdText ||
      lastSourceUrlRef.current !== sourceUrlAtDecision
    ) {
      downloadSourceSwapLockRef.current = false;
      return;
    }
    await reloadActiveSource(handoff.localUrl);
  }, [reloadActiveSource]);

  useEffect(() => {
    return downloadStore.subscribe(() => {
      void adoptCompletedDownloadIfStreaming();
    });
  }, [adoptCompletedDownloadIfStreaming]);

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
        if (item === null || item === undefined) {
          setNoticeKey('media_player.no_media');
          return;
        }
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

  /**
   * A finished download plays from the device when the caller names it, and with Offline Mode on
   * there is no remote fallback.
   */
  const startAddByRssPlayback = useCallback(
    async (
      resourceData: AddByRSSResourceData,
      options: {
        autoPlayOverride?: boolean;
        autoQueue: AutoQueueDirective;
        explicitPlaybackSeconds?: number;
        localDownloadItemIdText?: string;
        commandedStartSeconds?: number;
      }
    ): Promise<boolean> => {
      const localUrl =
        options.localDownloadItemIdText !== undefined
          ? await resolveLocalDownloadPlaybackUrl(options.localDownloadItemIdText)
          : null;
      const url =
        localUrl ?? (isOfflineModeEnabled() ? null : resolveAddByRssPlaybackUrl(resourceData));
      if (url === null) {
        setNoticeKey('media_player.no_media');
        return false;
      }
      return playTarget(
        {
          kind: 'add-by-rss',
          resourceData,
        },
        {
          autoPlayOverride: options.autoPlayOverride,
          autoQueue: options.autoQueue,
          commandedStartSeconds: options.commandedStartSeconds,
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
      options?: { explicitPlaybackSeconds?: number; localDownloadItemIdText?: string }
    ): Promise<void> => {
      await startAddByRssPlayback(resourceData, {
        autoQueue: { mode: 'clear' },
        explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        localDownloadItemIdText: options?.localDownloadItemIdText,
      });
    },
    [startAddByRssPlayback]
  );

  /** Plays the feed neighbor of the Add by RSS item; true when the playing target changed. */
  const playAddByRssFeedEntry = useCallback(
    async (entry: AddByRssFeedPlayEntry): Promise<boolean> => {
      const targetBefore = activeTargetRef.current;
      await startAddByRssPlayback(entry.resourceData, {
        autoQueue: { mode: 'clear' },
        localDownloadItemIdText: entry.localDownloadItemIdText,
      });
      return activeTargetRef.current !== null && activeTargetRef.current !== targetBefore;
    },
    [startAddByRssPlayback]
  );

  /**
   * Starts a resource another device asked this phone to play, through the start functions an
   * explicit tap uses. A start position is used as given and clamped to this phone's file end; a
   * null start is an ordinary explicit play. An Add by RSS resource without carried data is found in
   * this phone's own feeds, then in the now-playing rows the previous device wrote to the queues.
   * `load_paused` loads without playing and leaves the auto-queue alone, so it writes no playback
   * event.
   */
  const playResourceForCrossDevice = useCallback(
    async (
      params: {
        ref: DTOPlaybackResourceRef;
        addByRssResourceData: AddByRSSResourceData | null;
        startSeconds: number | null;
      },
      mode: 'play' | 'load_paused'
    ): Promise<LocalPlaybackStartResult> => {
      const autoQueue: AutoQueueDirective =
        mode === 'play' ? { mode: 'clear' } : { mode: 'preserve' };
      const startSeconds = params.startSeconds ?? undefined;
      const startOptions = {
        autoPlayOverride: mode === 'play',
        autoQueue,
        commandedStartSeconds: startSeconds,
        explicitPlaybackSeconds: startSeconds,
      };
      const toResult = (started: boolean): LocalPlaybackStartResult =>
        started ? 'started' : 'failed';
      const { ref } = params;
      try {
        switch (ref.kind) {
          case 'item': {
            const item = await playbackContentRepository.getItemByIdText(
              buildContext(),
              ref.item_id_text
            );
            const channel = await ensureChannel(item);
            if (channel === null) {
              return 'failed';
            }
            return toResult(
              await startItemPlayback(item, channel, { ...startOptions, intent: 'explicit_play' })
            );
          }
          case 'clip': {
            const clip = await playbackContentRepository.getClipByIdText(
              buildContext(),
              ref.clip_id_text
            );
            const item = clip.item;
            if (item === null || item === undefined) {
              return 'failed';
            }
            const channel = await ensureChannel(item);
            if (channel === null) {
              return 'failed';
            }
            return toResult(await startClipPlayback(clip, item, channel, startOptions));
          }
          case 'soundbite': {
            const soundbite = await playbackContentRepository.getSoundbiteByIdText(
              buildContext(),
              ref.item_soundbite_id_text
            );
            const item = soundbite.item;
            if (item === null || item === undefined) {
              return 'failed';
            }
            const channel = await ensureChannel(item);
            if (channel === null) {
              return 'failed';
            }
            return toResult(await startSoundbitePlayback(soundbite, item, channel, startOptions));
          }
          case 'add_by_rss': {
            const hashId = ref.add_by_rss_hash_id;
            let resourceData =
              params.addByRssResourceData ??
              (await findLocalAddByRssResourceDataByHash(hashId, addByRssRepository));
            if (resourceData === null) {
              const context = buildContext();
              for (const queue of await queueRepository.getQueues(context)) {
                const nowPlayingRow = await queueRepository.getNowPlaying(context, queue.id_text, {
                  skipCache: true,
                });
                if (
                  nowPlayingRow?.add_by_rss_hash_id === hashId &&
                  isAddByRssResourceData(nowPlayingRow.add_by_rss_resource_data)
                ) {
                  resourceData = nowPlayingRow.add_by_rss_resource_data;
                  break;
                }
              }
            }
            if (resourceData === null) {
              return 'failed';
            }
            const localData = await resolveLocalAddByRssResourceData(
              resourceData,
              addByRssRepository
            );
            return toResult(await startAddByRssPlayback(localData, startOptions));
          }
          default: {
            const unexpected: never = ref;
            return unexpected;
          }
        }
      } catch (error) {
        console.warn('[playback] cross-device start failed', { kind: ref.kind, error });
        return 'failed';
      }
    },
    [
      buildContext,
      ensureChannel,
      startAddByRssPlayback,
      startClipPlayback,
      startItemPlayback,
      startSoundbitePlayback,
    ]
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
        const resourceData = await resolveLocalAddByRssResourceData(
          resource.add_by_rss_resource_data,
          addByRssRepository
        );
        await startAddByRssPlayback(resourceData, {
          autoPlayOverride: options?.autoPlayOverride,
          autoQueue,
          explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        });
        return;
      }
      if (resource.clip) {
        const clipItem = resource.clip.item;
        if (clipItem === null || clipItem === undefined) {
          return;
        }
        const item = await playbackContentRepository.ensureItemValues(buildContext(), clipItem);
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
        const item = await playbackContentRepository.ensureItemValues(
          buildContext(),
          resource.item_soundbite.item
        );
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
      const item = await playbackContentRepository.ensureItemValues(buildContext(), resource.item);
      const channel = await ensureChannel(item);
      if (channel === null) {
        return;
      }
      await startItemPlayback(item, channel, {
        autoPlayOverride: options?.autoPlayOverride,
        autoQueue,
        explicitPlaybackSeconds: options?.explicitPlaybackSeconds,
        intent,
      });
    },
    [
      buildContext,
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
        'queueIdText' | 'resourceIdText' | 'resourceKind'
      >
    ): Promise<string> => {
      if (
        isLoadedReconcileResource(activeTargetRef.current, state) &&
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
        if (state.resourceKind === 'add_by_rss') {
          const accountIdText = await resolveAuthenticatedAccountIdText();
          const resourceData =
            accountIdText === null
              ? null
              : await playbackOutboxRepository.getPendingAddByRssResourceData({
                  accountIdText,
                  queueIdText: state.queueIdText,
                  resourceIdText: state.resourceIdText,
                });
          const title = addByRssResourceDataTitle(resourceData);
          if (title !== null) {
            return title;
          }
        }
      } catch {
        // Best-effort title hydration for prompt copy.
      }

      // An Add by RSS id is a hash; the prompt names the feature instead.
      return state.resourceKind === 'add_by_rss'
        ? t('features.add_by_rss.label')
        : state.resourceIdText;
    },
    [buildContext, resolveAuthenticatedAccountIdText, t]
  );

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

    // Record the remote episode before closing the prompt. The reconcile conflict is still
    // the previous episode until this play lands, and that conflict would open the dialog again.
    rememberPlaybackHandoffDismissal(prompt.dismissedStateKey);
    setPlaybackHandoffPrompt(null);
    if (isPlayingRef.current) {
      return;
    }

    void playQueueResource(prompt.remoteResource, 'explicit_play', {
      autoPlayOverride: true,
      explicitPlaybackSeconds: normalizePlaybackPosition(prompt.remoteResource.playback_position),
    });
  }, [playQueueResource, rememberPlaybackHandoffDismissal]);

  /**
   * Loads an auto-queue row. Defaults to a move within the buffer (`preserve`, a fresh
   * transition); a Previous that leaves the buffer passes its own directive and intent.
   */
  const playAutoQueueRow = useCallback(
    async (
      row: AutoQueueResourcesMapRow,
      options?: {
        autoQueue: AutoQueueDirective;
        intent: Extract<MusicItemPlaybackIntent, 'fresh_transition' | 'explicit_play'>;
      }
    ): Promise<boolean> => {
      const autoQueue: AutoQueueDirective = options?.autoQueue ?? { mode: 'preserve' };
      const intent = options?.intent ?? 'fresh_transition';
      if (row.clip) {
        const item = row.clip.item;
        if (item === null || item === undefined) {
          return false;
        }
        const channel = row.channel ?? (await ensureChannel(item));
        if (channel === null) {
          return false;
        }
        await startClipPlayback(row.clip, item, channel, { autoQueue });
        return true;
      }
      if (row.item_soundbite && row.item_soundbite.item) {
        const item = row.item_soundbite.item;
        const channel = row.channel ?? (await ensureChannel(item));
        if (channel === null) {
          return false;
        }
        await startSoundbitePlayback(row.item_soundbite, item, channel, { autoQueue });
        return true;
      }
      // Item rows carry the slim `DTOItemQueueItem`; fetch the full item for enclosures.
      await playItemByIdWithIntent(row.item.id_text, intent, autoQueue);
      return true;
    },
    [ensureChannel, playItemByIdWithIntent, startClipPlayback, startSoundbitePlayback]
  );

  /**
   * Hint for `resolveQueueAdvance`: a loaded next row, or a source that may still have one.
   * `advanceAutoQueue` confirms before anything plays. An Add by RSS item reads the feed walk
   * already built for it.
   */
  const computeHasAutoQueueNext = useCallback((): boolean => {
    if (activeTargetRef.current?.kind === 'add-by-rss') {
      return readHasAddByRssNext();
    }
    if (hasAutoQueueRowAfter(autoQueueResourcesRef.current, autoQueueActiveRowRef.current)) {
      return true;
    }
    if (autoQueueConfigRef.current.disabled) {
      return false;
    }
    if (autoQueueSeedFromPlaybackTarget(activeTargetRef.current) === null) {
      return false;
    }
    return !isAutoQueueExhaustedRef.current;
  }, [
    autoQueueActiveRowRef,
    autoQueueConfigRef,
    autoQueueResourcesRef,
    isAutoQueueExhaustedRef,
    readHasAddByRssNext,
  ]);

  const advanceAutoQueue = useCallback(async (): Promise<boolean> => {
    const nextRow = autoQueueIncrementActiveRow(autoQueueActiveRowRef.current);
    if (autoQueueResourcesRef.current[nextRow] === undefined) {
      // Joins a fill already running for this item rather than fetching twice.
      await refillAutoQueueAhead();
    }
    const row = autoQueueResourcesRef.current[nextRow];
    if (row === undefined) {
      return false;
    }
    writeAutoQueueState({ activeRow: nextRow });
    return playAutoQueueRow(row);
  }, [
    autoQueueActiveRowRef,
    autoQueueResourcesRef,
    playAutoQueueRow,
    refillAutoQueueAhead,
    writeAutoQueueState,
  ]);

  /** The Add by RSS item's newer feed neighbor; false when the feed has none. */
  const advanceAddByRssFeed = useCallback(async (): Promise<boolean> => {
    const entry = await resolveAddByRssAdjacentEntry('next');
    if (entry === null) {
      return false;
    }
    return playAddByRssFeedEntry(entry);
  }, [playAddByRssFeedEntry, resolveAddByRssAdjacentEntry]);

  const resolveHasAutoQueueRow = useCallback(async (): Promise<boolean> => {
    if (activeTargetRef.current?.kind === 'add-by-rss') {
      return (await resolveAddByRssAdjacentEntry('next')) !== null;
    }
    if (hasAutoQueueRowAfter(autoQueueResourcesRef.current, autoQueueActiveRowRef.current)) {
      return true;
    }
    const outcome = await refillAutoQueueAhead();
    return !outcome.failed && outcome.hasRowAhead;
  }, [
    autoQueueActiveRowRef,
    autoQueueResourcesRef,
    refillAutoQueueAhead,
    resolveAddByRssAdjacentEntry,
  ]);

  const probeHasQueueAhead = useCallback(
    async (target: PlaybackTarget): Promise<boolean> => {
      const advanceMediumId = playbackMediumIdFromTarget(target);
      let upcomingManualCount = 0;
      try {
        const result = await loadActive(advanceMediumId);
        upcomingManualCount = upcomingManualCountFromCombined(
          result.upcomingResources.length,
          result.activeResource !== null
        );
      } catch (error) {
        if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
          return false;
        }
      }
      if (canAdvanceToNextQueueItem(upcomingManualCount, false)) {
        return true;
      }
      // Playlist/seed hints can lie after another device emptied the queue. Only treat auto-queue
      // as ahead when a real next row is already loaded or can be fetched now.
      return resolveHasAutoQueueRow();
    },
    [loadActive, resolveHasAutoQueueRow]
  );

  const advance = useCallback(
    async (transitionKind: 'complete' | 'skip'): Promise<void> => {
      // Only advance when this provider owns the current playback. Product playback, add-by-RSS
      // included, loads through `playTarget`; an engine `ended` with nothing loaded here (the engine
      // debug panel) has no queue resource to finish.
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
          releasePendingStart();
          setPlaybackPlaying(false);
          setTransportState('paused');
          return;
        }
        // An Add by RSS item that ends right after it starts still advances once its walk lands.
        const isAddByRssTarget = target !== null && target.kind === 'add-by-rss';
        if (isAddByRssTarget) {
          await ensureAddByRssFeedWalk();
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
        // asking that queue for the next row skips into the wrong medium. Add-by-RSS uses its
        // resource data medium, or the podcast queue when it has none, the same queue its playback
        // events were written to.
        let activeResource: DTOQueueResource | null = null;
        let upcomingManualCount = 0;
        const advanceMediumId =
          target !== null ? playbackMediumIdFromTarget(target) : activeQueueRef.current?.medium_id;
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

        let didStartNextItem = false;
        if (decision.kind === 'play-next-manual' && activeResource !== null) {
          try {
            await playQueueResource(activeResource, 'fresh_transition');
            didStartNextItem =
              activeTargetRef.current !== null && activeTargetRef.current !== target;
          } catch (error) {
            if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
              throw error;
            }
          }
        } else if (decision.kind === 'advance-auto-queue') {
          try {
            didStartNextItem = isAddByRssTarget
              ? await advanceAddByRssFeed()
              : await advanceAutoQueue();
          } catch (error) {
            if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
              throw error;
            }
          }
        }

        // Skip with nothing ahead (stale UI, another device emptied the queue, or auto-queue
        // seed that failed to load) must keep the current item playing. Natural complete may stop.
        if (shouldClearNowPlayingAfterAdvance(transitionKind, didStartNextItem)) {
          clearNowPlaying();
        }
      } finally {
        advancingRef.current = false;
      }
    },
    [
      advanceAddByRssFeed,
      advanceAutoQueue,
      clearNowPlaying,
      computeHasAutoQueueNext,
      ensureAddByRssFeedWalk,
      loadActive,
      moveNowPlayingToHistory,
      playQueueResource,
      releasePendingStart,
      writePlaybackEvent,
    ]
  );

  /**
   * Whether a restored item loads, and which copy. Only the item read fresh from the server on
   * this load retires it: ended, or a 404. With no answer (offline, timeout, 5xx) the copy in hand
   * loads. Start and end times are never read.
   *
   * - `snapshot`: the device-local last-playback item, read through `getItemByIdText`. That throws
   *   a 404 only when nothing is stored, so the item is gone. The fresh read runs only for an item
   *   known to be live, so an episode already on the device costs no request.
   * - `queue`: a server queue row. Queue rows carry no `live_item`, so every one is read fresh.
   */
  const readRestoredItemLoad = useCallback(
    async (
      source:
        { kind: 'snapshot'; idText: string; isLive: boolean } | { kind: 'queue'; item: DTOItem }
    ): Promise<RestoredItemLoadChoice> => {
      const context = buildContext();
      let copy: DTOItem;
      let knownLiveBeforeFetch: boolean;
      if (source.kind === 'snapshot') {
        try {
          copy = await playbackContentRepository.getItemByIdText(context, source.idText);
        } catch (error) {
          if (getErrorResponseStatus(error) === 404) {
            return { action: 'retire' };
          }
          throw error;
        }
        knownLiveBeforeFetch = source.isLive || resolveItemLiveStatusId(copy) !== null;
        if (!knownLiveBeforeFetch) {
          return { action: 'load', item: copy };
        }
      } else {
        copy = source.item;
        knownLiveBeforeFetch = resolveItemLiveStatusId(copy) !== null;
        if (!knownLiveBeforeFetch) {
          // The flag never changes the decision, so a failed local read only leaves it false.
          const stored = await playbackContentRepository
            .getStoredItemByIdText(copy.id_text)
            .catch(() => null);
          knownLiveBeforeFetch = stored !== null && resolveItemLiveStatusId(stored) !== null;
        }
      }
      const fresh = await playbackContentRepository.fetchFreshItemByIdText(context, copy.id_text);
      const decision = resolveRestoredItemLoad({ fresh, knownLiveBeforeFetch });
      if (decision.action === 'retire') {
        return { action: 'retire' };
      }
      return { action: 'load', item: decision.action === 'load' ? decision.item : copy };
    },
    [buildContext]
  );

  // Universal last-playback restore: every resolved auth status restores the device-local
  // now-playing snapshot once per process, loaded paused so cold start never blasts audio. Sign-in
  // (anonymous → authenticated) clears the snapshot so the account's server queue is authoritative.
  // When the snapshot is missing and the player is still empty, the active queue head is adopted
  // next (existing now-playing, or first upcoming promoted without recording a listen).
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
          if (item === null || item === undefined) {
            return;
          }
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
        const restored = await readRestoredItemLoad({
          idText: snapshot.id_text,
          isLive: snapshot.is_live === true,
          kind: 'snapshot',
        });
        if (restored.action === 'retire') {
          // Nothing loads. Signed in, the queue-head adopt that follows loads the next item.
          if (await snapshotStillCurrent()) {
            await clearLastPlaybackSnapshot();
          }
          return;
        }
        const channel = await ensureChannel(restored.item);
        if (channel === null || !(await snapshotStillCurrent())) {
          return;
        }
        await startItemPlayback(restored.item, channel, {
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
    [
      buildContext,
      ensureChannel,
      readRestoredItemLoad,
      startClipPlayback,
      startItemPlayback,
      startSoundbitePlayback,
    ]
  );

  const isAdoptedSourceCurrent = useCallback((idText: string): boolean => {
    const target = activeTargetRef.current;
    return (
      engineSourceIdTextRef.current === idText &&
      target !== null &&
      playbackTargetRowMediaId(target) === idText
    );
  }, []);

  /**
   * Replace an adopted source's partial data with its whole target, fetched by its own kind,
   * without touching the audio. Offline, or when the fetch fails, the source is remembered and
   * retried when the connection returns. An Add by RSS source has nothing to fetch by id.
   */
  const enrichAdoptedSource = useCallback(
    async (meta: MediaEngineSourceMeta): Promise<void> => {
      if (meta.kind === 'add_by_rss') {
        pendingAdoptionEnrichmentRef.current = null;
        return;
      }
      if (isEffectivelyOffline()) {
        pendingAdoptionEnrichmentRef.current = meta;
        return;
      }
      pendingAdoptionEnrichmentRef.current = null;
      try {
        const context = buildContext();
        let enriched: { target: PlaybackTarget; item: DTOItem; channel: DTOChannel };
        if (meta.kind === 'clip') {
          const clip = await playbackContentRepository.getClipByIdText(context, meta.idText);
          const item = clip.item;
          if (item === null || item === undefined) {
            return;
          }
          const channel = await ensureChannel(item);
          if (channel === null) {
            pendingAdoptionEnrichmentRef.current = meta;
            return;
          }
          enriched = { channel, item, target: buildClipPlaybackTarget(clip, item, channel) };
        } else if (meta.kind === 'item_soundbite') {
          const soundbite = await playbackContentRepository.getSoundbiteByIdText(
            context,
            meta.idText
          );
          const item = soundbite.item;
          if (item === null || item === undefined) {
            return;
          }
          const channel = await ensureChannel(item);
          if (channel === null) {
            pendingAdoptionEnrichmentRef.current = meta;
            return;
          }
          enriched = {
            channel,
            item,
            target: buildSoundbitePlaybackTarget(soundbite, item, channel),
          };
        } else {
          const item = await playbackContentRepository.getItemByIdText(context, meta.idText);
          const channel = await ensureChannel(item);
          if (channel === null) {
            pendingAdoptionEnrichmentRef.current = meta;
            return;
          }
          enriched = { channel, item, target: buildAdoptedPlaybackTarget(item, channel, meta) };
        }
        if (!isAdoptedSourceCurrent(meta.idText)) {
          return;
        }
        const { channel, item, target } = enriched;
        const previous = activeTargetRef.current;
        // A clip or soundbite shown as a whole item has no listen session or snapshot yet.
        const replacesInterimItem =
          (target.kind === 'clip' || target.kind === 'soundbite') &&
          previous !== null &&
          previous.kind !== 'clip' &&
          previous.kind !== 'soundbite';
        activeTargetRef.current = target;
        setActiveTarget(target);
        setNowPlaying(summaryFromItem(item, channel));
        if (replacesInterimItem) {
          getListenSession().load({
            directive: 'start',
            target: listenSessionTargetFromPlaybackTarget(target),
            mediaDurationSeconds: durationRef.current > 0 ? durationRef.current : null,
          });
          writeLastPlaybackSnapshotForTarget(target, positionRef.current);
        }
        void refillAutoQueueAhead();
        await resolvePlaybackSelectionForItem(item);
      } catch {
        if (isAdoptedSourceCurrent(meta.idText)) {
          pendingAdoptionEnrichmentRef.current = meta;
        }
      }
    },
    [
      buildContext,
      ensureChannel,
      getListenSession,
      isAdoptedSourceCurrent,
      refillAutoQueueAhead,
      resolvePlaybackSelectionForItem,
      writeLastPlaybackSnapshotForTarget,
    ]
  );

  /**
   * Make a source the engine is already playing the phone's active item, without reloading audio:
   * one the car started, or one still loaded when the phone app opens. A clip, soundbite, or Add
   * by RSS episode the saved advance source or the account queue lists is adopted as itself; a
   * whole item comes from a device store when one holds it. Otherwise the target is built from the
   * engine's metadata and filled in once it can be fetched. The auto-queue continues the saved
   * source when the item belongs to it (an account queue item keeps the whole saved buffer behind
   * it) and otherwise refills from the item's own source. Returns false when the engine moved on to
   * another source meanwhile.
   */
  const adoptEngineSource = useCallback(
    async (source: {
      url: string;
      meta: MediaEngineSourceMeta;
      positionSeconds?: number;
      durationSeconds?: number;
      isPlaying?: boolean;
    }): Promise<boolean> => {
      const { meta } = source;
      const current = activeTargetRef.current;
      if (current !== null && playbackTargetRowMediaId(current) === meta.idText) {
        return true;
      }

      // Local reads only: the saved advance source and the device's copy of the account queue.
      const identity = { idText: meta.idText, kind: meta.kind };
      const playsWholeItem = engineKindPlaysWholeItem(meta.kind);
      const savedSource = await nativeAdvanceSourceRepository.read();
      const manualResource = await nativeAdvanceSourceRepository.readManualQueueResource(identity);
      const continuation = decideAdoptedContinuation(savedSource, identity, manualResource);
      const row = continuation?.row ?? null;

      // A clip, soundbite, or Add by RSS id is not an item id.
      let stored: DTOItem | null = null;
      let storedChannel: DTOChannel | null = null;
      if (playsWholeItem) {
        try {
          stored = await playbackContentRepository.getStoredItemByIdText(meta.idText);
          if (stored !== null) {
            storedChannel =
              stored.channel ??
              (await playbackContentRepository.getLocalChannelForItem(stored.id_text));
          }
        } catch {
          stored = null;
          storedChannel = null;
        }
      }

      // A saved or queued clip or soundbite row plays as itself, the way the app loads that row.
      const rowTarget = await (async (): Promise<{
        target: PlaybackTarget;
        item: DTOItem;
        channel: DTOChannel;
      } | null> => {
        try {
          const clip = row?.clip ?? null;
          if (clip !== null) {
            const clipItem = clip.item;
            if (clipItem === null || clipItem === undefined) {
              return null;
            }
            const rowChannel = row?.channel ?? (await ensureChannel(clipItem));
            return rowChannel === null
              ? null
              : {
                  channel: rowChannel,
                  item: clipItem,
                  target: buildClipPlaybackTarget(clip, clipItem, rowChannel),
                };
          }
          const soundbite = row?.item_soundbite ?? null;
          const soundbiteItem = soundbite?.item ?? null;
          if (soundbite !== null && soundbiteItem !== null) {
            const rowChannel = row?.channel ?? (await ensureChannel(soundbiteItem));
            return rowChannel === null
              ? null
              : {
                  channel: rowChannel,
                  item: soundbiteItem,
                  target: buildSoundbitePlaybackTarget(soundbite, soundbiteItem, rowChannel),
                };
          }
          return null;
        } catch {
          return null;
        }
      })();

      // An Add by RSS episode plays from the device's copy of its feed, or as its queue row.
      const adoptedAddByRssData = await (async (): Promise<AddByRSSResourceData | null> => {
        const savedFeedUrl = continuation?.addByRssFeedUrl ?? null;
        if (savedFeedUrl !== null) {
          try {
            const loaded = await loadLocalFeed(addByRssRepository, savedFeedUrl);
            const entry =
              loaded === null
                ? null
                : findAddByRssEpisodePlayEntry(loaded.record, loaded.mappedFeed, meta.idText);
            if (entry !== null) {
              return entry.resourceData;
            }
          } catch {
            // Falls through to the queue row.
          }
        }
        if (
          manualResource === null ||
          !isAddByRssResourceData(manualResource.add_by_rss_resource_data)
        ) {
          return null;
        }
        try {
          return await resolveLocalAddByRssResourceData(
            manualResource.add_by_rss_resource_data,
            addByRssRepository
          );
        } catch {
          return null;
        }
      })();

      if (engineSourceIdTextRef.current !== meta.idText) {
        return false;
      }

      const durationSeconds =
        typeof source.durationSeconds === 'number' && source.durationSeconds > 0
          ? source.durationSeconds
          : 0;
      const positionSeconds =
        typeof source.positionSeconds === 'number' && source.positionSeconds > 0
          ? source.positionSeconds
          : 0;
      const adopted = ((): {
        target: PlaybackTarget;
        summary: PlaybackNowPlaying;
        item: DTOItem | null;
        channel: DTOChannel | null;
        builtFromMeta: boolean;
      } => {
        if (adoptedAddByRssData !== null) {
          return {
            builtFromMeta: false,
            channel: null,
            item: null,
            summary: summaryFromAddByRssResourceData(adoptedAddByRssData),
            target: { kind: 'add-by-rss', resourceData: adoptedAddByRssData },
          };
        }
        if (rowTarget !== null) {
          return {
            builtFromMeta: false,
            channel: rowTarget.channel,
            item: rowTarget.item,
            summary: summaryFromItem(rowTarget.item, rowTarget.channel),
            target: rowTarget.target,
          };
        }
        const wholeItem = stored ?? buildItemFromEngineMeta(meta, source.url, durationSeconds);
        // The saved or queue row's channel gives a real channel id when no store holds the item.
        const wholeChannel = storedChannel ?? row?.channel ?? buildChannelFromEngineMeta(meta);
        return {
          builtFromMeta: stored === null,
          channel: wholeChannel,
          item: wholeItem,
          summary: summaryFromItem(wholeItem, wholeChannel),
          target: buildAdoptedPlaybackTarget(wholeItem, wholeChannel, meta),
        };
      })();
      const { builtFromMeta, channel, item, summary, target } = adopted;
      const adoptedDurationSeconds = resolveLoadDurationSeconds({
        hintSeconds: durationSeconds,
        isLive: isLivePlaybackTarget(target),
      });
      // A clip, soundbite, or Add by RSS source shown as a whole item from engine metadata.
      const isInterim = !playsWholeItem && adoptedAddByRssData === null && rowTarget === null;
      const restoredAutoQueue = continuation?.autoQueue ?? null;

      applyAutoQueueDirective({ mode: 'clear' });
      if (restoredAutoQueue !== null) {
        writeAutoQueueState({
          activeRow: 0,
          config: restoredAutoQueue.config,
          resources: restoredAutoQueue.resources,
        });
      }
      clearDownloadSourceSwap();
      clearSeekHold();
      releasePendingStart();
      pauseAtRef.current = null;
      lastSourceUrlRef.current = source.url;
      setPlaybackSourceMarker(source.url);
      sourcePlayableRef.current = true;
      nativePlaybackBridge.setRate(applyEffectiveRateForTarget(target));
      activeTargetRef.current = target;
      // An interim target would record a clip's listening under an item kind. The engine's
      // journal records it meanwhile; enrichment starts the session once the real target is known.
      if (!isInterim) {
        getListenSession().load({
          directive: 'start',
          target: listenSessionTargetFromPlaybackTarget(target),
          mediaDurationSeconds: adoptedDurationSeconds > 0 ? adoptedDurationSeconds : null,
        });
      }
      positionRef.current = positionSeconds;
      durationRef.current = adoptedDurationSeconds;
      setActiveTarget(target);
      setNowPlaying(summary);
      setLastPlaybackError(null);
      resetLivePlayback();
      if (source.isPlaying === true) {
        markLivePlaybackPlayed();
      }
      setPlaybackProgress({ durationSeconds: adoptedDurationSeconds, positionSeconds });
      if (source.isPlaying !== undefined) {
        setPlaybackPlaying(source.isPlaying);
        setTransportState(source.isPlaying ? 'playing' : 'paused');
      }
      if (!isInterim) {
        writeLastPlaybackSnapshotForTarget(target, positionSeconds);
      }

      if (target.kind === 'add-by-rss') {
        void ensureAddByRssFeedWalk();
        if (restoredAutoQueue !== null) {
          void refillAutoQueueAhead();
        }
      } else if (
        !(isInterim && meta.kind === 'add_by_rss') &&
        // A channel built from engine meta has no id, and the auto-queue seed needs one.
        (restoredAutoQueue !== null || (channel !== null && channel.id_text !== ''))
      ) {
        void refillAutoQueueAhead();
      }
      if (item !== null) {
        void resolvePlaybackSelectionForItem(item);
      }

      if (meta.kind === 'add_by_rss') {
        pendingAdoptionEnrichmentRef.current = null;
      } else if (
        isInterim ||
        (item !== null &&
          channel !== null &&
          adoptedItemNeedsEnrichment({ builtFromMeta, channel, item }))
      ) {
        void enrichAdoptedSource(meta);
      } else {
        pendingAdoptionEnrichmentRef.current = null;
      }
      return true;
    },
    [
      applyAutoQueueDirective,
      applyEffectiveRateForTarget,
      clearDownloadSourceSwap,
      clearSeekHold,
      ensureAddByRssFeedWalk,
      ensureChannel,
      enrichAdoptedSource,
      getListenSession,
      refillAutoQueueAhead,
      releasePendingStart,
      resolvePlaybackSelectionForItem,
      setPlaybackPlaying,
      writeAutoQueueState,
      writeLastPlaybackSnapshotForTarget,
    ]
  );

  useEffect(() => {
    return subscribeConnectivity((state) => {
      const pending = pendingAdoptionEnrichmentRef.current;
      if (state !== 'online' || pending === null || !isAdoptedSourceCurrent(pending.idText)) {
        return;
      }
      void enrichAdoptedSource(pending);
    });
  }, [enrichAdoptedSource, isAdoptedSourceCurrent]);

  const adoptQueueHeadWhenPlayerEmpty = useCallback(async (): Promise<void> => {
    if (!lastPlaybackRestoreSettled) {
      return;
    }
    if (statusRef.current !== 'authenticated') {
      return;
    }
    if (activeTargetRef.current !== null) {
      return;
    }
    if (queueHeadAdoptInFlightRef.current) {
      return;
    }
    queueHeadAdoptInFlightRef.current = true;

    try {
      const context = buildContext();
      let primaryQueueIdText: string | null = null;
      let accountQueues: DTOQueue[] = [];
      try {
        const loaded = await loadActive();
        primaryQueueIdText = loaded.activeQueue?.id_text ?? null;
        accountQueues = loaded.queues;
      } catch (error) {
        if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
          if (__DEV__) {
            console.warn('[playback] queue-head adopt loadActive failed', error);
          }
          return;
        }
        primaryQueueIdText = activeQueueRef.current?.id_text ?? null;
        accountQueues = queuesRef.current;
      }

      if (primaryQueueIdText === null || activeTargetRef.current !== null) {
        return;
      }

      if (pendingPromoteQueueIdTextRef.current !== null) {
        try {
          await queueRepository.promoteFirstUpcomingToNowPlaying(
            context,
            pendingPromoteQueueIdTextRef.current
          );
          pendingPromoteQueueIdTextRef.current = null;
          await loadActive();
        } catch (error) {
          if (getErrorCode(error) !== 'ERR_OFFLINE_MODE') {
            if (__DEV__) {
              console.warn('[playback] pending promote-upcoming failed', error);
            }
          }
        }
      }

      if (activeTargetRef.current !== null) {
        return;
      }

      const resolveQueueHeadResource = async (
        queueIdText: string
      ): Promise<DTOQueueResource | null> => {
        try {
          const nowPlayingResource = await queueRepository.getNowPlaying(context, queueIdText);
          if (nowPlayingResource !== null) {
            return nowPlayingResource;
          }
          const upcoming = await queueRepository.getUpcoming(context, queueIdText);
          const firstUpcoming = upcoming[0] ?? null;
          if (firstUpcoming === null) {
            return null;
          }
          try {
            const promoted = await queueRepository.promoteFirstUpcomingToNowPlaying(
              context,
              queueIdText
            );
            pendingPromoteQueueIdTextRef.current = null;
            await loadActive(accountQueues.find((q) => q.id_text === queueIdText)?.medium_id);
            return promoted;
          } catch (error) {
            if (getErrorCode(error) === 'ERR_OFFLINE_MODE') {
              pendingPromoteQueueIdTextRef.current = queueIdText;
              return firstUpcoming;
            }
            if (__DEV__) {
              console.warn('[playback] promote-upcoming failed', error);
            }
            return null;
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[playback] queue-head adopt read failed', error);
          }
          return null;
        }
      };

      let queueIdTextForLoad = primaryQueueIdText;
      let resourceToLoad = await resolveQueueHeadResource(primaryQueueIdText);

      if (resourceToLoad === null && activeTargetRef.current === null) {
        const otherQueue = accountQueues.find((queue) => queue.id_text !== primaryQueueIdText);
        if (otherQueue !== undefined) {
          try {
            const otherLoaded = await loadActive(otherQueue.medium_id);
            if (activeTargetRef.current !== null) {
              return;
            }
            if (otherLoaded.activeResource !== null) {
              queueIdTextForLoad = otherLoaded.activeQueue?.id_text ?? otherQueue.id_text;
              resourceToLoad = await resolveQueueHeadResource(queueIdTextForLoad);
            } else {
              await loadActive();
            }
          } catch (error) {
            if (__DEV__) {
              console.warn('[playback] other-queue adopt fallback failed', error);
            }
          }
        }
      }

      if (resourceToLoad === null || activeTargetRef.current !== null) {
        return;
      }

      // An ended livestream at the head is treated like a finished item: it moves to History,
      // and the next head is checked the same way. The write is a quiet zone move, not a listen.
      let retiredCount = 0;
      while (resourceToLoad !== null) {
        const resourceRef = resolveQueueResourceRef(resourceToLoad);
        const attemptKey =
          resourceRef === null
            ? null
            : `${queueIdTextForLoad}:${resourceRef.resourceKind}:${resourceRef.resourceIdText}`;
        if (attemptKey !== null && queueHeadAdoptAttemptedRef.current === attemptKey) {
          return;
        }
        if (attemptKey !== null) {
          queueHeadAdoptAttemptedRef.current = attemptKey;
        }

        let headToLoad = resourceToLoad;
        if (resourceRef?.resourceKind === 'item') {
          const restored = await readRestoredItemLoad({ item: resourceToLoad.item, kind: 'queue' });
          if (activeTargetRef.current !== null) {
            return;
          }
          if (restored.action === 'retire') {
            const ownership = resolveQueueHeadOwnership(getCrossDevicePlaybackView());
            if (ownership === 'unknown') {
              // Read this head again once the first check-in settles.
              queueHeadAdoptAttemptedRef.current = null;
              return;
            }
            if (ownership === 'not-owner') {
              return;
            }
            try {
              await queueRepository.moveNowPlayingToHistory(context, queueIdTextForLoad, {
                completed: true,
                idText: resourceRef.resourceIdText,
                kind: 'item',
                playbackPosition: '0',
              });
            } catch (error) {
              if (__DEV__) {
                console.warn('[playback] ended queue-head retire failed', {
                  error,
                  idText: resourceRef.resourceIdText,
                  queueIdText: queueIdTextForLoad,
                });
              }
              return;
            }
            retiredCount += 1;
            if (retiredCount >= RESTORED_QUEUE_HEAD_RETIRE_LIMIT) {
              return;
            }
            resourceToLoad = await resolveQueueHeadResource(queueIdTextForLoad);
            if (activeTargetRef.current !== null) {
              return;
            }
            continue;
          }
          headToLoad = { ...resourceToLoad, item: restored.item };
        }

        try {
          await playQueueResource(headToLoad, 'session_restore', {
            autoPlayOverride: false,
            autoQueue: { mode: 'clear' },
            explicitPlaybackSeconds: normalizePlaybackPosition(headToLoad.playback_position),
          });
        } catch (error) {
          if (__DEV__) {
            console.warn('[playback] queue-head adopt load failed', error);
          }
        }
        return;
      }
    } finally {
      queueHeadAdoptInFlightRef.current = false;
    }
  }, [buildContext, loadActive, playQueueResource, readRestoredItemLoad]);

  useEffect(() => {
    const previousStatus = previousAuthStatusRef.current;
    previousAuthStatusRef.current = status;

    // Sign-in clears any snapshot from a prior anonymous session — the account queue wins.
    if (previousStatus === 'anonymous' && status === 'authenticated') {
      void clearLastPlaybackSnapshot();
      lastPlaybackRestoreSettled = true;
      queueHeadAdoptAttemptedRef.current = null;
      void adoptQueueHeadWhenPlayerEmpty();
      return;
    }

    if (status === 'anonymous') {
      getListenSession().reset();
      queueHeadAdoptAttemptedRef.current = null;
      pendingPromoteQueueIdTextRef.current = null;
    }

    if (status === 'unknown') {
      return;
    }

    if (lastPlaybackRestoreStarted) {
      if (lastPlaybackRestoreSettled) {
        void adoptQueueHeadWhenPlayerEmpty();
      }
      return;
    }
    lastPlaybackRestoreStarted = true;
    void (async () => {
      await drainCarPlaybackJournal();

      // A source the engine already holds (a car session, or audio that outlived the JS runtime)
      // wins over snapshot and queue-head restore, which would reload over it.
      try {
        const current = await nativePlaybackBridge.getCurrentSource();
        const meta = current?.meta ?? null;
        if (current !== null && meta !== null && meta.idText.length > 0) {
          engineSourceIdTextRef.current = meta.idText;
          await adoptEngineSource({
            durationSeconds: current.durationSeconds,
            isPlaying: current.isPlaying,
            meta,
            positionSeconds: current.positionSeconds,
            url: current.url,
          });
          lastPlaybackRestoreSettled = true;
          return;
        }
      } catch {
        // Fall through to snapshot restore.
      }

      const snapshot = await readLastPlaybackSnapshot();
      if (snapshot !== null && statusRef.current !== 'unknown') {
        await restoreFromSnapshot(snapshot);
      }
      lastPlaybackRestoreSettled = true;
      await adoptQueueHeadWhenPlayerEmpty();
    })();
  }, [
    adoptEngineSource,
    adoptQueueHeadWhenPlayerEmpty,
    getListenSession,
    restoreFromSnapshot,
    status,
  ]);

  useEffect(() => {
    if (status !== 'authenticated' || !lastPlaybackRestoreSettled) {
      return;
    }
    void adoptQueueHeadWhenPlayerEmpty();
  }, [activeQueueUpcomingResources, adoptQueueHeadWhenPlayerEmpty, queueDataRevision, status]);

  // An ended queue head waits for this session's first check-in before it moves to History, so
  // the adopt runs again once the role is known.
  useEffect(() => {
    let previousOwnership = resolveQueueHeadOwnership(getCrossDevicePlaybackView());
    return subscribeCrossDevicePlaybackView(() => {
      const ownership = resolveQueueHeadOwnership(getCrossDevicePlaybackView());
      const settled = previousOwnership === 'unknown' && ownership !== 'unknown';
      previousOwnership = ownership;
      if (settled) {
        void adoptQueueHeadWhenPlayerEmpty();
      }
    });
  }, [adoptQueueHeadWhenPlayerEmpty]);

  const reconcileFromNative = useCallback((): void => {
    void (async () => {
      try {
        const [position, duration] = await Promise.all([
          nativePlaybackBridge.getPosition(),
          nativePlaybackBridge.getDuration(),
        ]);
        if (downloadSourceSwapSuppressProgressRef.current) {
          return;
        }
        if (Number.isFinite(position) && position >= 0 && !isPositionHeldBySeek(position)) {
          positionRef.current = position;
          setPlaybackPositionSeconds(position);
        }
        const target = activeTargetRef.current;
        const healedDurationSeconds = resolveSampleDurationSeconds({
          isLive: target !== null && isLivePlaybackTarget(target),
          sampleSeconds: duration,
        });
        if (healedDurationSeconds !== null) {
          durationRef.current = healedDurationSeconds;
          setPlaybackDurationSeconds(healedDurationSeconds);
        }
      } catch {
        // Best-effort heal after a missed native event window (e.g. Fast Refresh).
      }
    })();
  }, [isPositionHeldBySeek]);

  useEffect(() => {
    if (activeTarget === null || !isLivePlaybackTarget(activeTarget) || isPlaying) {
      return;
    }
    const intervalId = setInterval(() => {
      if (appStateRef.current !== 'active' || !getLivePlaybackHasPlayed()) {
        return;
      }
      void (async () => {
        const source = await nativePlaybackBridge.getCurrentSource().catch(() => null);
        const target = activeTargetRef.current;
        if (
          source === null ||
          !source.isLive ||
          target === null ||
          !isLivePlaybackTarget(target) ||
          !engineSourceMatchesTarget(source.meta?.idText ?? null, target)
        ) {
          return;
        }
        setLivePlaybackWindow(source.liveWindow);
      })();
    }, LIVE_PAUSED_WINDOW_REFRESH_MS);
    return () => {
      clearInterval(intervalId);
    };
  }, [activeTarget, isPlaying]);

  useNativePlaybackBridge({
    ended: () => {
      // Only the playing device records the end and advances; a late end on a phone another
      // device just claimed would start the next item here and claim playback back.
      if (getCrossDevicePlaybackView().role === 'remote') {
        return;
      }
      const activeTarget = activeTargetRef.current;
      const activeId = activeTarget === null ? null : playbackTargetRowMediaId(activeTarget);
      if (!engineSourceMatchesTarget(engineSourceIdTextRef.current, activeTarget)) {
        return;
      }
      const armed = commandedStartGuardRef.current;
      if (armed !== null && armed.targetMediaId === activeId) {
        // A commanded start past this file's end can end before any sample carried a duration.
        commandedStartGuardRef.current = null;
        void (async () => {
          const durationSeconds = await nativePlaybackBridge.getDuration().catch(() => 0);
          if (getCrossDevicePlaybackView().role === 'remote') {
            return;
          }
          const action = resolveCommandedStartOnEnded({ guard: armed.guard, durationSeconds });
          if (action.kind === 'restart_before_end') {
            seekToRef.current(action.seconds);
            void nativePlaybackBridge.play();
            return;
          }
          getListenSession().recordCompleted();
          void advance('complete');
        })();
        return;
      }
      getListenSession().recordCompleted();
      void advance('complete');
    },
    sourceChanged: (event) => {
      const meta = event.meta;
      engineSourceIdTextRef.current = meta?.idText ?? null;
      if (meta === null || meta.origin !== 'car') {
        return;
      }
      // The car started this load. The engine keeps playing; the phone adopts the item, then
      // applies the journal so the car's start reaches local state and the outbox.
      void (async () => {
        const adopted = await adoptEngineSource({ meta, url: event.url });
        if (adopted) {
          await drainCarPlaybackJournal();
        }
      })();
    },
    error: (event) => {
      clearDownloadSourceSwap();
      releasePendingStart();
      setPlaybackPlaying(false);
      recordPlaybackError(event, activeTargetRef.current, lastSourceUrlRef.current);
      setLastPlaybackError(event);
      setTransportState('error');
    },
    playbackState: (event) => {
      if (downloadSourceSwapSuppressProgressRef.current) {
        if (event.state === 'ready' || event.state === 'playing') {
          downloadSourceSwapSawReadyRef.current = true;
        } else if (event.state === 'error') {
          clearDownloadSourceSwap();
        }
        // The replacement item reports loading or paused until its seek finishes. Keep the
        // transport glyph already on screen so the control does not flip during the swap.
        if (event.state !== 'playing' && event.state !== 'error') {
          return;
        }
      }
      latestEngineStateRef.current = event.state;
      if (event.state === 'paused') {
        getListenSession().recordPause();
      }
      const pendingStart = pendingStartRef.current;
      const startHasPlayed = startHasPlayedRef.current;
      if (isEnginePlayableState(event.state)) {
        sourcePlayableRef.current = true;
      }
      const settledStart = event.state === 'error' || (event.state === 'ended' && startHasPlayed);
      if (settledStart) {
        releasePendingStart();
      }
      const nextTransport = playbackTransportForEngineState(
        event.state,
        sourcePlayableRef.current,
        pendingStart && !settledStart
      );
      if (event.state === 'playing' && pendingStart) {
        startHasPlayedRef.current = true;
        schedulePendingStartRelease(START_PLAY_SETTLE_MS);
      }
      if (nextTransport !== null) {
        setTransportState(nextTransport);
      }
      if (event.state === 'playing') {
        lastLoggedPlaybackErrorRef.current = null;
        setLastPlaybackError(null);
        setPlaybackPlaying(true);
      } else if (event.state === 'error') {
        setPlaybackPlaying(false);
      } else if (
        (event.state === 'paused' || event.state === 'ended') &&
        !(pendingStart && !settledStart)
      ) {
        setPlaybackPlaying(false);
      }
      if (event.state === 'ready' || event.state === 'playing') {
        reconcileFromNative();
      }
    },
    progress: (event) => {
      if (downloadSourceSwapSuppressProgressRef.current) {
        const seekSeconds = downloadSourceSwapSeekSecondsRef.current;
        const landed =
          seekSeconds !== null &&
          isDownloadHandoffProgressLanded({
            positionSeconds: event.positionSeconds,
            sawReady: downloadSourceSwapSawReadyRef.current,
            seekSeconds,
            toleranceSeconds: DOWNLOAD_HANDOFF_POSITION_TOLERANCE_SECONDS,
          });
        if (!landed) {
          return;
        }
        clearDownloadSourceSwap();
      }
      const loadedTarget = activeTargetRef.current;
      if (
        event.isLive &&
        loadedTarget !== null &&
        isLivePlaybackTarget(loadedTarget) &&
        engineSourceMatchesTarget(engineSourceIdTextRef.current, loadedTarget)
      ) {
        setLivePlaybackSample({ engineWindow: event.liveWindow, isPlaying: isPlayingRef.current });
      }
      if (isPositionHeldBySeek(event.positionSeconds)) {
        return;
      }
      positionRef.current = event.positionSeconds;
      setPlaybackPositionSeconds(event.positionSeconds);
      const sampleDurationSeconds = resolveSampleDurationSeconds({
        isLive: loadedTarget !== null && isLivePlaybackTarget(loadedTarget),
        sampleSeconds: event.durationSeconds,
      });
      if (sampleDurationSeconds !== null) {
        durationRef.current = sampleDurationSeconds;
        setPlaybackDurationSeconds(sampleDurationSeconds);
      }

      const activeTarget = activeTargetRef.current;
      const identityMatches = engineSourceMatchesTarget(
        engineSourceIdTextRef.current,
        activeTarget
      );
      if (!identityMatches) {
        return;
      }

      const activeId = activeTarget === null ? null : playbackTargetRowMediaId(activeTarget);
      const armed = commandedStartGuardRef.current;
      if (armed !== null && armed.targetMediaId === activeId) {
        const action = resolveCommandedStartOnProgress({
          guard: armed.guard,
          positionSeconds: event.positionSeconds,
          durationSeconds: event.durationSeconds,
          nowMs: Date.now(),
        });
        switch (action.kind) {
          case 'keep':
            commandedStartGuardRef.current = { ...armed, guard: action.guard };
            break;
          case 'seek':
            commandedStartGuardRef.current = { ...armed, guard: action.guard };
            seekToRef.current(action.seconds);
            break;
          case 'clear':
            commandedStartGuardRef.current = null;
            break;
          default: {
            const unexpected: never = action;
            return unexpected;
          }
        }
      }

      if (sampleDurationSeconds !== null && sampleDurationSeconds > 0) {
        getListenSession().setMediaDuration(sampleDurationSeconds);
      }
      getListenSession().recordPosition({
        positionSeconds: event.positionSeconds,
        isPlaying: isPlayingRef.current,
        playbackRate: playbackRateRef.current,
      });

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
    getListenSession().recordPause();
    releasePendingStart();
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
  }, [
    getListenSession,
    releasePendingStart,
    setPlaybackPlaying,
    writeLastPlaybackSnapshotForTarget,
    writePlaybackEvent,
  ]);

  /**
   * Another device claimed playback. Stops local audio and keeps the device-local snapshot, but
   * writes no outbox event, now-playing or history change, or position post: a pause here would
   * make this item the account's now-playing again, over the item the new device just started.
   * The new device's own play event moves the queue. The engine's later `paused` event closes the
   * listen segment and flips the playing flag, nothing more.
   */
  const stopPlaybackForOtherDevice = useCallback(() => {
    nativePlaybackBridge.pause();
    commandedStartGuardRef.current = null;
    releasePendingStart();
    setPlaybackPlaying(false);
    setTransportState('paused');
    const target = activeTargetRef.current;
    if (target !== null) {
      writeLastPlaybackSnapshotForTarget(target, positionRef.current);
    }
  }, [releasePendingStart, setPlaybackPlaying, writeLastPlaybackSnapshotForTarget]);

  const retryPlayback = useCallback(async () => {
    const url = lastSourceUrlRef.current;
    if (url === null) {
      return;
    }
    sourcePlayableRef.current = false;
    latestEngineStateRef.current = null;
    armPendingStart();
    setTransportState('loading');
    try {
      const target = activeTargetRef.current;
      await nativePlaybackBridge.loadAndStart(
        await withAddByRssPlaybackAuth(
          target,
          playbackReloadSource(target, url, positionRef.current)
        )
      );
      nativePlaybackBridge.setRate(playbackRateRef.current);
      if (pendingStartRef.current) {
        sourcePlayableRef.current = true;
        setLastPlaybackError(null);
        setPlaybackPlaying(true);
        setTransportState('playing');
      }
    } catch (error) {
      releasePendingStart();
      const failure = playbackErrorFromLoadFailure(error);
      recordPlaybackError(failure, activeTargetRef.current, url);
      setLastPlaybackError(failure);
      setTransportState('error');
    }
  }, [armPendingStart, recordPlaybackError, releasePendingStart, setPlaybackPlaying]);

  const resume = useCallback(async () => {
    await nativePlaybackBridge.play();
    setPlaybackPlaying(true);
    setTransportState('playing');

    await writePlaybackEvent({
      eventKind: playbackEventFromDiscreteSignal('play'),
      forceNetwork: true,
      isPlaying: true,
      mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
      playbackPositionSeconds: positionRef.current,
    });
  }, [setPlaybackPlaying, writePlaybackEvent]);

  const seekTo = useCallback(
    (seconds: number) => {
      nativePlaybackBridge.seek(seconds);
      getListenSession().recordSeek();
      positionRef.current = seconds;
      holdSeekPosition(seconds);
      setPlaybackPositionSeconds(seconds);
      crossDeviceLocalChangeRef.current('seek');
      const occurredAt = Date.now();
      const postNetworkNow = shouldPostSeekEventNow({
        lastSeekPostAtMs: lastSeekNetworkPostAtRef.current,
        occurredAt,
        windowMs: PLAYBACK_SEEK_NETWORK_COALESCE_MS,
      });

      if (postNetworkNow) {
        lastSeekNetworkPostAtRef.current = occurredAt;
        void writePlaybackEvent({
          eventKind: playbackEventFromDiscreteSignal('seek'),
          forceNetwork: true,
          isPlaying: isPlayingRef.current,
          mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
          occurredAt,
          playbackPositionSeconds: seconds,
        });
        return;
      }

      void writePlaybackEvent({
        eventKind: playbackEventFromDiscreteSignal('seek'),
        forceNetwork: false,
        isPlaying: isPlayingRef.current,
        mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
        occurredAt,
        playbackPositionSeconds: seconds,
      });

      if (seekNetworkFlushTimerRef.current !== null) {
        return;
      }
      seekNetworkFlushTimerRef.current = setTimeout(() => {
        seekNetworkFlushTimerRef.current = null;
        const flushAt = Date.now();
        lastSeekNetworkPostAtRef.current = flushAt;
        void writePlaybackEvent({
          eventKind: playbackEventFromDiscreteSignal('seek'),
          forceNetwork: true,
          isPlaying: isPlayingRef.current,
          mediaFileDurationSeconds: durationRef.current > 0 ? durationRef.current : undefined,
          occurredAt: flushAt,
          playbackPositionSeconds: positionRef.current,
        });
      }, PLAYBACK_SEEK_NETWORK_COALESCE_MS);
    },
    [getListenSession, holdSeekPosition, writePlaybackEvent]
  );
  seekToRef.current = seekTo;

  /**
   * Pressing Live. Always plays: the live moment moves on, so landing there paused would be
   * stale. The engine seeks to the live edge, or reconnects a progressive stream.
   */
  const goToLive = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || !isLivePlaybackTarget(target)) {
      return;
    }
    const wasPlaying = isPlayingRef.current;
    clearSeekHold();
    getListenSession().recordSeek();
    const liveWindow = getLivePlaybackWindow();
    if (liveWindow !== null) {
      positionRef.current = liveWindow.liveEdgeSeconds;
      setPlaybackPositionSeconds(liveWindow.liveEdgeSeconds);
    }
    markLivePlaybackPlayed();
    await nativePlaybackBridge.goToLive();
    setPlaybackPlaying(true);
    setTransportState('playing');
    if (!wasPlaying) {
      await writePlaybackEvent({
        eventKind: playbackEventFromDiscreteSignal('play'),
        forceNetwork: true,
        isPlaying: true,
        playbackPositionSeconds: positionRef.current,
      });
    }
  }, [clearSeekHold, getListenSession, setPlaybackPlaying, writePlaybackEvent]);

  /**
   * A seek another device asked for. At or past this phone's own file end it lands 5 seconds before
   * the end; while the engine does not know the duration yet, the guard applies that once it does.
   */
  const seekForCrossDevice = useCallback(
    async (seconds: number): Promise<void> => {
      const durationSeconds = await nativePlaybackBridge.getDuration().catch(() => 0);
      if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
        seekTo(clampCommandStartToFileEnd({ seconds, fileDurationSeconds: durationSeconds }));
        return;
      }
      seekTo(seconds);
      const target = activeTargetRef.current;
      commandedStartGuardRef.current = {
        guard: createCommandedStartGuard(seconds),
        targetMediaId: target === null ? null : playbackTargetRowMediaId(target),
      };
    },
    [seekTo]
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
      holdSeekPosition(seconds);
      setPlaybackPositionSeconds(seconds);
      writeLastPlaybackSnapshotForTarget(target, seconds);
    },
    [holdSeekPosition, writeLastPlaybackSnapshotForTarget]
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
      if (target.kind === 'add-by-rss') {
        return resolveNowPlayingAddByRssChapters(buildContext(), target.resourceData);
      }
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

  const jumpBy = useCallback(
    (deltaSeconds: number) => {
      const target = activeTargetRef.current;
      if (target === null) {
        return;
      }
      if (isLivePlaybackTarget(target)) {
        const liveWindow = getLivePlaybackWindow();
        if (!isRewindableLiveWindow(liveWindow)) {
          return;
        }
        const fromSeconds = getLivePlaybackHasPlayed()
          ? Math.min(positionRef.current, liveWindow.liveEdgeSeconds)
          : liveWindow.liveEdgeSeconds;
        seekTo(clampLiveSeekSeconds(liveWindow, fromSeconds + deltaSeconds));
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

  /**
   * Leaves the playing item backward through the auto-queue: a loaded row before the active one,
   * else the source's previous row, else a restart. With Shuffle on the walk only restarts. An
   * Add by RSS item steps to the older item in its feed, or restarts at the oldest. The item being
   * left is not written to history; the next item's play updates now-playing.
   */
  const runPreviousTrack = useCallback(async (): Promise<void> => {
    if (activeTargetRef.current?.kind === 'add-by-rss') {
      const entry = await resolveAddByRssAdjacentEntry('previous');
      if (entry === null || !(await playAddByRssFeedEntry(entry))) {
        seekTo(0);
      }
      return;
    }
    const step = await resolvePreviousTrackStep();
    if (step === null || step.kind === 'restart') {
      seekTo(0);
      return;
    }
    if (step.kind === 'step-back-row') {
      const row = autoQueueResourcesRef.current[step.row];
      if (row === undefined) {
        seekTo(0);
        return;
      }
      writeAutoQueueState({ activeRow: step.row });
      if (!(await playAutoQueueRow(row))) {
        seekTo(0);
      }
      return;
    }
    // The emptied buffer refills from the loaded item at row 0, so the item just left is next.
    const played = await playAutoQueueRow(step.resource, {
      autoQueue: { mode: 'clear-buffer' },
      intent: 'explicit_play',
    });
    if (!played) {
      seekTo(0);
    }
  }, [
    autoQueueResourcesRef,
    playAddByRssFeedEntry,
    playAutoQueueRow,
    resolveAddByRssAdjacentEntry,
    resolvePreviousTrackStep,
    seekTo,
    writeAutoQueueState,
  ]);

  const skipToPrevious = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || target.kind === 'livestream') {
      return;
    }
    // Chapters come from the process-wide cache the player already filled, so a chapter seek does
    // not wait on the auto-queue walk. The walk runs only when the action leaves this item.
    const chapters = chaptersForTrackButtons(target, await resolveChaptersForTarget(target));
    const action = resolvePreviousAction({
      chapters,
      hasPreviousQueueItem: true,
      positionSeconds: positionRef.current,
    });
    if (action.kind !== 'previous-queue-item') {
      seekTo(action.seekSeconds);
      return;
    }
    await runPreviousTrack();
  }, [resolveChaptersForTarget, runPreviousTrack, seekTo]);

  /**
   * The hold gesture and the remote Previous command while JS owns advance. Neither applies the
   * 3-second restart here: holding Previous always leaves the item, and the native engine restarts
   * past 3 seconds itself before it hands a remote command to JS.
   */
  const skipToPreviousTrack = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || target.kind === 'livestream') {
      return;
    }
    await runPreviousTrack();
  }, [runPreviousTrack]);

  const setRate = useCallback(
    (rate: number) => {
      audioVideoRateRef.current = rate;
      nativePlaybackBridge.setRate(applyEffectiveRateForTarget(activeTargetRef.current));
      crossDeviceLocalChangeRef.current('rate');
    },
    [applyEffectiveRateForTarget]
  );

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
    if (!(await probeHasQueueAhead(target))) {
      return;
    }
    await advance('skip');
  }, [advance, probeHasQueueAhead, resolveChaptersForTarget, seekTo]);

  const skipToNextTrack = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || !(await probeHasQueueAhead(target))) {
      return;
    }
    await advance('skip');
  }, [advance, probeHasQueueAhead]);
  const completeNowPlaying = useCallback(async (): Promise<void> => {
    if (getCrossDevicePlaybackView().role === 'remote') {
      return;
    }
    await advance('complete');
  }, [advance]);

  const remoteTrackCommandHandlersRef = useRef({ skipToNextTrack, skipToPreviousTrack });
  remoteTrackCommandHandlersRef.current = { skipToNextTrack, skipToPreviousTrack };
  useEffect(() => {
    const subscription = nativePlaybackBridge.addListener('remoteTrackCommand', (event) => {
      const handlers = remoteTrackCommandHandlersRef.current;
      void (event.command === 'next' ? handlers.skipToNextTrack() : handlers.skipToPreviousTrack());
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Loaded later row for the full player's Next button. A lookup still running with nothing
  // loaded, a failed lookup, and a source with no later row stay false.
  // `computeHasAutoQueueNext` is the advance hint and may be true before a row is loaded.
  const hasAutomaticNext = useMemo<boolean>(() => {
    if (activeTarget === null || activeTarget.kind === 'livestream') {
      return false;
    }
    if (activeTarget.kind === 'add-by-rss') {
      return hasAddByRssNext;
    }
    return hasAutoQueueRowAfter(autoQueueResources, autoQueueActiveRow);
  }, [activeTarget, autoQueueActiveRow, autoQueueResources, hasAddByRssNext]);

  const crossDeviceLocalPort = useMemo<CrossDevicePlaybackLocalPort>(
    () => ({
      resume,
      pause,
      seekTo: seekForCrossDevice,
      setRate,
      skipToNext,
      skipToPrevious,
      playResource: (params) => playResourceForCrossDevice(params, 'play'),
      hasLoadedTarget: () => activeTargetRef.current !== null,
      isLoadedTargetLive: () => {
        const target = activeTargetRef.current;
        return target !== null && isLivePlaybackTarget(target);
      },
      loadResourcePaused: async (params) => {
        const result = await playResourceForCrossDevice(
          { ...params, addByRssResourceData: null },
          'load_paused'
        );
        if (result === 'failed') {
          throw new Error(`Paused load failed (${params.ref.kind})`);
        }
      },
      adoptPosition: adoptRemotePlaybackPosition,
      loadedRef: () => {
        const target = activeTargetRef.current;
        return target === null ? null : playbackResourceRefFromTarget(target);
      },
    }),
    [
      adoptRemotePlaybackPosition,
      pause,
      playResourceForCrossDevice,
      resume,
      seekForCrossDevice,
      setRate,
      skipToNext,
      skipToPrevious,
    ]
  );

  const crossDevice = useCrossDevicePlayback({
    activeTarget,
    nowPlaying,
    isPlaying,
    transportState,
    playbackRate,
    isPlayingRef,
    readPositionSeconds: () => positionRef.current,
    readDurationSeconds: () => durationRef.current,
    readEffectiveRate: () => playbackRateRef.current,
    localChangeSignalRef: crossDeviceLocalChangeRef,
    stopForOtherDevice: stopPlaybackForOtherDevice,
    localPort: crossDeviceLocalPort,
    lastPlaybackError,
    isAuthoringHold,
  });
  const { handoffGate } = crossDevice;

  // Conflicts wait in `playbackReconcileConflicts` while the gate defers or suppresses, and are
  // evaluated again when it allows. A conflict naming the loaded item is never offered.
  useEffect(() => {
    if (
      handoffGate !== 'allow' ||
      playbackHandoffPrompt !== null ||
      playbackReconcileConflicts.length === 0
    ) {
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
          isLoadedReconcileResource(activeTargetRef.current, conflict.remote) ||
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

        // An ended or missing livestream is never offered. Nothing is written: the device that
        // owns that row retires it.
        let promptResource = remoteResource;
        if (remoteRef.resourceKind === 'item') {
          const restored = await readRestoredItemLoad({ item: remoteResource.item, kind: 'queue' });
          if (cancelled) {
            return;
          }
          if (restored.action === 'retire') {
            rememberPlaybackHandoffDismissal(
              buildPlaybackHandoffDismissedStateKey(conflict.remote)
            );
            continue;
          }
          promptResource = { ...remoteResource, item: restored.item };
        }

        const localTitlePromise = resolveConflictStateTitle(conflict.local);
        const serverTitle = queueResourceTitle(remoteResource);
        const resolvedServerTitle =
          serverTitle !== null ? serverTitle : await resolveConflictStateTitle(conflict.remote);
        const localTitle = await localTitlePromise;

        if (cancelled) {
          return;
        }
        // A paused load of the shared item can finish while the titles resolve.
        if (isLoadedReconcileResource(activeTargetRef.current, conflict.remote)) {
          continue;
        }

        setPlaybackHandoffPrompt({
          conflict,
          dismissedStateKey: buildPlaybackHandoffDismissedStateKey(conflict.remote),
          localTitle,
          remoteResource: promptResource,
          serverTitle: resolvedServerTitle,
        });
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    buildContext,
    handoffGate,
    playbackHandoffPrompt,
    playbackReconcileConflicts,
    readRestoredItemLoad,
    rememberPlaybackHandoffDismissal,
    resolveConflictStateTitle,
  ]);

  // Closing here records no dismissal: the conflict stays held and is offered again once the gate
  // allows it, unless its item is the one loaded by then.
  useEffect(() => {
    if (playbackHandoffPrompt === null) {
      return;
    }
    if (
      handoffGate === 'suppress' ||
      isLoadedReconcileResource(activeTarget, playbackHandoffPrompt.conflict.remote)
    ) {
      setPlaybackHandoffPrompt(null);
    }
  }, [activeTarget, handoffGate, playbackHandoffPrompt]);

  // While another device plays, the context's controls and item picks go to that device. Commands
  // never edit a queue, so a playlist row played there loses its auto-queue seed. The authoring
  // hold, `previewWindow`, `loadItemPausedAt`, and lock screen, headset, and car controls stay on
  // this phone.
  const sendRemotePlayItem = useCallback(
    async (
      resource: DTOPlaybackResourceRef,
      addByRssResourceData: AddByRSSResourceData | null,
      startSeconds: number | null,
      playLocally: () => Promise<void>
    ): Promise<void> => {
      const outcome = await crossDevice.sendControl({
        type: 'play_item',
        resource,
        add_by_rss_resource_data: addByRssResourceData,
        start_seconds: startSeconds,
      });
      if (outcome === 'no_device') {
        await playLocally();
      }
    },
    [crossDevice]
  );

  const routedPause = useCallback<PlaybackContextValue['pause']>(() => {
    if (crossDevice.isRemote()) {
      void crossDevice.sendControl({ type: 'pause' });
      return;
    }
    pause();
  }, [crossDevice, pause]);

  const routedResume = useCallback<PlaybackContextValue['resume']>(async () => {
    if (!crossDevice.isRemote()) {
      await resume();
      return;
    }
    if ((await crossDevice.sendControl({ type: 'play' })) === 'no_device') {
      await crossDevice.takeOverHere();
    }
  }, [crossDevice, resume]);

  const routedSeekTo = useCallback<PlaybackContextValue['seekTo']>(
    (seconds) => {
      if (crossDevice.isRemote()) {
        crossDevice.seekRemote(seconds);
        return;
      }
      seekTo(seconds);
    },
    [crossDevice, seekTo]
  );

  const routedJumpBy = useCallback<PlaybackContextValue['jumpBy']>(
    (deltaSeconds) => {
      if (crossDevice.isRemote()) {
        crossDevice.jumpRemote(deltaSeconds);
        return;
      }
      jumpBy(deltaSeconds);
    },
    [crossDevice, jumpBy]
  );

  const routedGoToLive = useCallback<PlaybackContextValue['goToLive']>(async () => {
    if (crossDevice.isRemote()) {
      return;
    }
    await goToLive();
  }, [crossDevice, goToLive]);

  const routedSetRate = useCallback<PlaybackContextValue['setRate']>(
    (rate) => {
      if (!crossDevice.isRemote()) {
        setRate(rate);
        return;
      }
      if (getCrossDevicePlaybackView().state?.is_live === true) {
        return;
      }
      void crossDevice.sendControl({ type: 'set_rate', rate });
    },
    [crossDevice, setRate]
  );

  const routedSkipToNext = useCallback<PlaybackContextValue['skipToNext']>(async () => {
    if (crossDevice.isRemote()) {
      void crossDevice.sendControl({ type: 'next' });
      return;
    }
    await skipToNext();
  }, [crossDevice, skipToNext]);

  const routedSkipToNextTrack = useCallback<PlaybackContextValue['skipToNextTrack']>(async () => {
    if (crossDevice.isRemote()) {
      void crossDevice.sendControl({ type: 'next' });
      return;
    }
    await skipToNextTrack();
  }, [crossDevice, skipToNextTrack]);

  const routedSkipToPrevious = useCallback<PlaybackContextValue['skipToPrevious']>(async () => {
    if (crossDevice.isRemote()) {
      void crossDevice.sendControl({ type: 'previous' });
      return;
    }
    await skipToPrevious();
  }, [crossDevice, skipToPrevious]);

  const routedSkipToPreviousTrack = useCallback<
    PlaybackContextValue['skipToPreviousTrack']
  >(async () => {
    if (crossDevice.isRemote()) {
      void crossDevice.sendControl({ type: 'previous' });
      return;
    }
    await skipToPreviousTrack();
  }, [crossDevice, skipToPreviousTrack]);

  const routedPlayItem = useCallback<PlaybackContextValue['playItem']>(
    async (item, channel, options) => {
      const playLocally = () => playItem(item, channel, options);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem(
        { kind: 'item', item_id_text: item.id_text },
        null,
        parsePlaybackSeconds(options?.explicitPlaybackSeconds) ?? null,
        playLocally
      );
    },
    [crossDevice, playItem, sendRemotePlayItem]
  );

  const routedPlayItemById = useCallback<PlaybackContextValue['playItemById']>(
    async (idText) => {
      const playLocally = () => playItemById(idText);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem({ kind: 'item', item_id_text: idText }, null, null, playLocally);
    },
    [crossDevice, playItemById, sendRemotePlayItem]
  );

  const routedPlayClip = useCallback<PlaybackContextValue['playClip']>(
    async (clip, item, channel) => {
      const playLocally = () => playClip(clip, item, channel);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem(
        { kind: 'clip', clip_id_text: clip.id_text },
        null,
        null,
        playLocally
      );
    },
    [crossDevice, playClip, sendRemotePlayItem]
  );

  const routedPlayClipById = useCallback<PlaybackContextValue['playClipById']>(
    async (idText) => {
      const playLocally = () => playClipById(idText);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem({ kind: 'clip', clip_id_text: idText }, null, null, playLocally);
    },
    [crossDevice, playClipById, sendRemotePlayItem]
  );

  const routedPlaySoundbite = useCallback<PlaybackContextValue['playSoundbite']>(
    async (soundbite, item, channel) => {
      const playLocally = () => playSoundbite(soundbite, item, channel);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem(
        { kind: 'soundbite', item_soundbite_id_text: soundbite.id_text },
        null,
        null,
        playLocally
      );
    },
    [crossDevice, playSoundbite, sendRemotePlayItem]
  );

  const routedPlayChapter = useCallback<PlaybackContextValue['playChapter']>(
    async (chapter, item, channel) => {
      const playLocally = () => playChapter(chapter, item, channel);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem(
        { kind: 'item', item_id_text: item.id_text },
        null,
        parsePlaybackSeconds(chapter.start_time) ?? 0,
        playLocally
      );
    },
    [crossDevice, playChapter, sendRemotePlayItem]
  );

  const routedPlayAddByRssResourceData = useCallback<
    PlaybackContextValue['playAddByRssResourceData']
  >(
    async (resourceData, options) => {
      const playLocally = () => playAddByRssResourceData(resourceData, options);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem(
        { kind: 'add_by_rss', add_by_rss_hash_id: addByRssPlaybackMediaId(resourceData) },
        withCanonicalAddByRssFeedUrl(resourceData),
        parsePlaybackSeconds(options?.explicitPlaybackSeconds) ?? null,
        playLocally
      );
    },
    [crossDevice, playAddByRssResourceData, sendRemotePlayItem]
  );

  const routedPlayQueueResourceFromQueue = useCallback<
    PlaybackContextValue['playQueueResourceFromQueue']
  >(
    async (resource) => {
      const playLocally = () => playQueueResourceFromQueue(resource);
      const playItemResource = crossDevice.isRemote()
        ? resolveQueueResourcePlayItem(resource)
        : null;
      if (playItemResource === null) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem(
        playItemResource.ref,
        playItemResource.addByRssResourceData,
        normalizePlaybackPosition(resource.playback_position) ?? null,
        playLocally
      );
    },
    [crossDevice, playQueueResourceFromQueue, sendRemotePlayItem]
  );

  const routedPlayPlaylistRowById = useCallback<PlaybackContextValue['playPlaylistRowById']>(
    async (idText, kind, playlistIdText) => {
      const playLocally = () => playPlaylistRowById(idText, kind, playlistIdText);
      if (!crossDevice.isRemote()) {
        await playLocally();
        return;
      }
      await sendRemotePlayItem(
        kind === 'clip'
          ? { kind: 'clip', clip_id_text: idText }
          : { kind: 'item', item_id_text: idText },
        null,
        null,
        playLocally
      );
    },
    [crossDevice, playPlaylistRowById, sendRemotePlayItem]
  );

  const sessionValue = useMemo<PlaybackSessionContextValue>(
    () => ({
      activeTarget,
      hasAutomaticNext,
      isPlaying,
      noticeKey,
      nowPlaying,
      enclosureSelectedParams,
      itemLabeledEnclosures,
      pause: routedPause,
      playChapter: routedPlayChapter,
      playAddByRssResourceData: routedPlayAddByRssResourceData,
      playClip: routedPlayClip,
      playClipById: routedPlayClipById,
      playItem: routedPlayItem,
      playItemById: routedPlayItemById,
      loadItemPausedAt,
      playPlaylistRowById: routedPlayPlaylistRowById,
      playQueueResourceFromQueue: routedPlayQueueResourceFromQueue,
      playSoundbite: routedPlaySoundbite,
      playbackRate,
      beginAuthoringHold,
      endAuthoringHold,
      isAuthoringHold,
      clearPauseBoundary,
      previewWindow,
      resume: routedResume,
      retryPlayback,
      lastPlaybackError,
      completeNowPlaying,
      jumpBy: routedJumpBy,
      goToLive: routedGoToLive,
      seekTo: routedSeekTo,
      setRate: routedSetRate,
      switchEnclosureSelectedParams,
      skipToPrevious: routedSkipToPrevious,
      skipToPreviousTrack: routedSkipToPreviousTrack,
      skipToNext: routedSkipToNext,
      skipToNextTrack: routedSkipToNextTrack,
      toggleRepeat,
      toggleShuffle,
      transportState,
      transferPlaybackTo: crossDevice.transferTo,
      takeOverPlaybackHere: crossDevice.takeOverHere,
    }),
    [
      activeTarget,
      hasAutomaticNext,
      completeNowPlaying,
      crossDevice,
      isPlaying,
      noticeKey,
      nowPlaying,
      enclosureSelectedParams,
      itemLabeledEnclosures,
      loadItemPausedAt,
      playbackRate,
      beginAuthoringHold,
      endAuthoringHold,
      isAuthoringHold,
      clearPauseBoundary,
      previewWindow,
      retryPlayback,
      lastPlaybackError,
      routedGoToLive,
      routedJumpBy,
      routedPause,
      routedPlayAddByRssResourceData,
      routedPlayChapter,
      routedPlayClip,
      routedPlayClipById,
      routedPlayItem,
      routedPlayItemById,
      routedPlayPlaylistRowById,
      routedPlayQueueResourceFromQueue,
      routedPlaySoundbite,
      routedResume,
      routedSeekTo,
      routedSetRate,
      routedSkipToNext,
      routedSkipToNextTrack,
      routedSkipToPrevious,
      routedSkipToPreviousTrack,
      switchEnclosureSelectedParams,
      toggleRepeat,
      toggleShuffle,
      transportState,
    ]
  );

  const rowValue = useMemo<PlaybackRowContextValue>(
    () => ({
      activeTarget,
      enclosureSelectedParams,
      itemLabeledEnclosures,
      noticeKey,
      pause: routedPause,
      playClipById: routedPlayClipById,
      playItemById: routedPlayItemById,
      resume: routedResume,
      switchEnclosureSelectedParams,
    }),
    [
      activeTarget,
      enclosureSelectedParams,
      itemLabeledEnclosures,
      noticeKey,
      routedPause,
      routedPlayClipById,
      routedPlayItemById,
      routedResume,
      switchEnclosureSelectedParams,
    ]
  );

  return (
    <PlaybackSessionContext.Provider value={sessionValue}>
      <PlaybackRowContext.Provider value={rowValue}>
        <PlaybackIsPlayingContext.Provider value={isPlaying}>
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
        </PlaybackIsPlayingContext.Provider>
      </PlaybackRowContext.Provider>
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

export function usePlaybackRow(): PlaybackRowContextValue {
  useEffect(() => {
    perfCount('playback.row.read');
  }, []);
  const context = useContext(PlaybackRowContext);
  if (context === undefined) {
    throw new Error('usePlaybackRow must be used within a PlaybackProvider');
  }
  return context;
}

export function usePlaybackIsPlaying(): boolean {
  const context = useContext(PlaybackIsPlayingContext);
  if (context === undefined) {
    throw new Error('usePlaybackIsPlaying must be used within a PlaybackProvider');
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

/** Media duration — re-renders when length changes, not on every playhead tick. */
export function usePlaybackDuration(): number {
  return useSyncExternalStore(
    subscribePlaybackDuration,
    getPlaybackDurationSeconds,
    getPlaybackDurationSeconds
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

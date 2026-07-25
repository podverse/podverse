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

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  DTOQueueResource,
} from '@podverse/helpers/dto';
import type { MusicItemPlaybackIntent, PlaybackTarget } from '@podverse/playback-core';
import { resolveQueueAdvance } from '@podverse/playback-core/resolveQueueAdvance';

import { useAuth } from '../auth/AuthProvider';
import { nativePlaybackBridge } from '../bridge/nativePlaybackBridge';
import { useNativePlaybackBridge } from '../bridge/useNativePlaybackBridge';
import { useAutoQueue } from '../contexts/AutoQueueProvider';
import { useQueues } from '../contexts/QueuesProvider';
import type { MobileAuthRequestContext } from '../data';
import { playbackContentRepository, statsRepository } from '../data';
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
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';

export type PlaybackNowPlaying = {
  title: string;
  imageUrl: string | null;
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

export type PlaybackContextValue = {
  activeTarget: PlaybackTarget | null;
  nowPlaying: PlaybackNowPlaying | null;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  playbackRate: number;
  /** Audio-first play notice key (e.g. missing enclosure, livestream deferred). */
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
};

const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

const summaryFromItem = (item: DTOItem, channel: DTOChannel): PlaybackNowPlaying => ({
  channelTitle: channel.title ?? null,
  imageUrl: item.item_images?.[0]?.url ?? channel.channel_images?.[0]?.url ?? null,
  title: item.title ?? '',
});

// Module-level guard so the anonymous restore fires at most once per app process (web parity with
// `anonymousPlaybackRestoreStarted` in AnonymousPlaybackRestoreController).
let anonymousPlaybackRestoreStarted = false;

export function PlaybackProvider({ children }: PropsWithChildren) {
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeQueue } = useQueues();
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

  const activeTargetRef = useRef<PlaybackTarget | null>(null);
  const positionRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const pauseAtRef = useRef<number | null>(null);
  const playbackRateRef = useRef<number>(1);
  const advancingRef = useRef<boolean>(false);
  const lastAnonymousSnapshotWriteRef = useRef<number>(0);

  const activeQueueRef = useRef(activeQueue);
  useEffect(() => {
    activeQueueRef.current = activeQueue;
  }, [activeQueue]);
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
  }, [account]);

  const buildContext = useCallback(
    (): MobileAuthRequestContext => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const ensureChannel = useCallback(
    async (item: DTOItem): Promise<DTOChannel | null> => {
      if (item.channel) {
        return item.channel;
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

  const recordPlaybackStats = useCallback(
    (target: PlaybackTarget): void => {
      if (statusRef.current !== 'authenticated') {
        return;
      }
      if (accountRef.current?.account_settings?.allow_listen_stats === false) {
        return;
      }
      statsRepository.trackPlaybackStats(buildContext(), playbackTargetToStatsTargets(target));
    },
    [buildContext]
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
    setIsPlaying(false);
  }, []);

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
      setIsPlaying(shouldAutoPlay);

      if (decision.shouldRecordPlaybackStat && shouldAutoPlay) {
        recordPlaybackStats(target);
      }
      if (statusRef.current === 'anonymous') {
        writeAnonymousSnapshot(target, decision.initialSeekSeconds);
      }
    },
    [applyAutoQueueDirective, applyLoad, recordPlaybackStats, writeAnonymousSnapshot]
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
        // Livestream is deferred (native HLS); audio-first PG-7a surfaces a notice instead.
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
    async (resource: DTOQueueResource, intent: MusicItemPlaybackIntent): Promise<void> => {
      const preserve: AutoQueueDirective = { mode: 'preserve' };
      if (resource.clip) {
        const item = resource.clip.item;
        const channel = await ensureChannel(item);
        if (channel === null) {
          return;
        }
        await startClipPlayback(resource.clip, item, channel, { autoQueue: preserve });
        return;
      }
      if (resource.item_soundbite && resource.item_soundbite.item) {
        const item = resource.item_soundbite.item;
        const channel = await ensureChannel(item);
        if (channel === null) {
          return;
        }
        await startSoundbitePlayback(resource.item_soundbite, item, channel, {
          autoQueue: preserve,
        });
        return;
      }
      const channel = await ensureChannel(resource.item);
      if (channel === null) {
        return;
      }
      await startItemPlayback(resource.item, channel, { autoQueue: preserve, intent });
    },
    [ensureChannel, startClipPlayback, startItemPlayback, startSoundbitePlayback]
  );

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

  const advance = useCallback(async (): Promise<void> => {
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
      const historyTarget =
        target !== null ? playbackTargetToHistoryTarget(target, positionRef.current) : null;
      if (historyTarget !== null) {
        await moveNowPlayingToHistory(historyTarget);
      }

      const result = await loadActive(activeQueueRef.current?.medium_id);
      const upcomingManualCount =
        result.activeResource !== null ? result.upcomingResources.length : 0;
      const hasAutoQueueNext = computeHasAutoQueueNext();
      const decision = resolveQueueAdvance({ hasAutoQueueNext, upcomingManualCount });

      if (decision.kind === 'play-next-manual' && result.activeResource !== null) {
        await playQueueResource(result.activeResource, 'fresh_transition');
      } else if (decision.kind === 'advance-auto-queue') {
        await advanceAutoQueue();
      } else {
        clearNowPlaying();
      }
    } finally {
      advancingRef.current = false;
    }
  }, [
    advanceAutoQueue,
    clearNowPlaying,
    computeHasAutoQueueNext,
    loadActive,
    moveNowPlayingToHistory,
    playQueueResource,
  ]);

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
      void advance();
    },
    error: () => {
      setIsPlaying(false);
    },
    playbackState: (event) => {
      if (event.state === 'playing') {
        setIsPlaying(true);
      } else if (event.state === 'paused' || event.state === 'ended' || event.state === 'error') {
        setIsPlaying(false);
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
        nativePlaybackBridge.pause();
        setIsPlaying(false);
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

  // Drive the video surface's JS-desired visibility from the playback target kind (2.23): only
  // full video items request the surface; clips/soundbites/chapters and audio podcasts keep it
  // hidden. The native host additionally gates on real video frames, so a video-medium item playing
  // an audio enclosure never leaves a black rectangle. No `load`/`destroy` — playhead is untouched.
  useEffect(() => {
    nativePlaybackBridge.setVideoSurfaceVisible(activeTarget?.kind === 'item-video');
  }, [activeTarget]);

  const pause = useCallback(() => {
    nativePlaybackBridge.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    await nativePlaybackBridge.play();
    setIsPlaying(true);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    nativePlaybackBridge.seek(seconds);
    positionRef.current = seconds;
    setPositionSeconds(seconds);
  }, []);

  const setRate = useCallback((rate: number) => {
    playbackRateRef.current = rate;
    setPlaybackRate(rate);
    nativePlaybackBridge.setRate(rate);
  }, []);

  const skipToNext = useCallback(() => advance(), [advance]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      activeTarget,
      durationSeconds,
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
      positionSeconds,
      resume,
      seekTo,
      setRate,
      skipToNext,
    }),
    [
      activeTarget,
      durationSeconds,
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
      positionSeconds,
      resume,
      seekTo,
      setRate,
      skipToNext,
    ]
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}

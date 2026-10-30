'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
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

import type { DTOAccount, PlaybackStatePublishBody } from '@podverse/helpers';
import { estimatePlaybackPositionSeconds } from '@podverse/helpers';

import { CrossDevicePlaybackPublisher } from '../components/CrossDevicePlayback/CrossDevicePlaybackPublisher';
import { CrossDevicePlaybackTrackCommands } from '../components/CrossDevicePlayback/CrossDevicePlaybackTrackCommands';
import { getApiRequestService } from '../factories/apiRequestService';
import { useCrossDevicePlaybackCommandExecutor } from '../hooks/useCrossDevicePlaybackCommandExecutor';
import { useCrossDevicePlaybackTransfer } from '../hooks/useCrossDevicePlaybackTransfer';
import { useMediaPlayerClearNowPlaying } from '../hooks/useMediaPlayerClearNowPlaying';
import {
  startPendingAvailabilityTimeout,
  startPlaybackCheckInLoop,
} from '../lib/crossDevicePlayback/crossDevicePlaybackCheckIn';
import type {
  CrossDevicePlaybackSnapshot,
  CrossDevicePlaybackStore,
} from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import {
  createCrossDevicePlaybackStore,
  crossDevicePlaybackStore,
} from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import { registerPlaybackCheckInHandler } from '../lib/crossDevicePlayback/playbackCheckInRequest';
import { publishPlaybackState } from '../lib/crossDevicePlayback/playbackClaim';
import type { PlaybackTabMessage } from '../lib/crossDevicePlayback/playbackTabChannel';
import { startPlaybackTabChannel } from '../lib/crossDevicePlayback/playbackTabChannel';
import { useAccount } from './Account';
import { useEmbedPlaybackGuardrails } from './EmbedPlaybackMode';
import { useMediaPlayer } from './MediaPlayer';
import { useNotifications } from './Notifications';

/** The audio tab announces itself this often while it holds audio. */
const AUDIO_TAB_HEARTBEAT_MS = 5_000;
/**
 * The stream leader checks this often whether the active state still has an audio tab. Every tab
 * also drops a silent audio tab on this interval.
 */
const LEADER_RECONCILE_INTERVAL_MS = 5_000;
/** No audio-tab message or state for this long means the audio tab reloaded or crashed. */
const AUDIO_TAB_SILENCE_MS = 12_000;
/** How long a new tab waits for the audio tab to answer its query before it plays here. */
const AUDIO_TAB_QUERY_WAIT_MS = 1_000;

/** `app/embed/layout.tsx` applies the embed guardrails to this path and everything under it. */
const EMBED_LAYOUT_PATHNAME = '/embed';

const SERVER_SNAPSHOT: CrossDevicePlaybackSnapshot = createCrossDevicePlaybackStore({
  tabId: '',
}).getSnapshot();

type CrossDevicePlaybackContextValue = {
  store: CrossDevicePlaybackStore;
  /** Runs one check-in now; no-op unless the stream is open. */
  checkInNow: () => void;
  /** False when this browser has no tab channel, or before it opens. */
  tabChannelAvailable: boolean;
  confirmTapToPlay: () => void;
  dismissTapToPlay: () => void;
  /** Another session: sends a take-over and tracks its result. This session: takes over here. */
  transferTo: (targetSessionIdText: string) => Promise<void>;
  /** Loads the shared item in this tab where the playing device is, starts it, and claims. */
  takeOverHere: () => Promise<void>;
  dismissTransferFailure: () => void;
};

const CrossDevicePlaybackContext = createContext<CrossDevicePlaybackContextValue | null>(null);

function isEmbedLayoutPathname(pathname: string | null): boolean {
  if (pathname === null) {
    return false;
  }
  return pathname === EMBED_LAYOUT_PATHNAME || pathname.startsWith(`${EMBED_LAYOUT_PATHNAME}/`);
}

function holdsOrClaimsAudio(snapshot: CrossDevicePlaybackSnapshot): boolean {
  return snapshot.thisTabHoldsAudio || snapshot.claimPending;
}

function isThisSessionActive(snapshot: CrossDevicePlaybackSnapshot): boolean {
  return (
    snapshot.availability === 'ready' &&
    snapshot.thisSessionIdText !== null &&
    snapshot.state?.active_session_id_text === snapshot.thisSessionIdText
  );
}

/** Newer claim wins; equal claim times go to the larger tab id. */
function isNewerAudioTabClaim(
  message: { tabId: string; claimedAtMs: number },
  own: { tabId: string; claimedAtMs: number }
): boolean {
  return (
    message.claimedAtMs > own.claimedAtMs ||
    (message.claimedAtMs === own.claimedAtMs && message.tabId > own.tabId)
  );
}

function publishToApi(body: PlaybackStatePublishBody) {
  return getApiRequestService().reqAccountPlaybackPublishState(body);
}

function createBrowserChannel(name: string) {
  return new BroadcastChannel(name);
}

/** Re-renders only when the selected value changes (`useSyncExternalStore` plus `Object.is`). */
export function useCrossDevicePlaybackSnapshot<T>(
  select: (snapshot: CrossDevicePlaybackSnapshot) => T
): T {
  return useSyncExternalStore(
    crossDevicePlaybackStore.subscribe,
    () => select(crossDevicePlaybackStore.getSnapshot()),
    () => select(SERVER_SNAPSHOT)
  );
}

export function useCrossDevicePlayback(): CrossDevicePlaybackContextValue {
  const value = useContext(CrossDevicePlaybackContext);
  if (value === null) {
    throw new Error('useCrossDevicePlayback must be used within a CrossDevicePlaybackProvider');
  }
  return value;
}

export function CrossDevicePlaybackProvider({ children }: { children: ReactNode }) {
  const { loggedInAccount } = useAccount();
  const { notificationStreamStatus, notificationStreamIsLeader, subscribeToPlaybackStream } =
    useNotifications();
  const { mpAddByRSS, mpItem, mpClip, mpItemSoundbite } = useMediaPlayer();
  const clearNowPlaying = useMediaPlayerClearNowPlaying();
  const pathname = usePathname();
  // The embed layout's guardrails context sits below this provider, so the pathname decides there.
  const { isEmbedRoute: isUnderEmbedGuardrails } = useEmbedPlaybackGuardrails();

  const accountId = loggedInAccount?.id ?? null;
  const enabled = accountId !== null && !isUnderEmbedGuardrails && !isEmbedLayoutPathname(pathname);
  const streamOpen = notificationStreamStatus === 'open';
  const playerHoldsResource = Boolean(mpAddByRSS || mpItem || mpClip || mpItemSoundbite);

  const availabilityIsOff = useCrossDevicePlaybackSnapshot(
    (snapshot) => snapshot.availability === 'off'
  );
  const pendingSinceMs = useCrossDevicePlaybackSnapshot((snapshot) => snapshot.pendingSinceMs);
  const role = useCrossDevicePlaybackSnapshot((snapshot) => snapshot.role);

  const [tabChannelAvailable, setTabChannelAvailable] = useState(false);
  const checkInNowRef = useRef<() => void>(() => undefined);
  const membershipBlockedAccountRef = useRef<DTOAccount | null>(null);
  const lastBodyRef = useRef<PlaybackStatePublishBody | null>(null);
  const clearNowPlayingRef = useRef(clearNowPlaying);

  useEffect(() => {
    clearNowPlayingRef.current = clearNowPlaying;
  }, [clearNowPlaying]);

  useEffect(() => {
    crossDevicePlaybackStore.reset({ accountId, enabled });
  }, [accountId, enabled]);

  useEffect(
    () =>
      subscribeToPlaybackStream((event, receivedAtMs) => {
        crossDevicePlaybackStore.applyStreamEvent(event, receivedAtMs);
      }),
    [subscribeToPlaybackStream]
  );

  // `reset` clears the stream fields, so they are applied again after every reset.
  useEffect(() => {
    crossDevicePlaybackStore.setStream({
      open: streamOpen,
      isLeader: notificationStreamIsLeader,
    });
  }, [accountId, enabled, streamOpen, notificationStreamIsLeader]);

  useEffect(() => {
    if (!streamOpen || availabilityIsOff || loggedInAccount === null) {
      return;
    }
    if (membershipBlockedAccountRef.current === loggedInAccount) {
      return;
    }
    const loop = startPlaybackCheckInLoop({
      store: crossDevicePlaybackStore,
      checkIn: () => getApiRequestService().reqAccountPlaybackCheckIn(),
      isLeader: () => crossDevicePlaybackStore.getSnapshot().isStreamLeader,
      onMembershipBlocked: () => {
        membershipBlockedAccountRef.current = loggedInAccount;
      },
    });
    checkInNowRef.current = loop.checkInNow;
    return () => {
      loop.stop();
      checkInNowRef.current = () => undefined;
    };
  }, [streamOpen, availabilityIsOff, loggedInAccount]);

  // While the stream is open the check-in loop owns the pending timeout.
  useEffect(() => {
    if (streamOpen || pendingSinceMs === null) {
      return;
    }
    return startPendingAvailabilityTimeout({ store: crossDevicePlaybackStore });
  }, [streamOpen, pendingSinceMs]);

  useEffect(() => {
    if (!enabled || accountId === null) {
      return;
    }
    const store = crossDevicePlaybackStore;
    const { tabId } = store.getSnapshot();
    const startedAtMs = Date.now();
    /** When this tab began holding or claiming audio; unchanged across heartbeats. */
    let claimedAtMs: number | null = null;
    let heartbeatId: number | null = null;
    let reconcileInFlight = false;

    const channel = startPlaybackTabChannel({
      accountId,
      tabId,
      createChannel: typeof BroadcastChannel === 'function' ? createBrowserChannel : null,
      onMessage: (message) => {
        handleMessage(message);
      },
    });
    setTabChannelAvailable(channel.available);
    let audioTabSearchId: number | null = null;
    if (channel.available) {
      channel.askForAudioTab();
      audioTabSearchId = window.setTimeout(
        () => store.settleAudioTabSearch(),
        AUDIO_TAB_QUERY_WAIT_MS
      );
    }

    const announceAudioTab = () => {
      if (claimedAtMs !== null && store.getSnapshot().thisTabHoldsAudio) {
        channel.announceAudioTab(claimedAtMs);
      }
    };

    const stopHeartbeat = () => {
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId);
        heartbeatId = null;
      }
    };

    const syncAudioTab = () => {
      const snapshot = store.getSnapshot();
      if (!holdsOrClaimsAudio(snapshot)) {
        claimedAtMs = null;
      } else if (claimedAtMs === null) {
        claimedAtMs = Date.now();
      }
      if (!snapshot.thisTabHoldsAudio) {
        stopHeartbeat();
      } else if (heartbeatId === null) {
        announceAudioTab();
        heartbeatId = window.setInterval(announceAudioTab, AUDIO_TAB_HEARTBEAT_MS);
      }
    };

    /** The closing audio tab's last state, paused, when this tab leads and this session is active. */
    const publishClosedAudioTabState = (lastState: PlaybackStatePublishBody | null) => {
      const snapshot = store.getSnapshot();
      if (
        lastState === null ||
        !snapshot.isStreamLeader ||
        holdsOrClaimsAudio(snapshot) ||
        !isThisSessionActive(snapshot)
      ) {
        return;
      }
      void publishPlaybackState({
        store,
        body: { ...lastState, claim: false, status: 'paused' },
        publish: publishToApi,
      });
    };

    function handleMessage(message: PlaybackTabMessage) {
      const snapshot = store.getSnapshot();
      switch (message.kind) {
        case 'audio-tab': {
          if (
            holdsOrClaimsAudio(snapshot) &&
            claimedAtMs !== null &&
            !isNewerAudioTabClaim(message, { tabId, claimedAtMs })
          ) {
            announceAudioTab();
            return;
          }
          store.noteAudioTab(message.tabId, Date.now());
          return;
        }
        case 'audio-tab-gone':
          store.noteAudioTabGone(message.tabId);
          publishClosedAudioTabState(message.lastState);
          return;
        case 'tab-focused':
          store.noteFocusedTab(message.tabId);
          return;
        case 'tab-gone':
          if (snapshot.lastFocusedTabId === message.tabId) {
            store.noteFocusedTab(null);
          }
          return;
        case 'audio-tab-query':
          announceAudioTab();
          return;
      }
    }

    const announceFocus = () => {
      store.noteFocusedTab(tabId);
      channel.announceFocused(Date.now());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        announceFocus();
      }
    };

    const handlePageHide = () => {
      if (store.getSnapshot().thisTabHoldsAudio) {
        const lastBody = lastBodyRef.current;
        channel.announceAudioTabGone(
          lastBody === null ? null : { ...lastBody, claim: false, status: 'paused' }
        );
      }
      channel.announceGone();
    };

    /** Pauses the active state when no tab of this session has held its audio for a while. */
    const reconcile = () => {
      const snapshot = store.getSnapshot();
      const { state } = snapshot;
      if (
        !channel.available ||
        reconcileInFlight ||
        !snapshot.isStreamLeader ||
        holdsOrClaimsAudio(snapshot) ||
        !isThisSessionActive(snapshot) ||
        state === null ||
        state.resource === null ||
        (state.status !== 'playing' && state.status !== 'loading')
      ) {
        return;
      }
      const nowMs = Date.now();
      const lastSignOfAudioMs = Math.max(
        startedAtMs,
        snapshot.audioTab?.lastSeenMs ?? 0,
        snapshot.stateReceivedAtMs ?? 0
      );
      if (nowMs - lastSignOfAudioMs < AUDIO_TAB_SILENCE_MS) {
        return;
      }
      reconcileInFlight = true;
      void publishPlaybackState({
        store,
        body: {
          claim: false,
          resource: state.resource,
          status: 'paused',
          is_live: state.is_live,
          position_seconds: state.is_live
            ? null
            : estimatePlaybackPositionSeconds({
                state,
                receivedAtMs: snapshot.stateReceivedAtMs ?? nowMs,
                nowMs,
              }),
          duration_seconds: state.duration_seconds,
          rate: state.rate,
        },
        publish: publishToApi,
      }).finally(() => {
        reconcileInFlight = false;
      });
    };

    syncAudioTab();
    const unsubscribe = store.subscribe(syncAudioTab);
    window.addEventListener('focus', announceFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    const tick = () => {
      store.expireSilentAudioTab(Date.now(), AUDIO_TAB_SILENCE_MS);
      reconcile();
    };
    const reconcileId = window.setInterval(tick, LEADER_RECONCILE_INTERVAL_MS);
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      announceFocus();
    }

    return () => {
      unsubscribe();
      stopHeartbeat();
      if (audioTabSearchId !== null) {
        window.clearTimeout(audioTabSearchId);
      }
      window.clearInterval(reconcileId);
      window.removeEventListener('focus', announceFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      channel.close();
      setTabChannelAvailable(false);
    };
  }, [accountId, enabled]);

  // The store already reads `remote`, so the save hooks skip the pause this clear causes.
  useEffect(() => {
    if (role !== 'remote') {
      return;
    }
    const snapshot = crossDevicePlaybackStore.getSnapshot();
    if (snapshot.role !== 'remote') {
      return;
    }
    if (snapshot.thisTabHoldsAudio) {
      crossDevicePlaybackStore.releaseAudio();
    }
    if (playerHoldsResource) {
      clearNowPlayingRef.current();
    }
  }, [role, playerHoldsResource]);

  const { confirmTapToPlay, dismissTapToPlay } = useCrossDevicePlaybackCommandExecutor();

  const checkInNow = useCallback(() => {
    checkInNowRef.current();
  }, []);

  useEffect(() => registerPlaybackCheckInHandler(checkInNow), [checkInNow]);

  const { transferTo, takeOverHere, dismissTransferFailure } = useCrossDevicePlaybackTransfer({
    checkInNow,
    tabChannelAvailable,
  });

  const value = useMemo(
    () => ({
      store: crossDevicePlaybackStore,
      checkInNow,
      tabChannelAvailable,
      confirmTapToPlay,
      dismissTapToPlay,
      transferTo,
      takeOverHere,
      dismissTransferFailure,
    }),
    [
      checkInNow,
      tabChannelAvailable,
      confirmTapToPlay,
      dismissTapToPlay,
      transferTo,
      takeOverHere,
      dismissTransferFailure,
    ]
  );

  return (
    <CrossDevicePlaybackContext.Provider value={value}>
      <CrossDevicePlaybackPublisher lastBodyRef={lastBodyRef} />
      <CrossDevicePlaybackTrackCommands />
      {children}
    </CrossDevicePlaybackContext.Provider>
  );
}

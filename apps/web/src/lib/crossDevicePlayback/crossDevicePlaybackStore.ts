import type {
  AccountPlaybackStreamEvent,
  DTOPlaybackCommandEnvelope,
  DTOPlaybackDevices,
  DTOPlaybackStartFailed,
  DTOPlaybackState,
  PlaybackPresenceResponse,
  PlaybackRole,
  PlaybackStartFailedReason,
  PlaybackStatePublishBody,
  PlaybackStatePublishResponse,
} from '@podverse/helpers';
import {
  ACCOUNT_PLAYBACK_STREAM_EVENT,
  estimatePlaybackPositionSeconds,
  isNewerPlaybackRevision,
  PLAYBACK_COMMAND_TTL_MS,
} from '@podverse/helpers';

import type { CrossDevicePlaybackAvailability } from './tabPlaybackRole';
import { resolveTabPlaybackRole } from './tabPlaybackRole';

export type TransferFailureReason =
  PlaybackStartFailedReason | 'no_response' | 'not_connected' | 'request_failed';

export type CrossDevicePlaybackSnapshot = {
  availability: CrossDevicePlaybackAvailability;
  /** When availability last became `pending`; null otherwise. The provider settles it after 5 s. */
  pendingSinceMs: number | null;
  accountId: number | null;
  tabId: string;
  thisSessionIdText: string | null;
  streamOpen: boolean;
  isStreamLeader: boolean;
  devices: DTOPlaybackDevices | null;
  /** Last server state, or the state this tab's own publish wrote. */
  state: DTOPlaybackState | null;
  stateReceivedAtMs: number | null;
  /** `state` with the optimistic command patch applied; what remote views show. */
  displayState: DTOPlaybackState | null;
  claimPending: boolean;
  thisTabHoldsAudio: boolean;
  audioTab: { tabId: string; lastSeenMs: number } | null;
  /**
   * True once this tab asked the other tabs of this browser who holds audio and the wait ended.
   * Until then a tab of the active session assumes another tab holds audio.
   */
  audioTabSearchSettled: boolean;
  lastFocusedTabId: string | null;
  role: PlaybackRole;
  pendingTransfer: { commandIdText: string; targetSessionIdText: string; sentAtMs: number } | null;
  transferFailure: { targetSessionIdText: string; reason: TransferFailureReason } | null;
  /** Set while a start this tab was asked to make is waiting for a tap. Null command id: local take-over. */
  tapToPlay: { commandIdText: string | null } | null;
  pendingCommandStart: { commandIdText: string; atMs: number } | null;
};

export type CrossDevicePlaybackSignal =
  | { kind: 'command'; envelope: DTOPlaybackCommandEnvelope; receivedAtMs: number }
  | { kind: 'start_failed'; report: DTOPlaybackStartFailed }
  | { kind: 'local_play_blocked' };

export type OptimisticPlaybackPatch = Partial<
  Pick<DTOPlaybackState, 'status' | 'position_seconds' | 'rate'>
>;

type StoreCore = Omit<CrossDevicePlaybackSnapshot, 'role' | 'displayState'> & {
  /** Revision of this tab's last accepted publish; no older state replaces it. */
  revisionFloor: number | null;
  optimisticPatch: { values: OptimisticPlaybackPatch; atMs: number } | null;
};

/** A command patch outlives the command's own TTL by this much, then the server state shows. */
const OPTIMISTIC_PATCH_LIFETIME_MS = PLAYBACK_COMMAND_TTL_MS + 1000;

function createTabId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function createInitialCore(params: {
  tabId: string;
  accountId: number | null;
  availability: CrossDevicePlaybackAvailability;
  pendingSinceMs: number | null;
}): StoreCore {
  return {
    availability: params.availability,
    pendingSinceMs: params.pendingSinceMs,
    accountId: params.accountId,
    tabId: params.tabId,
    thisSessionIdText: null,
    streamOpen: false,
    isStreamLeader: false,
    devices: null,
    state: null,
    stateReceivedAtMs: null,
    claimPending: false,
    thisTabHoldsAudio: false,
    audioTab: null,
    audioTabSearchSettled: false,
    lastFocusedTabId: null,
    pendingTransfer: null,
    transferFailure: null,
    tapToPlay: null,
    pendingCommandStart: null,
    revisionFloor: null,
    optimisticPatch: null,
  };
}

function buildSnapshot(core: StoreCore): CrossDevicePlaybackSnapshot {
  const displayState =
    core.state !== null && core.optimisticPatch !== null
      ? { ...core.state, ...core.optimisticPatch.values }
      : core.state;
  return {
    availability: core.availability,
    pendingSinceMs: core.pendingSinceMs,
    accountId: core.accountId,
    tabId: core.tabId,
    thisSessionIdText: core.thisSessionIdText,
    streamOpen: core.streamOpen,
    isStreamLeader: core.isStreamLeader,
    devices: core.devices,
    state: core.state,
    stateReceivedAtMs: core.stateReceivedAtMs,
    displayState,
    claimPending: core.claimPending,
    thisTabHoldsAudio: core.thisTabHoldsAudio,
    audioTab: core.audioTab,
    audioTabSearchSettled: core.audioTabSearchSettled,
    lastFocusedTabId: core.lastFocusedTabId,
    role: resolveTabPlaybackRole({
      availability: core.availability,
      thisSessionIdText: core.thisSessionIdText,
      activeSessionIdText: core.state?.active_session_id_text ?? null,
      thisTabHoldsAudio: core.thisTabHoldsAudio,
      anotherTabMayHoldAudio:
        !core.audioTabSearchSettled ||
        (core.audioTab !== null && core.audioTab.tabId !== core.tabId),
      claimPending: core.claimPending,
    }),
    pendingTransfer: core.pendingTransfer,
    transferFailure: core.transferFailure,
    tapToPlay: core.tapToPlay,
    pendingCommandStart: core.pendingCommandStart,
  };
}

function hasChanges(current: StoreCore, changes: Partial<StoreCore>): boolean {
  return Object.entries(changes).some(([key, value]) => {
    const currentValue: unknown = Reflect.get(current, key);
    return !Object.is(currentValue, value);
  });
}

function isNotAllowedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'NotAllowedError'
  );
}

/**
 * This tab's view of cross-device playback, readable with `useSyncExternalStore`. Every mutation
 * replaces the snapshot and recomputes `role` and `displayState`; a call that changes nothing does
 * not notify. Commands and start-failed reports are delivered as signals and never stored.
 */
export function createCrossDevicePlaybackStore(options?: { now?: () => number; tabId?: string }) {
  const now = options?.now ?? (() => Date.now());
  const tabId = options?.tabId ?? createTabId();

  let core = createInitialCore({
    tabId,
    accountId: null,
    availability: 'off',
    pendingSinceMs: null,
  });
  let snapshot = buildSnapshot(core);
  const listeners = new Set<() => void>();
  const signalListeners = new Set<(signal: CrossDevicePlaybackSignal) => void>();

  const isPatchExpired = (patch: StoreCore['optimisticPatch'], nowMs: number): boolean =>
    patch !== null && nowMs - patch.atMs >= OPTIMISTIC_PATCH_LIFETIME_MS;

  /** Drops an expired optimistic patch without notifying; reads call this. */
  const expireOptimisticPatch = () => {
    if (isPatchExpired(core.optimisticPatch, now())) {
      core = { ...core, optimisticPatch: null };
      snapshot = buildSnapshot(core);
    }
  };

  const update = (changes: Partial<StoreCore>) => {
    expireOptimisticPatch();
    if (!hasChanges(core, changes)) {
      return;
    }
    core = { ...core, ...changes };
    snapshot = buildSnapshot(core);
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const emitSignal = (signal: CrossDevicePlaybackSignal) => {
    for (const listener of [...signalListeners]) {
      listener(signal);
    }
  };

  const availabilityChanges = (
    availability: CrossDevicePlaybackAvailability
  ): Pick<StoreCore, 'availability' | 'pendingSinceMs'> => {
    if (availability !== 'pending') {
      return { availability, pendingSinceMs: null };
    }
    return {
      availability,
      pendingSinceMs: core.availability === 'pending' ? core.pendingSinceMs : now(),
    };
  };

  /** Clears the pending transfer and its failure once a state names the transfer target. */
  const transferChangesForState = (
    state: DTOPlaybackState | null
  ): Partial<Pick<StoreCore, 'pendingTransfer' | 'transferFailure'>> => {
    const activeSessionIdText = state?.active_session_id_text ?? null;
    if (activeSessionIdText === null) {
      return {};
    }
    const changes: Partial<Pick<StoreCore, 'pendingTransfer' | 'transferFailure'>> = {};
    if (core.pendingTransfer?.targetSessionIdText === activeSessionIdText) {
      changes.pendingTransfer = null;
    }
    if (core.transferFailure?.targetSessionIdText === activeSessionIdText) {
      changes.transferFailure = null;
    }
    return changes;
  };

  const stateChanges = (
    state: DTOPlaybackState | null,
    receivedAtMs: number
  ): Partial<StoreCore> => ({
    state,
    stateReceivedAtMs: state === null ? null : receivedAtMs,
    optimisticPatch: null,
    ...transferChangesForState(state),
  });

  /** A server state replaces the current one only when newer than both it and the floor. */
  const isAcceptedState = (state: { revision: number }): boolean =>
    isNewerPlaybackRevision(core.state, state) &&
    (core.revisionFloor === null || state.revision > core.revisionFloor);

  const estimatePositionAt = (nowMs: number): number | null => {
    const displayState = snapshot.displayState;
    if (displayState === null) {
      return null;
    }
    if (core.optimisticPatch !== null) {
      return estimatePlaybackPositionSeconds({
        state: { ...displayState, updated_at_ms: 0, sent_at_ms: 0 },
        receivedAtMs: core.optimisticPatch.atMs,
        nowMs,
      });
    }
    if (core.stateReceivedAtMs === null) {
      return null;
    }
    return estimatePlaybackPositionSeconds({
      state: displayState,
      receivedAtMs: core.stateReceivedAtMs,
      nowMs,
    });
  };

  const releaseAudioChanges = (): Partial<StoreCore> => ({
    thisTabHoldsAudio: false,
    claimPending: false,
    audioTab: core.audioTab?.tabId === tabId ? null : core.audioTab,
  });

  return {
    getSnapshot(): CrossDevicePlaybackSnapshot {
      expireOptimisticPatch();
      return snapshot;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** Commands and start-failed reports are signals, not state. */
    subscribeToSignals(listener: (signal: CrossDevicePlaybackSignal) => void): () => void {
      signalListeners.add(listener);
      return () => {
        signalListeners.delete(listener);
      };
    },

    reset(params: { accountId: number | null; enabled: boolean }): void {
      const isOff = !params.enabled || params.accountId === null;
      update(
        createInitialCore({
          tabId,
          accountId: params.accountId,
          availability: isOff ? 'off' : 'pending',
          pendingSinceMs: isOff ? null : now(),
        })
      );
    },

    setStream(params: { open: boolean; isLeader: boolean }): void {
      update({ streamOpen: params.open, isStreamLeader: params.isLeader });
    },

    markPending(): void {
      if (core.availability === 'off') {
        return;
      }
      update(availabilityChanges('pending'));
    },

    markUnavailable(): void {
      if (core.availability === 'off') {
        return;
      }
      update(availabilityChanges('unavailable'));
    },

    applyPresenceResponse(response: PlaybackPresenceResponse, receivedAtMs: number): void {
      if (core.availability === 'off') {
        return;
      }
      update({
        thisSessionIdText: response.session_id_text,
        ...availabilityChanges('ready'),
        ...(isNewerPlaybackRevision(core.devices, response.devices)
          ? { devices: response.devices }
          : {}),
        ...(response.state !== null && isAcceptedState(response.state)
          ? stateChanges(response.state, receivedAtMs)
          : {}),
      });
    },

    applyStreamEvent(event: AccountPlaybackStreamEvent, receivedAtMs: number): void {
      if (core.availability === 'off') {
        return;
      }
      switch (event.type) {
        case ACCOUNT_PLAYBACK_STREAM_EVENT.snapshot:
          update({
            devices: event.data.devices,
            revisionFloor: event.data.state?.revision ?? null,
            ...stateChanges(event.data.state, receivedAtMs),
          });
          return;
        case ACCOUNT_PLAYBACK_STREAM_EVENT.state:
          if (isAcceptedState(event.data)) {
            update(stateChanges(event.data, receivedAtMs));
          }
          return;
        case ACCOUNT_PLAYBACK_STREAM_EVENT.devices:
          if (isNewerPlaybackRevision(core.devices, event.data)) {
            update({ devices: event.data });
          }
          return;
        case ACCOUNT_PLAYBACK_STREAM_EVENT.command:
          emitSignal({ kind: 'command', envelope: event.data, receivedAtMs });
          return;
        case ACCOUNT_PLAYBACK_STREAM_EVENT.startFailed:
          emitSignal({ kind: 'start_failed', report: event.data });
          return;
      }
    },

    /**
     * Keeps the state this tab published at the revision the server wrote, so the position
     * estimate starts from the published position now and older stream events are ignored.
     */
    applyOwnPublish(body: PlaybackStatePublishBody, response: PlaybackStatePublishResponse): void {
      if (!isAcceptedState(response)) {
        return;
      }
      const state: DTOPlaybackState = {
        revision: response.revision,
        active_session_id_text: response.active_session_id_text,
        resource: body.resource,
        status: body.status,
        is_live: body.is_live,
        position_seconds: body.position_seconds,
        duration_seconds: body.duration_seconds,
        rate: body.rate,
        updated_at_ms: 0,
        sent_at_ms: 0,
      };
      update({ revisionFloor: response.revision, ...stateChanges(state, now()) });
    },

    beginClaim(): void {
      update({ claimPending: true });
    },

    confirmClaim(): void {
      update({
        thisTabHoldsAudio: true,
        claimPending: false,
        audioTab: { tabId, lastSeenMs: now() },
      });
    },

    abandonClaim(): void {
      update({ claimPending: false });
    },

    /** This tab stops holding audio (lost to another device or tab, or released). */
    releaseAudio(): void {
      update(releaseAudioChanges());
    },

    /** Another tab's newer claim wins: this tab releases its audio or pending claim. */
    noteAudioTab(audioTabId: string, atMs: number): void {
      const audioTab =
        core.audioTab?.tabId === audioTabId && core.audioTab.lastSeenMs === atMs
          ? core.audioTab
          : { tabId: audioTabId, lastSeenMs: atMs };
      const losesAudio = audioTabId !== tabId && (core.thisTabHoldsAudio || core.claimPending);
      update({
        ...(losesAudio ? releaseAudioChanges() : {}),
        audioTab,
      });
    },

    noteAudioTabGone(audioTabId: string): void {
      if (core.audioTab?.tabId === audioTabId) {
        update({ audioTab: null });
      }
    },

    /** The wait for an answer to this tab's audio-tab query ended. */
    settleAudioTabSearch(): void {
      update({ audioTabSearchSettled: true });
    },

    /**
     * Drops another tab's audio entry once it has sent no heartbeat for `silenceMs`, as when that
     * tab crashed without saying it left. This tab's own entry follows `thisTabHoldsAudio`.
     */
    expireSilentAudioTab(nowMs: number, silenceMs: number): void {
      const { audioTab } = core;
      if (
        audioTab !== null &&
        audioTab.tabId !== tabId &&
        nowMs - audioTab.lastSeenMs >= silenceMs
      ) {
        update({ audioTab: null });
      }
    },

    noteFocusedTab(focusedTabId: string | null): void {
      update({ lastFocusedTabId: focusedTabId });
    },

    /**
     * Patches the displayed state at once so a second command computes from the first one's
     * target. Without a position of its own, the patch freezes the current estimate as its start.
     */
    setOptimisticPatch(patch: OptimisticPlaybackPatch): void {
      expireOptimisticPatch();
      const nowMs = now();
      const estimatedPosition = estimatePositionAt(nowMs);
      update({
        optimisticPatch: {
          values: {
            ...core.optimisticPatch?.values,
            ...(estimatedPosition === null ? {} : { position_seconds: estimatedPosition }),
            ...patch,
          },
          atMs: nowMs,
        },
      });
    },

    clearOptimisticPatch(): void {
      update({ optimisticPatch: null });
    },

    /** Estimated position of `displayState` now; null when live, unknown, or no state. */
    getEstimatedPositionSeconds(): number | null {
      expireOptimisticPatch();
      return estimatePositionAt(now());
    },

    setPendingTransfer(value: CrossDevicePlaybackSnapshot['pendingTransfer']): void {
      update({ pendingTransfer: value });
    },

    setTransferFailure(value: CrossDevicePlaybackSnapshot['transferFailure']): void {
      update({ transferFailure: value });
    },

    setTapToPlay(value: CrossDevicePlaybackSnapshot['tapToPlay']): void {
      update({ tapToPlay: value });
    },

    setPendingCommandStart(commandIdText: string | null): void {
      update({
        pendingCommandStart: commandIdText === null ? null : { commandIdText, atMs: now() },
      });
    },

    /** Called by media controllers on any rejected `play()`; emits `local_play_blocked` for `NotAllowedError`. */
    notifyLocalPlayRejected(error: unknown): void {
      if (isNotAllowedError(error)) {
        emitSignal({ kind: 'local_play_blocked' });
      }
    },

    /** True unless this tab's role is `remote`. Save hooks call it synchronously. */
    isLocalPlaybackWriteAllowed(): boolean {
      return snapshot.role !== 'remote';
    },
  };
}

export type CrossDevicePlaybackStore = ReturnType<typeof createCrossDevicePlaybackStore>;

export const crossDevicePlaybackStore: CrossDevicePlaybackStore = createCrossDevicePlaybackStore();

import { describe, expect, it } from 'vitest';

import type {
  DTOPlaybackCommandEnvelope,
  DTOPlaybackState,
  PlaybackStatePublishBody,
} from '@podverse/helpers';
import { ACCOUNT_PLAYBACK_STREAM_EVENT, MediumEnum } from '@podverse/helpers';

import type { CrossDevicePlaybackSignal } from './crossDevicePlaybackStore';
import { createCrossDevicePlaybackStore } from './crossDevicePlaybackStore';

const RESOURCE = {
  ref: { kind: 'item' as const, item_id_text: 'item-1' },
  medium: MediumEnum.Podcast,
  title: 'Episode Title',
  channel_title: 'Channel Title',
  image_url: null,
};

function state(revision: number, overrides: Partial<DTOPlaybackState> = {}): DTOPlaybackState {
  return {
    revision,
    active_session_id_text: 'session-other',
    resource: RESOURCE,
    status: 'playing',
    is_live: false,
    position_seconds: 100,
    duration_seconds: 600,
    rate: 1,
    updated_at_ms: 5_000,
    sent_at_ms: 5_000,
    ...overrides,
  };
}

const CLAIM_BODY: PlaybackStatePublishBody = {
  claim: true,
  resource: RESOURCE,
  status: 'playing',
  is_live: false,
  position_seconds: 30,
  duration_seconds: 600,
  rate: 1,
};

/** A store whose tab has checked in as `session-this`, on a clock the test advances. */
function readyStore() {
  let nowMs = 1_000_000;
  const clock = {
    now: () => nowMs,
    advance: (ms: number) => {
      nowMs += ms;
    },
  };
  const store = createCrossDevicePlaybackStore({ now: clock.now, tabId: 'tab-this' });
  store.reset({ accountId: 1, enabled: true });
  store.applyPresenceResponse(
    { session_id_text: 'session-this', devices: { revision: 1, devices: [] }, state: null },
    clock.now()
  );
  return { store, clock };
}

function applyState(store: ReturnType<typeof readyStore>['store'], data: DTOPlaybackState) {
  store.applyStreamEvent({ type: ACCOUNT_PLAYBACK_STREAM_EVENT.state, data }, 1_000_000);
}

describe('createCrossDevicePlaybackStore', () => {
  it('is idle and pending until the first check-in, then ready with this session', () => {
    const store = createCrossDevicePlaybackStore({ now: () => 1_000, tabId: 'tab-this' });
    store.reset({ accountId: 1, enabled: true });
    expect(store.getSnapshot().availability).toBe('pending');
    expect(store.getSnapshot().pendingSinceMs).toBe(1_000);

    store.applyPresenceResponse(
      { session_id_text: 'session-this', devices: { revision: 1, devices: [] }, state: state(1) },
      1_000
    );

    const snapshot = store.getSnapshot();
    expect(snapshot.availability).toBe('ready');
    expect(snapshot.thisSessionIdText).toBe('session-this');
    expect(snapshot.state?.revision).toBe(1);
    expect(snapshot.role).toBe('remote');
  });

  it('does not notify when a call changes nothing', () => {
    const { store } = readyStore();
    let notifications = 0;
    store.subscribe(() => {
      notifications += 1;
    });

    store.setStream({ open: false, isLeader: false });
    store.noteFocusedTab(null);
    expect(notifications).toBe(0);

    store.setStream({ open: true, isLeader: true });
    expect(notifications).toBe(1);
  });

  it('ignores an older playback.state event', () => {
    const { store } = readyStore();
    applyState(store, state(5));
    applyState(store, state(4, { status: 'paused' }));

    expect(store.getSnapshot().state?.revision).toBe(5);
    expect(store.getSnapshot().state?.status).toBe('playing');
  });

  it('replaces state from a snapshot even when its revision is lower', () => {
    const { store } = readyStore();
    applyState(store, state(5));
    store.applyStreamEvent(
      {
        type: ACCOUNT_PLAYBACK_STREAM_EVENT.snapshot,
        data: { devices: { revision: 1, devices: [] }, state: state(2) },
      },
      1_000_000
    );

    expect(store.getSnapshot().state?.revision).toBe(2);

    applyState(store, state(3));
    expect(store.getSnapshot().state?.revision).toBe(3);
  });

  it('ignores an event older than this tab’s own accepted publish', () => {
    const { store } = readyStore();
    store.applyOwnPublish(CLAIM_BODY, { revision: 9, active_session_id_text: 'session-this' });
    applyState(store, state(8));

    const snapshot = store.getSnapshot();
    expect(snapshot.state?.revision).toBe(9);
    expect(snapshot.state?.active_session_id_text).toBe('session-this');
    expect(snapshot.state?.position_seconds).toBe(30);
  });

  it('keeps a claim active while a newer event names another session, then turns remote', () => {
    const { store } = readyStore();
    store.beginClaim();
    applyState(store, state(5, { active_session_id_text: 'session-other' }));
    expect(store.getSnapshot().role).toBe('active');

    store.abandonClaim();
    expect(store.getSnapshot().role).toBe('remote');
  });

  it('releases this tab’s audio when another tab announces itself as the audio tab', () => {
    const { store, clock } = readyStore();
    store.beginClaim();
    store.applyOwnPublish(CLAIM_BODY, { revision: 3, active_session_id_text: 'session-this' });
    store.confirmClaim();
    expect(store.getSnapshot().role).toBe('active');
    expect(store.getSnapshot().audioTab?.tabId).toBe('tab-this');

    store.noteAudioTab('tab-other', clock.now());

    const snapshot = store.getSnapshot();
    expect(snapshot.thisTabHoldsAudio).toBe(false);
    expect(snapshot.audioTab?.tabId).toBe('tab-other');
    expect(snapshot.role).toBe('remote');
  });

  it('is remote in the active session until the audio-tab search settles, then idle with no audio tab', () => {
    const { store } = readyStore();
    applyState(store, state(5, { active_session_id_text: 'session-this' }));
    expect(store.getSnapshot().role).toBe('remote');

    store.settleAudioTabSearch();

    const snapshot = store.getSnapshot();
    expect(snapshot.audioTabSearchSettled).toBe(true);
    expect(snapshot.audioTab).toBeNull();
    expect(snapshot.role).toBe('idle');
  });

  it('turns remote when another tab announces audio after the search settles, and idle once it leaves', () => {
    const { store, clock } = readyStore();
    applyState(store, state(5, { active_session_id_text: 'session-this' }));
    store.settleAudioTabSearch();
    expect(store.getSnapshot().role).toBe('idle');

    store.noteAudioTab('tab-other', clock.now());
    expect(store.getSnapshot().role).toBe('remote');

    store.noteAudioTabGone('tab-other');
    expect(store.getSnapshot().audioTab).toBeNull();
    expect(store.getSnapshot().role).toBe('idle');
  });

  it('drops a silent audio tab of another tab only after the silence window and never its own', () => {
    const { store, clock } = readyStore();
    applyState(store, state(5, { active_session_id_text: 'session-this' }));
    store.settleAudioTabSearch();
    store.noteAudioTab('tab-other', clock.now());

    clock.advance(11_999);
    store.expireSilentAudioTab(clock.now(), 12_000);
    expect(store.getSnapshot().audioTab?.tabId).toBe('tab-other');
    expect(store.getSnapshot().role).toBe('remote');

    clock.advance(1);
    store.expireSilentAudioTab(clock.now(), 12_000);
    expect(store.getSnapshot().audioTab).toBeNull();
    expect(store.getSnapshot().role).toBe('idle');

    store.beginClaim();
    store.confirmClaim();
    clock.advance(60_000);
    store.expireSilentAudioTab(clock.now(), 12_000);
    expect(store.getSnapshot().audioTab?.tabId).toBe('tab-this');
    expect(store.getSnapshot().role).toBe('active');
  });

  it('clears the settled audio-tab search on reset', () => {
    const { store } = readyStore();
    store.settleAudioTabSearch();
    expect(store.getSnapshot().audioTabSearchSettled).toBe(true);

    store.reset({ accountId: 1, enabled: true });
    expect(store.getSnapshot().audioTabSearchSettled).toBe(false);
  });

  it('emits a command as a signal and leaves state alone', () => {
    const { store } = readyStore();
    applyState(store, state(5));
    const before = store.getSnapshot();
    const signals: CrossDevicePlaybackSignal[] = [];
    store.subscribeToSignals((signal) => signals.push(signal));

    const envelope: DTOPlaybackCommandEnvelope = {
      command_id: 'command-1',
      sender_session_id_text: 'session-other',
      target_session_id_text: 'session-this',
      issued_at_ms: 10_000,
      expires_at_ms: 15_000,
      command: { type: 'pause' },
      state: null,
    };
    store.applyStreamEvent({ type: ACCOUNT_PLAYBACK_STREAM_EVENT.command, data: envelope }, 42);

    expect(signals).toEqual([{ kind: 'command', envelope, receivedAtMs: 42 }]);
    expect(store.getSnapshot()).toBe(before);
  });

  it('shows an optimistic pause at once and drops it after the command lifetime', () => {
    const { store, clock } = readyStore();
    applyState(store, state(5, { status: 'playing', position_seconds: 100 }));

    store.setOptimisticPatch({ status: 'paused' });
    expect(store.getSnapshot().displayState?.status).toBe('paused');
    expect(store.getSnapshot().state?.status).toBe('playing');

    clock.advance(3_000);
    expect(store.getEstimatedPositionSeconds()).toBe(100);

    clock.advance(3_000);
    expect(store.getSnapshot().displayState?.status).toBe('playing');
  });

  it('clears a pending transfer once a state names its target', () => {
    const { store, clock } = readyStore();
    store.setPendingTransfer({
      commandIdText: 'command-1',
      targetSessionIdText: 'session-target',
      sentAtMs: clock.now(),
    });

    applyState(store, state(5, { active_session_id_text: 'session-elsewhere' }));
    expect(store.getSnapshot().pendingTransfer).not.toBeNull();

    applyState(store, state(6, { active_session_id_text: 'session-target' }));
    expect(store.getSnapshot().pendingTransfer).toBeNull();
  });

  it('allows local playback writes exactly when the role is not remote', () => {
    const { store } = readyStore();
    expect(store.getSnapshot().role).toBe('idle');
    expect(store.isLocalPlaybackWriteAllowed()).toBe(true);

    applyState(store, state(5, { active_session_id_text: 'session-other' }));
    expect(store.getSnapshot().role).toBe('remote');
    expect(store.isLocalPlaybackWriteAllowed()).toBe(false);

    store.beginClaim();
    expect(store.isLocalPlaybackWriteAllowed()).toBe(true);
  });

  it('reports a blocked local play only for NotAllowedError', () => {
    const { store } = readyStore();
    const signals: CrossDevicePlaybackSignal[] = [];
    store.subscribeToSignals((signal) => signals.push(signal));

    store.notifyLocalPlayRejected(new DOMException('Blocked', 'NotAllowedError'));
    store.notifyLocalPlayRejected(new DOMException('Aborted', 'AbortError'));

    expect(signals).toEqual([{ kind: 'local_play_blocked' }]);
  });
});

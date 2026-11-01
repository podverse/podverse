import { describe, expect, it } from 'vitest';

import type { PlaybackStatePublishBody, PlaybackStatePublishResponse } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { createCrossDevicePlaybackStore } from './crossDevicePlaybackStore';
import { publishPlaybackState, shouldClaimActiveDevice } from './playbackClaim';

const CLAIM_BODY: PlaybackStatePublishBody = {
  claim: true,
  resource: {
    ref: { kind: 'item', item_id_text: 'item-1' },
    medium: MediumEnum.Podcast,
    title: 'Episode Title',
    channel_title: 'Channel Title',
    image_url: null,
  },
  status: 'playing',
  is_live: false,
  position_seconds: 30,
  duration_seconds: 600,
  rate: 1,
};

function requestError(status: number, data: unknown) {
  return { response: { status, data } };
}

/** A store whose tab has checked in as `session-this` and holds a claim in flight. */
function claimingStore() {
  const store = createCrossDevicePlaybackStore({ now: () => 1_000_000, tabId: 'tab-this' });
  store.reset({ accountId: 1, enabled: true });
  store.applyPresenceResponse(
    { session_id_text: 'session-this', devices: { revision: 1, devices: [] }, state: null },
    1_000_000
  );
  store.beginClaim();
  return store;
}

describe('shouldClaimActiveDevice', () => {
  const readyToClaim = {
    canPublish: true,
    wantsToPlay: true,
    mediaElementPlaying: true,
    claimBlocked: false,
    thisTabHoldsAudio: false,
    activeSessionIsNull: false,
    needsReclaim: false,
  };

  it('claims when this tab is allowed to publish and a media element is playing', () => {
    expect(shouldClaimActiveDevice(readyToClaim)).toBe(true);
  });

  it('does not claim from the intent to play before a media element has started', () => {
    expect(shouldClaimActiveDevice({ ...readyToClaim, mediaElementPlaying: false })).toBe(false);
  });
});

describe('publishPlaybackState', () => {
  it('keeps the published state and confirms the claim on success', async () => {
    const store = claimingStore();
    const response: PlaybackStatePublishResponse = {
      revision: 7,
      active_session_id_text: 'session-this',
    };

    const outcome = await publishPlaybackState({
      store,
      body: CLAIM_BODY,
      publish: () => Promise.resolve(response),
    });

    const snapshot = store.getSnapshot();
    expect(outcome).toEqual({ kind: 'published' });
    expect(snapshot.state?.revision).toBe(7);
    expect(snapshot.state?.position_seconds).toBe(30);
    expect(snapshot.thisTabHoldsAudio).toBe(true);
    expect(snapshot.claimPending).toBe(false);
    expect(snapshot.role).toBe('active');
  });

  it('keeps the state but does not take the audio when another tab won the claim in flight', async () => {
    const store = claimingStore();
    const response: PlaybackStatePublishResponse = {
      revision: 7,
      active_session_id_text: 'session-this',
    };

    const outcome = await publishPlaybackState({
      store,
      body: CLAIM_BODY,
      publish: () => {
        store.noteAudioTab('tab-other', 1_000_000);
        return Promise.resolve(response);
      },
    });

    const snapshot = store.getSnapshot();
    expect(outcome).toEqual({ kind: 'published' });
    expect(snapshot.state?.revision).toBe(7);
    expect(snapshot.thisTabHoldsAudio).toBe(false);
    expect(snapshot.audioTab?.tabId).toBe('tab-other');
    expect(snapshot.role).toBe('remote');
  });

  it('releases audio when the server names another active device', async () => {
    const store = claimingStore();

    const outcome = await publishPlaybackState({
      store,
      body: CLAIM_BODY,
      publish: () =>
        Promise.reject(
          requestError(409, {
            code: 'playback_not_active_device',
            active_session_id_text: 'session-other',
          })
        ),
    });

    expect(outcome).toEqual({ kind: 'lost' });
    expect(store.getSnapshot().claimPending).toBe(false);
    expect(store.getSnapshot().thisTabHoldsAudio).toBe(false);
  });

  it('reports a lapse when the server names no active device', async () => {
    const store = claimingStore();

    const outcome = await publishPlaybackState({
      store,
      body: { ...CLAIM_BODY, claim: false },
      publish: () =>
        Promise.reject(
          requestError(409, { code: 'playback_not_active_device', active_session_id_text: null })
        ),
    });

    expect(outcome).toEqual({ kind: 'lapsed' });
    expect(store.getSnapshot().claimPending).toBe(true);
  });

  it('marks availability unavailable on a membership 403', async () => {
    const store = claimingStore();

    const outcome = await publishPlaybackState({
      store,
      body: CLAIM_BODY,
      publish: () =>
        Promise.reject(
          requestError(403, {
            code: 'membership_expired',
            i18nKey: 'membership.membership_expired',
          })
        ),
    });

    expect(outcome).toEqual({ kind: 'unavailable' });
    expect(store.getSnapshot().availability).toBe('unavailable');
  });

  it('asks for a retry on a 503', async () => {
    const store = claimingStore();

    const outcome = await publishPlaybackState({
      store,
      body: CLAIM_BODY,
      publish: () => Promise.reject(requestError(503, { code: 'playback_unavailable' })),
    });

    expect(outcome).toEqual({ kind: 'retry' });
    expect(store.getSnapshot().claimPending).toBe(true);
  });
});
